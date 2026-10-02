import { createHash, timingSafeEqual } from "node:crypto";
export function hash(value: string) { return createHash("sha256").update(value).digest("hex"); }
export function equalSecret(a: string, b: string) {
  const left = Buffer.from(a), right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}
export function sameOrigin(request: Request, origin: string) {
  return request.headers.get("origin") === origin;
}
