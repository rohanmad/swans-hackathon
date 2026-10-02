import { requireConnection } from "@/lib/auth";
import { failure, json } from "@/lib/http";
import { createShare, listShares } from "@/lib/shares";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return json({ data: listShares(await requireConnection()) }); }
  catch (error) { return failure(error); }
}
export async function POST(request: Request) {
  try {
    const conn = await requireConnection(request);
    let body: unknown;
    try { body = await request.json(); } catch { return json({ error: "Expected a JSON share request." }, 400); }
    const { share, token } = createShare(conn, body);
    return json({ share, path: `/share/${token}` }, 201);
  } catch (error) { return failure(error); }
}
