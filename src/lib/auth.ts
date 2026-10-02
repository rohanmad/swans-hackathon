import "server-only";
import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "node:crypto";
import { getConfig } from "./config";
import { decrypt, encrypt, load, save, take } from "./store";
import { equalSecret, hash, sameOrigin } from "./security";
import { HttpError } from "./errors";
export { HttpError } from "./errors";

export const SESSION_COOKIE = "casebrief_session";
export const STATE_COOKIE = "casebrief_oauth_state";
export type Connection = { id: string; baseUrl: string; userName: string; encryptedTokens: string; connectedAt: string };
export type Tokens = { access_token: string; refresh_token: string; expiresAt: number };
type Session = { connectionId: string; expiresAt: number };
export function connection() { return load<Connection>("connection"); }
export function saveTokens(conn: Connection, tokens: Tokens) {
  const current = connection();
  if (current?.id !== conn.id) throw new HttpError("Connection changed. Please try again.", 409);
  save("connection", { ...current, encryptedTokens: encrypt(tokens) });
}
export function getTokens(conn: Connection) { return decrypt<Tokens>(conn.encryptedTokens); }
export function createConnection(baseUrl: string, userName: string, tokens: Tokens) {
  const conn: Connection = { id: randomUUID(), baseUrl, userName, encryptedTokens: encrypt(tokens), connectedAt: new Date().toISOString() };
  save("connection", conn);
  return conn;
}
export function beginOAuth() {
  const state = randomBytes(32).toString("hex");
  save("oauth:" + hash(state), { expiresAt: Date.now() + 600_000 });
  return state;
}
export function consumeOAuth(state: string | null, cookie: string | undefined) {
  if (!state || !cookie || !equalSecret(state, cookie)) throw new HttpError("The connection request expired or its state did not match. Start Connect Clio again.", 400);
  const pending = take<{ expiresAt: number }>("oauth:" + hash(state));
  if (!pending || pending.expiresAt < Date.now()) throw new HttpError("This connection request has expired or was already used. Start again.", 400);
}
export function createSession(conn: Connection) {
  const token = randomBytes(32).toString("hex");
  save("session:" + hash(token), { connectionId: conn.id, expiresAt: Date.now() + 7 * 86400_000 } satisfies Session);
  return token;
}
export async function authorizedConnection(): Promise<Connection | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = load<Session>("session:" + hash(token));
  const conn = connection();
  if (!session || session.expiresAt < Date.now() || conn?.id !== session.connectionId) return null;
  if (conn.baseUrl !== getConfig().baseUrl) return null;
  return conn;
}
export async function requireConnection(request?: Request) {
  if (request && !sameOrigin(request, getConfig().appOrigin)) throw new HttpError("Request origin does not match the application URL. Open the app at its configured address.", 403);
  const conn = await authorizedConnection();
  if (!conn) throw new HttpError("Connect Clio to access the firm workspace.", 401);
  return conn;
}
export function cookieOptions(maxAge: number) {
  return { httpOnly: true, secure: getConfig().secureCookies, sameSite: "lax" as const, path: "/", maxAge };
}
