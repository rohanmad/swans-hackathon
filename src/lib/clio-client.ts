import { HttpError } from "./errors";
import type { Tokens } from "./auth";
import type { ClioRecord } from "./types";

type Fetcher = typeof fetch;
type ApiResult = { data: unknown; meta?: { paging?: { next?: string } } };
const origins = new Set(["https://app.clio.com", "https://eu.app.clio.com", "https://ca.app.clio.com", "https://au.app.clio.com"]);
export function safeApiUrl(input: string, origin: string) {
  const url = new URL(input, origin + "/api/v4/");
  if (!origins.has(origin) || url.origin !== origin || !url.pathname.startsWith("/api/v4/") || url.username || url.password || url.hash) throw new HttpError("Clio returned an unsafe API URL.", 502);
  return url;
}
export function records(data: unknown): ClioRecord[] {
  if (!Array.isArray(data) || data.some(r => !r || typeof r !== "object" || !(typeof r.id === "number" || typeof r.id === "string"))) throw new HttpError("Clio returned an unexpected record format.", 502);
  return data as ClioRecord[];
}
export class ClioClient {
  private nextRequestAt = 0;
  constructor(private origin: string, private token: () => Promise<string>, private fetcher: Fetcher = fetch, private delayMs = 1300) {}
  async response(input: string) {
    const url = safeApiUrl(input, this.origin);
    for (let attempt = 0; attempt < 3; attempt++) {
      const wait = this.nextRequestAt - Date.now();
      if (wait > 0) await new Promise(resolve => setTimeout(resolve, wait));
      this.nextRequestAt = Date.now() + this.delayMs;
      const response = await this.fetcher(url, { method: "GET", redirect: "manual", headers: { Authorization: `Bearer ${await this.token()}`, Accept: "application/json" }, cache: "no-store", signal: AbortSignal.timeout(30_000) });
      if (response.status === 429 && attempt < 2) {
        const retry = Number(response.headers.get("retry-after"));
        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000 - Date.now();
        const delay = Number.isFinite(retry) && retry > 0 ? retry * 1000 : Math.max(1000, reset || 5000);
        this.nextRequestAt = Date.now() + Math.min(delay, 60_000);
        continue;
      }
      if (response.status === 401) throw new HttpError("Clio authorization has expired or was revoked. Reconnect Clio.", 401);
      if (response.status === 403) throw new HttpError("Clio denied access. Check the application's read permissions and your Clio user role, then reconnect.", 403);
      if (response.status === 429) throw new HttpError("Clio is rate limiting requests. Wait a minute and retry.", 429);
      if (!response.ok && response.status !== 303) throw new HttpError(`Clio request failed (${response.status}) at ${url.pathname}. Check permissions and requested fields.`, 502);
      if (response.headers.get("x-ratelimit-remaining") === "0") {
        const reset = Number(response.headers.get("x-ratelimit-reset")) * 1000;
        if (reset > Date.now()) this.nextRequestAt = Math.max(this.nextRequestAt, reset);
      }
      return response;
    }
    throw new HttpError("Clio request could not be completed.", 502);
  }
  async get(path: string, params: Record<string, string> = {}) {
    const url = safeApiUrl(path, this.origin);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
    const response = await this.response(url.href);
    if (response.status === 303) throw new HttpError("Unexpected Clio redirect.", 502);
    return await response.json() as ApiResult;
  }
  async all(path: string, params: Record<string, string> = {}, progress?: (count: number) => void) {
    const url = safeApiUrl(path, this.origin);
    for (const [key, value] of Object.entries({ ...params, order: "id(asc)", limit: "200" })) url.searchParams.set(key, value);
    let next: string | undefined = url.href;
    const seen = new Set<string>();
    const result: ClioRecord[] = [];
    while (next) {
      const current = safeApiUrl(next, this.origin).href;
      if (seen.has(current) || seen.size >= 1000) throw new HttpError("Clio pagination did not terminate safely.", 502);
      seen.add(current);
      const page = await this.get(current);
      result.push(...records(page.data));
      progress?.(result.length);
      next = page.meta?.paging?.next;
    }
    return result;
  }
}
export async function exchangeToken(config: { baseUrl: string; clientId: string; clientSecret: string }, params: Record<string, string>, fetcher: Fetcher = fetch): Promise<Tokens> {
  const response = await fetcher(config.baseUrl + "/oauth/token", { method: "POST", redirect: "error", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: config.clientId, client_secret: config.clientSecret, ...params }), cache: "no-store", signal: AbortSignal.timeout(30_000) });
  if (!response.ok) throw new HttpError(`Clio token exchange failed (${response.status}). Check credentials and the exact redirect URI, then reconnect.`, 401);
  const body = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number };
  if (!body.access_token || !Number.isFinite(body.expires_in) || Number(body.expires_in) <= 0) throw new HttpError("Clio returned an invalid token response.", 502);
  return { access_token: body.access_token, refresh_token: body.refresh_token || params.refresh_token || "", expiresAt: Date.now() + Number(body.expires_in) * 1000 };
}
