import { ORIGIN, jsonResponse } from "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { connection, createConnection, getTokens } from "../src/lib/auth";
import { getJob, importMatter, snapshotKey, startJob } from "../src/lib/ingestion";
import { load } from "../src/lib/store";
import type { Snapshot } from "../src/lib/types";

type Route = (url: URL, init: RequestInit) => Response | undefined;
const requests: { method: string; url: URL }[] = [];
function stubFetch(route: Route) {
  requests.length = 0;
  globalThis.fetch = (async (input: string | URL | Request, init: RequestInit = {}) => {
    const url = new URL(String(input));
    requests.push({ method: init.method ?? "GET", url });
    return route(url, init) ?? jsonResponse({ data: [] });
  }) as typeof fetch;
}
const matter = (url: URL) => url.pathname === "/api/v4/matters/7.json" ? jsonResponse({ data: { id: 7, display_number: "00007" } }) : undefined;
const fresh = () => ({ access_token: "live", refresh_token: "refresh-1", expiresAt: Date.now() + 3600_000 });

test("a failed collection produces a partial snapshot and keeps the others", async () => {
  const conn = createConnection(ORIGIN, "Firm", fresh());
  stubFetch(url => matter(url)
    ?? (url.pathname === "/api/v4/activities.json" ? jsonResponse({}, 403) : undefined)
    ?? (url.pathname === "/api/v4/notes.json" ? jsonResponse({ data: [{ id: 1, subject: "Intake" }] }) : undefined));
  startJob(conn);
  await importMatter(conn, "7");

  const snapshot = load<Snapshot>(snapshotKey(conn))!;
  assert.equal(snapshot.status, "partial");
  assert.equal(snapshot.collections.activities.status, "failed");
  assert.match(snapshot.collections.activities.error ?? "", /permissions/);
  assert.equal(snapshot.collections.notes.records.length, 1);
  assert.equal(snapshot.collections.tasks.status, "complete");
  assert.equal(getJob(conn)?.state, "partial");
  assert.ok(requests.every(r => r.method === "GET"), "import never writes to Clio");
  const notes = requests.find(r => r.url.pathname === "/api/v4/notes.json")!;
  assert.equal(notes.url.searchParams.get("matter_id"), "7");
  assert.ok(requests.some(r => r.url.pathname === "/api/v4/matters/7/contacts.json"));
});

test("a failed import preserves the previous snapshot", async () => {
  const conn = createConnection(ORIGIN, "Firm", fresh());
  stubFetch(url => matter(url));
  startJob(conn);
  await importMatter(conn, "7");
  const before = load<Snapshot>(snapshotKey(conn))!;
  assert.equal(before.status, "complete");

  stubFetch(() => jsonResponse({}, 401));
  startJob(conn);
  await importMatter(conn, "7");
  assert.equal(getJob(conn)?.state, "failed");
  assert.deepEqual(load<Snapshot>(snapshotKey(conn)), before);
});

test("a revoked token mid-import aborts instead of saving a partial case", async () => {
  const conn = createConnection(ORIGIN, "Firm", fresh());
  stubFetch(url => matter(url) ?? (url.pathname === "/api/v4/notes.json" ? jsonResponse({}, 401) : undefined));
  startJob(conn);
  await importMatter(conn, "7");
  assert.equal(getJob(conn)?.state, "failed");
  assert.equal(load(snapshotKey(conn)), null);
  assert.ok(!requests.some(r => r.url.pathname === "/api/v4/tasks.json"), "stops after the 401");
});

test("an expiring token is refreshed once and persisted encrypted", async () => {
  const conn = createConnection(ORIGIN, "Firm", { access_token: "old", refresh_token: "refresh-1", expiresAt: Date.now() + 1000 });
  let refreshes = 0;
  stubFetch((url, init) => {
    if (url.pathname === "/oauth/token") {
      refreshes++;
      const body = new URLSearchParams(String(init.body));
      assert.equal(body.get("grant_type"), "refresh_token");
      assert.equal(body.get("refresh_token"), "refresh-1");
      return jsonResponse({ access_token: "new", expires_in: 3600 });
    }
    assert.equal((init.headers as Record<string, string>).Authorization, "Bearer new");
    return matter(url);
  });
  startJob(conn);
  await importMatter(conn, "7");

  assert.equal(refreshes, 1);
  const stored = connection()!;
  assert.ok(!Buffer.from(stored.encryptedTokens, "base64").toString().includes("access_token"));
  const tokens = getTokens(stored);
  assert.equal(tokens.access_token, "new");
  assert.equal(tokens.refresh_token, "refresh-1", "keeps the refresh token when Clio omits a new one");
  assert.equal(getJob(conn)?.state, "complete");
});

test("a second import cannot start while one is running", () => {
  const conn = createConnection(ORIGIN, "Firm", fresh());
  startJob(conn);
  assert.throws(() => startJob(conn), /already running/);
});
