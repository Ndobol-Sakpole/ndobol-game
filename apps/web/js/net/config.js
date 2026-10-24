/** Static public endpoints only. infra/build-game.js writes runtime-config.js for Vercel. */
export function apiUrl(path) {
  const origin = globalThis.NDOBOL_CONFIG?.apiOrigin;
  return origin ? new URL(path, origin).href : `/api${path}`;
}
export function roomUrl() {
  const configured = globalThis.NDOBOL_CONFIG?.wsUrl;
  if (configured) return configured;
  const url = new URL("/rooms", location.href);
  url.protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return url.href;
}
