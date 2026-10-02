import { NextResponse } from "next/server";
import { beginOAuth, cookieOptions, STATE_COOKIE } from "@/lib/auth";
import { requireConfig } from "@/lib/config";
import { requestOrigin } from "@/lib/security";
export const runtime = "nodejs";
export async function GET(request: Request) {
  try {
    const config = requireConfig();
    if (requestOrigin(request) !== config.appOrigin) return NextResponse.redirect(new URL("/api/clio/connect", config.appOrigin));
    const state = beginOAuth();
    const url = new URL("/oauth/authorize", config.baseUrl);
    url.search = new URLSearchParams({ response_type: "code", client_id: config.clientId, redirect_uri: config.redirectUri, state, redirect_on_decline: "true" }).toString();
    const response = NextResponse.redirect(url);
    response.cookies.set(STATE_COOKIE, state, cookieOptions(600));
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(new URL("/?connection_error=configuration", requestOrigin(request)));
  }
}
