import "server-only";
import type { Connection } from "./auth";
import { clio } from "./clio";
import { json } from "./http";

export async function documentRedirect(conn: Connection, id: string, name: string) {
  if (!/^[1-9]\d{0,18}$/.test(id)) return json({ error: "Document not found." }, 404);
  const response = await clio(conn).response(`documents/${id}/download.json`);
  const location = response.headers.get("location");
  if (response.status !== 303 || !location) return json({ error: "Clio did not provide a document download link." }, 502);
  const download = new URL(location);
  if (download.protocol !== "https:" || download.username || download.password) return json({ error: "Clio returned an invalid download URL." }, 502);
  // Pass only the signed URL to the browser; never forward the Clio bearer token.
  return new Response(null, { status: 303, headers: { Location: download.href, "Cache-Control": "no-store", "Referrer-Policy": "no-referrer", "X-Document-Name": encodeURIComponent(name) } });
}
