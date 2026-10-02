import { requireConnection } from "@/lib/auth";
import { failure, json } from "@/lib/http";
import { revokeShare } from "@/lib/shares";
export const runtime = "nodejs";
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const conn = await requireConnection(request);
    return json({ share: revokeShare(conn, (await context.params).id) });
  } catch (error) { return failure(error); }
}
