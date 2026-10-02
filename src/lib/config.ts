const CLIO_ORIGINS = new Set(["https://app.clio.com", "https://eu.app.clio.com", "https://ca.app.clio.com", "https://au.app.clio.com"]);
export function getConfig() {
  const baseUrl = process.env.CLIO_BASE_URL?.trim() || "https://app.clio.com";
  const redirectUri = process.env.CLIO_REDIRECT_URI?.trim() || "http://127.0.0.1:3000/api/clio/callback";
  if (!CLIO_ORIGINS.has(baseUrl)) throw new Error("CLIO_BASE_URL must be a supported Clio regional HTTPS origin.");
  const redirect = new URL(redirectUri);
  if (redirect.hash || redirect.search || redirect.username || redirect.password || redirect.pathname !== "/api/clio/callback" || !(redirect.protocol === "https:" || (redirect.protocol === "http:" && redirect.hostname === "127.0.0.1"))) {
    throw new Error("Use an HTTPS callback or http://127.0.0.1:3000/api/clio/callback, without a query or fragment.");
  }
  const clientId = process.env.CLIO_CLIENT_ID?.trim() || "";
  const clientSecret = process.env.CLIO_CLIENT_SECRET?.trim() || "";
  return { baseUrl, redirectUri, appOrigin: redirect.origin, clientId, clientSecret, configured: Boolean(clientId && clientSecret), secureCookies: redirect.protocol === "https:" };
}
export function requireConfig() {
  const config = getConfig();
  if (!config.configured) throw new Error("Add your Clio application key and secret to .env.local, then restart the app.");
  return config;
}
