import { requireConnection } from "@/lib/auth";
import { clio } from "@/lib/clio";
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
    if (!document || !/^[1-9]\d{0,18}$/.test(id)) return json({ error: "Document not found in the imported case." }, 404);
    const response = await clio(conn).response(`documents/${id}/download.json`);
    const location = response.headers.get("location");
    if (response.status !== 303 || !location) return json({ error: "Clio did not provide a document download link." }, 502);
    const download = new URL(location);
    if (download.protocol !== "https:" || download.username || download.password) return json({ error: "Clio returned an invalid download URL." }, 502);
    // Pass only the signed URL to the browser; never forward the Clio bearer token.
    // This endpoint remains firm-only. Provider sharing will use separate approved assets.
    return new Response(null, { status: 303, headers: { Location: download.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Document-Name": encodeURIComponent(text(document, "name")) } });
  } catch (error) { return failure(error); }
}
