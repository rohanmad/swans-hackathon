import { ORIGIN } from "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { createConnection } from "../src/lib/auth";
import { HttpError } from "../src/lib/errors";
import { snapshotKey } from "../src/lib/ingestion";
import { buildProviderView, createShare, listShares, openShare, parseShareRequest, revokeShare } from "../src/lib/shares";
import { save } from "../src/lib/store";
import { NOW, fixture } from "./fixture";

const base = { providerId: "2", status: true, coverage: false, charges: false, documents: [], requests: [], appointments: [] };

test("provider view contains only what was selected for that provider", () => {
  const view = buildProviderView(fixture(), parseShareRequest({ ...base, documents: ["60"], requests: ["30", "31"], appointments: ["40"], coverage: true, coverageText: "Coverage confirmed." }), NOW);
  assert.equal(view.providerName, "Northside Physical Therapy");
  assert.deepEqual(view.documents?.map(d => d.id), ["60"]);
  assert.deepEqual(view.requests?.map(r => r.title), ["By medical provider: Northside Physical Therapy - Updated bill"], "another party's task cannot be shared to this provider");
  assert.equal(view.appointments?.length, 1);
  assert.equal(view.coverage, "Coverage confirmed.");
  assert.equal(view.charges, undefined);
  const serialized = JSON.stringify(view);
  for (const secret of ["Privileged", "settle low", "Policy Limits", "90000", "Medicare"]) assert.ok(!serialized.includes(secret), `leaks ${secret}`);
});

test("unknown providers and documents outside the case are refused", () => {
  assert.throws(() => buildProviderView(fixture(), parseShareRequest({ ...base, providerId: "3" }), NOW), (e: unknown) => e instanceof HttpError && e.status === 400);
  assert.equal(buildProviderView(fixture(), parseShareRequest({ ...base, documents: ["999"] }), NOW).documents, undefined);
  assert.throws(() => parseShareRequest({ providerId: "../x" }), (e: unknown) => e instanceof HttpError && e.status === 400);
});

test("share links track views and stop working once revoked", () => {
  const conn = createConnection(ORIGIN, "Firm", { access_token: "a", refresh_token: "r", expiresAt: Date.now() + 3600_000 });
  assert.throws(() => createShare(conn, base), /Import the case/);
  save(snapshotKey(conn), fixture());
  const { share, token } = createShare(conn, base);
  assert.ok(!JSON.stringify(listShares(conn)).includes(token), "token is not stored in plaintext");

  assert.equal(openShare(token)?.share.views, 0);
  openShare(token, true);
  openShare(token, true);
  assert.equal(listShares(conn)[0].views, 2);
  assert.equal(openShare("wrong-token-wrong-token-wrong"), null);

  revokeShare(conn, share.id);
  assert.equal(openShare(token), null);
});
