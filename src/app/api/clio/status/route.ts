import { authorizedConnection, connection } from "@/lib/auth";
import { getConfig } from "@/lib/config";
import { buildDigest } from "@/lib/digest";
import { getJob, snapshotKey } from "@/lib/ingestion";
import { json } from "@/lib/http";
import { load } from "@/lib/store";
import type { AppStatus, Snapshot } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const config = getConfig();
    const conn = await authorizedConnection();
    const snapshot = conn ? load<Snapshot>(snapshotKey(conn)) : null;
    return json({ configured: config.configured, configError: null, redirectUri: config.redirectUri, connected: Boolean(conn), hasSavedConnection: Boolean(connection()), userName: conn?.userName || null, snapshot, digest: snapshot ? buildDigest(snapshot) : null, job: conn ? getJob(conn) : null } satisfies AppStatus);
  } catch {
    return json({ configured: false, configError: "Check CLIO_BASE_URL and CLIO_REDIRECT_URI in .env.local.", redirectUri: "http://127.0.0.1:3000/api/clio/callback", connected: false, hasSavedConnection: false, userName: null, snapshot: null, digest: null, job: null } satisfies AppStatus);
  }
}
