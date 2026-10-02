import "server-only";
import { ClioClient, exchangeToken } from "./clio-client";
import { connection, getTokens, saveTokens, type Connection, HttpError } from "./auth";
import { requireConfig } from "./config";

const clients = new Map<string, ClioClient>();
const refreshes = new Map<string, Promise<string>>();
async function accessToken(conn: Connection): Promise<string> {
  const current = connection();
  if (current?.id !== conn.id) throw new HttpError("Connection changed. Reload the workspace.", 409);
  const tokens = getTokens(current);
  if (tokens.expiresAt > Date.now() + 60_000) return tokens.access_token;
  if (!tokens.refresh_token) throw new HttpError("Reconnect Clio to renew access.", 401);
  const existing = refreshes.get(conn.id);
  if (existing) return existing;
  const refresh = exchangeToken({ ...requireConfig(), baseUrl: conn.baseUrl }, { grant_type: "refresh_token", refresh_token: tokens.refresh_token }).then(next => {
    saveTokens(conn, next);
    return next.access_token;
  }).finally(() => refreshes.delete(conn.id));
  refreshes.set(conn.id, refresh);
  return refresh;
}
export function clio(conn: Connection) {
  let client = clients.get(conn.id);
  if (!client) {
    clients.clear();
    client = new ClioClient(conn.baseUrl, () => accessToken(conn));
    clients.set(conn.id, client);
  }
  return client;
}
