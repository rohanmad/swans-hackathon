import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { consumeOAuth, cookieOptions, createConnection, createSession, SESSION_COOKIE, STATE_COOKIE } from "@/lib/auth";
import { exchangeToken } from "@/lib/clio-client";
import { requireConfig } from "@/lib/config";
import { requestOrigin } from "@/lib/security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  const url = new URL(request.url);
  let destination = requestOrigin(request);
  try {
    const config = requireConfig();
    if (destination !== config.appOrigin) throw new Error("Wrong callback host.");
    destination = config.appOrigin;
    consumeOAuth(url.searchParams.get("state"), (await cookies()).get(STATE_COOKIE)?.value);
    if (url.searchParams.has("error")) throw new Error("Authorization declined.");
    const code = url.searchParams.get("code");
    if (!code) throw new Error("Missing authorization code.");
    const tokens = await exchangeToken(config, { grant_type: "authorization_code", code, redirect_uri: config.redirectUri });
    if (!tokens.refresh_token) throw new Error("Missing refresh token.");
    const conn = createConnection(config.baseUrl, "Your Clio account", tokens);
    const response = NextResponse.redirect(new URL("/?connected=1", destination));
    response.cookies.set(SESSION_COOKIE, createSession(conn), cookieOptions(7 * 86400));
    response.cookies.set(STATE_COOKIE, "", cookieOptions(0));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    // Never put codes, tokens, raw upstream errors, or secrets in redirect URLs/logs.
    const response = NextResponse.redirect(new URL("/?connection_error=authorization", destination));
    response.cookies.set(STATE_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
    return response;
  }
}
