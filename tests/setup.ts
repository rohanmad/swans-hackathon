import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.CASEBRIEF_DATA_DIR = mkdtempSync(join(tmpdir(), "casebrief-test-"));
process.env.CASEBRIEF_REQUEST_INTERVAL_MS = "0";
process.env.CLIO_CLIENT_ID = "test-client";
process.env.CLIO_CLIENT_SECRET = "test-secret";
process.env.CLIO_BASE_URL = "https://app.clio.com";
process.env.CLIO_REDIRECT_URI = "http://127.0.0.1:3000/api/clio/callback";

export const ORIGIN = "https://app.clio.com";

export function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}
