import { validateRound } from "./validate-round.js";
import { GAME } from "../shared/game/config.js";
/** Server-only PostgREST RPC adapter. Never expose the service-role key in a web build. */
export function createSupabaseStore({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY, fetcher = fetch } = {}) {
  if (!url || !key || new URL(url).protocol !== "https:") throw new Error("SUPABASE_CONFIG_REQUIRED");
  if (key.startsWith("sb_publishable_")) throw new Error("SUPABASE_SERVER_KEY_REQUIRED: use SUPABASE_SECRET_KEY on the API only");
  const headers = { apikey: key, "Content-Type": "application/json" };
  // Modern secret keys are opaque, not JWTs. Keep legacy service-role JWT support.
  if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
  const endpoint = new URL("/rest/v1/rpc/ndobol_store", url);
  async function rpc(operation, args, relay = false) {
    const response = await fetcher(relay ? new URL("/rest/v1/rpc/ndobol_relay", url) : endpoint, { method: "POST", signal: AbortSignal.timeout(8000),
      headers,
      body: JSON.stringify({ operation, args }) });
    if (!response.ok) throw new Error(`DATABASE_RPC_${response.status}`); // no credentials or SQL contents in logs
    return response.json();
  }
  return {
    relayGet: id => rpc("get", { id }, true),
    relayPending: () => rpc("pending", {}, true),
    relayReserve: (record, dailyLimit) => rpc("reserve", { record, dailyLimit: String(dailyLimit) }, true),
    relayUpdate: record => rpc("update", { record }, true),
    persistRound(state, members) { validateRound(state); return rpc("persist", { state, members }); },
    evidence: (roundId, sessionId, hash) => rpc("evidence", { roundId, sessionId, hash }),
    evidenceByToken: (roundId, hash) => rpc("evidenceByToken", { roundId, hash }),
    signed: (roundId, sessionId) => rpc("signed", { roundId, sessionId }),
    rate: (identity, now, config = GAME) => rpc("rate", { identity, now, window: config.signRateWindowMs, limit: config.signRateLimit }),
    nonce: address => rpc("nonce", { address }),
    saveSignature: (evidence, payload) => rpc("saveSignature", { evidence, payload }),
    leaderboard: trackId => rpc("leaderboard", { trackId }),
    close() {},
  };
}
