import { requireConnection } from "@/lib/auth";
import { aiConfigured, cachedAiBrief, generateAiBrief } from "@/lib/ai";
import { failure, json } from "@/lib/http";
import { snapshotKey } from "@/lib/ingestion";
import { load } from "@/lib/store";
import type { Snapshot } from "@/lib/types";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

async function context(request?: Request) {
  const conn = await requireConnection(request);
  return { conn, snapshot: load<Snapshot>(snapshotKey(conn)) };
}

export async function GET() {
  try {
    const { conn, snapshot } = await context();
    if (!aiConfigured()) return json({ configured: false, brief: null });
    return json({ configured: true, brief: snapshot ? cachedAiBrief(conn, snapshot) : null });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  try {
    const { conn, snapshot } = await context(request);
    if (!aiConfigured()) return json({ error: "Add GOOGLE_GENERATIVE_AI_API_KEY to enable the AI briefing." }, 400);
    if (!snapshot) return json({ error: "Import a matter first." }, 400);
    return json({ configured: true, brief: cachedAiBrief(conn, snapshot) ?? await generateAiBrief(conn, snapshot) });
  } catch (error) {
    if (error instanceof Error && error.name.startsWith("AI_")) return json({ error: `The AI briefing failed: ${error.message.slice(0, 200)}` }, 502);
    return failure(error);
  }
}
