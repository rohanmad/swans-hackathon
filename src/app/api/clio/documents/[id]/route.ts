import { requireConnection } from "@/lib/auth";
import { documentRedirect } from "@/lib/documents";
import { failure, json } from "@/lib/http";
import { snapshotKey } from "@/lib/ingestion";
import { load } from "@/lib/store";
import { text, type Snapshot } from "@/lib/types";
export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const conn = await requireConnection();
    const { id } = await context.params;
    const snapshot = load<Snapshot>(snapshotKey(conn));
    const document = snapshot?.collections.documents.records.find(record => String(record.id) === id);
    if (!document) return json({ error: "Document not found in the imported case." }, 404);
    return await documentRedirect(conn, id, text(document, "name"));
  } catch (error) { return failure(error); }
}
