import { createHash, timingSafeEqual } from "node:crypto";
export function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function equalSecret(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function sameOrigin(request: Request, origin: string) {
  return request.headers.get("origin") === origin;
}
// Next.js normalizes request.url to "localhost" in development, so the browser-facing origin comes from the Host header.
export function requestOrigin(request: Request) {
  const url = new URL(request.url);
  const host = request.headers.get("host");
  return host ? `${url.protocol}//${host}` : url.origin;
}
