import { after } from "next/server";
import { requireConnection } from "@/lib/auth";
import { importMatter, startJob } from "@/lib/ingestion";
import { failure, json } from "@/lib/http";
export const runtime = "nodejs";
export const maxDuration = 600;
export async function POST(request: Request) {
  try {
    const conn = await requireConnection(request);
    let body: { matterId?: unknown };
    try { body = await request.json(); } catch { return json({ error: "Expected a JSON matterId." }, 400); }
    const id = String(body.matterId ?? "");
    if (!/^[1-9]\d{0,18}$/.test(id)) return json({ error: "Select a valid Clio matter." }, 400);
    const job = startJob(conn);
    after(() => importMatter(conn, id));
    return json({ job }, 202);
  } catch (error) { return failure(error); }
}
