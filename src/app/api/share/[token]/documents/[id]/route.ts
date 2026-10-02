import { connection } from "@/lib/auth";
import { documentRedirect } from "@/lib/documents";
import { failure, json } from "@/lib/http";
import { openShare } from "@/lib/shares";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ token: string; id: string }> }) {
  try {
    const { token, id } = await context.params;
    const opened = openShare(token);
    const document = opened?.share.content.documents?.find(d => d.id === id);
    if (!opened || !document) return json({ error: "This document is not part of the shared update." }, 404);
    const conn = connection();
    if (!conn || conn.id !== opened.connectionId) return json({ error: "The firm's Clio connection is unavailable. Contact the firm." }, 503);
    return await documentRedirect(conn, id, document.name);
  } catch (error) { return failure(error); }
}
