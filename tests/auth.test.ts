import "./setup";
import { test } from "node:test";
import assert from "node:assert/strict";
import { beginOAuth, consumeOAuth, createConnection, createSession, sessionConnection } from "../src/lib/auth";
import { HttpError } from "../src/lib/errors";
import { requestOrigin, sameOrigin } from "../src/lib/security";
import { save, load } from "../src/lib/store";
import { hash } from "../src/lib/security";

const tokens = { access_token: "a", refresh_token: "r", expiresAt: Date.now() + 3600_000 };
const rejects400 = (fn: () => void) => assert.throws(fn, (e: unknown) => e instanceof HttpError && e.status === 400);

test("OAuth state is accepted once when the cookie matches", () => {
  const state = beginOAuth();
  consumeOAuth(state, state);
  rejects400(() => consumeOAuth(state, state));
});

test("OAuth state is rejected when missing or mismatched with the cookie", () => {
  const state = beginOAuth();
  rejects400(() => consumeOAuth(null, state));
  rejects400(() => consumeOAuth(state, undefined));
  rejects400(() => consumeOAuth(state, state.slice(0, -1) + (state.endsWith("0") ? "1" : "0")));
  consumeOAuth(state, state);
});

test("expired OAuth state is rejected and consumed", () => {
  const state = beginOAuth();
  save("oauth:" + hash(state), { expiresAt: Date.now() - 1 });
  rejects400(() => consumeOAuth(state, state));
  assert.equal(load("oauth:" + hash(state)), null);
});

test("sessions resolve only for the current, unexpired connection", () => {
  assert.equal(sessionConnection(undefined), null);
  assert.equal(sessionConnection("not-a-session"), null);

  const first = createConnection("https://app.clio.com", "Firm", tokens);
  const token = createSession(first);
  assert.equal(sessionConnection(token)?.id, first.id);

  save("session:" + hash(token), { connectionId: first.id, expiresAt: Date.now() - 1 });
  assert.equal(sessionConnection(token), null);

  const live = createSession(first);
  createConnection("https://app.clio.com", "Firm", tokens);
  assert.equal(sessionConnection(live), null, "reconnecting invalidates previous sessions");
});

test("POST origin must match the configured application origin", () => {
  const request = (origin?: string) => new Request("http://localhost:3000/api/clio/sync", { method: "POST", headers: origin ? { origin } : {} });
  assert.equal(sameOrigin(request("http://127.0.0.1:3000"), "http://127.0.0.1:3000"), true);
  assert.equal(sameOrigin(request("http://evil.example"), "http://127.0.0.1:3000"), false);
  assert.equal(sameOrigin(request(), "http://127.0.0.1:3000"), false);
});

test("request origin uses the Host header rather than the normalized URL", () => {
  const request = new Request("http://localhost:3000/api/clio/callback", { headers: { host: "127.0.0.1:3000" } });
  assert.equal(requestOrigin(request), "http://127.0.0.1:3000");
});
