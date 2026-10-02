import { requireConnection } from "@/lib/auth";
import { listMatters } from "@/lib/ingestion";
import { failure, json } from "@/lib/http";
export const runtime = "nodejs";
export async function GET() {
  try { return json({ data: await listMatters(await requireConnection()) }); }
  catch (error) { return failure(error); }
}
