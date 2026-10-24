import { validateRound } from "./validate-round.js";
import { GAME } from "../shared/game/config.js";
/** Server-only PostgREST RPC adapter. Never expose the service-role key in a web build. */
export function createSupabaseStore({ url = process.env.SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY, fetcher = fetch } = {}) {
  if (!url || !key || new URL(url).protocol !== "https:") throw new Error("SUPABASE_CONFIG_REQUIRED");
  const endpoint = new URL("/rest/v1/rpc/ndobol_store", url);
  async function rpc(operation, args) {
    const response = await fetcher(endpoint, { method: "POST", signal: AbortSignal.timeout(8000),
      headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation, args }) });
    if (!response.ok) throw new Error(`DATABASE_RPC_${response.status}`); // no credentials or SQL contents in logs
    return response.json();
  }
  return {
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
