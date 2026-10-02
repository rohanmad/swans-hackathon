import { ORIGIN, jsonResponse } from "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { ClioClient, safeApiUrl } from "../src/lib/clio-client";
import { HttpError } from "../src/lib/errors";

type Call = { url: string; init: RequestInit };
function client(responses: (url: URL) => Response) {
  const calls: Call[] = [];
  const fetcher = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({ url: String(input), init: init ?? {} });
    return responses(new URL(String(input)));
  }) as typeof fetch;
  return { calls, api: new ClioClient(ORIGIN, async () => "token-1", fetcher, 0) };
}
const failsWith = (status: number) => (e: unknown) => e instanceof HttpError && e.status === status;

test("all() follows pagination and sends read-only authorized GETs", async () => {
  const { calls, api } = client(url => url.searchParams.get("page_token") === "2"
    ? jsonResponse({ data: [{ id: 3 }] })
    : jsonResponse({ data: [{ id: 1 }, { id: 2 }], meta: { paging: { next: `${ORIGIN}/api/v4/notes.json?page_token=2` } } }));
  const progress: number[] = [];
  const records = await api.all("notes.json", { matter_id: "7" }, n => progress.push(n));
  assert.deepEqual(records.map(r => r.id), [1, 2, 3]);
  assert.deepEqual(progress, [2, 3]);
  const first = new URL(calls[0].url);
  assert.equal(first.searchParams.get("matter_id"), "7");
  assert.equal(first.searchParams.get("limit"), "200");
  for (const call of calls) {
    assert.equal(call.init.method, "GET");
    assert.equal((call.init.headers as Record<string, string>).Authorization, "Bearer token-1");
  }
});

test("pagination to another origin or outside the API is rejected", async () => {
  for (const next of ["https://evil.example/api/v4/notes.json", `${ORIGIN}/oauth/token`, "https://eu.app.clio.com/api/v4/notes.json"]) {
    const { calls, api } = client(() => jsonResponse({ data: [{ id: 1 }], meta: { paging: { next } } }));
    await assert.rejects(api.all("notes.json"), failsWith(502));
    assert.equal(calls.length, 1, `did not request ${next}`);
  }
  assert.throws(() => safeApiUrl("https://user:pw@app.clio.com/api/v4/x", ORIGIN), failsWith(502));
});

test("pagination that repeats a page is stopped", async () => {
  const { api } = client(() => jsonResponse({ data: [{ id: 1 }], meta: { paging: { next: `${ORIGIN}/api/v4/notes.json?page_token=same` } } }));
  await assert.rejects(api.all("notes.json"), failsWith(502));
});

test("malformed records are rejected", async () => {
  const { api } = client(() => jsonResponse({ data: [{ name: "no id" }] }));
  await assert.rejects(api.all("notes.json"), failsWith(502));
});

test("429 is retried after Retry-After, and auth errors are mapped", async () => {
  let attempts = 0;
  const { api } = client(() => ++attempts === 1 ? jsonResponse({}, 429, { "retry-after": "1" }) : jsonResponse({ data: { id: 9 } }));
  assert.deepEqual((await api.get("matters/9.json")).data, { id: 9 });
  assert.equal(attempts, 2);

  await assert.rejects(client(() => jsonResponse({}, 401)).api.get("x.json"), failsWith(401));
  await assert.rejects(client(() => jsonResponse({}, 403)).api.get("x.json"), failsWith(403));
});
