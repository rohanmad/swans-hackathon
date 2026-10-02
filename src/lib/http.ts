import { NextResponse } from "next/server";
import { HttpError } from "./errors";
export function json(value: unknown, status = 200) {
  return NextResponse.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export function failure(error: unknown) {
  if (error instanceof HttpError) return json({ error: error.message }, error.status);
  if (error instanceof DOMException && error.name === "TimeoutError") return json({ error: "Clio took too long to respond. Please retry." }, 504);
  return json({ error: "The request could not be completed. Check configuration and try again." }, 500);
}
