import { apiUrl } from "../net/config.js";
import { encodeRewardClaim, matchesRewardReceipt } from "../../../../shared/reward-claim.js";
/** The player's wallet never sends a transaction in this flow. The API owns the durable outbox. */
export function createSponsoredClaimClient({ provider = globalThis.ethereum, fetcher = fetch,
  session = () => JSON.parse(sessionStorage.getItem("ndobol-session")) } = {}) {
  const sent = new Map();
  async function request(proof, config) {
    encodeRewardClaim(proof, config);
    if (!config.sponsored || !config.relayer) throw new Error("SPONSOR_DISABLED");
    if (!provider?.request) throw new Error("WALLET_REQUIRED");
    if (Number(await provider.request({ method: "eth_chainId" })) !== config.chainId) throw new Error("WRONG_NETWORK");
    const accounts = await provider.request({ method: "eth_accounts" });
    if (!accounts.some(a => a.toLowerCase() === proof.message.player.toLowerCase())) throw new Error("WRONG_REWARD_WALLET");
    const token = session()?.token;
    if (!token) throw new Error("INVALID_SESSION");
    const response = await fetcher(apiUrl("/rounds/claim"), { method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ roundId: proof.roundId }) });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "SPONSOR_UNAVAILABLE");
    if (!/^0x[\da-f]{64}$/i.test(result.hash) || result.recipient?.toLowerCase() !== proof.message.player.toLowerCase() ||
        result.rewardWei !== proof.message.rewardWei || result.gasPayer?.toLowerCase() !== config.relayer.toLowerCase() ||
        result.playerGasWei !== "0" || !["pending", "confirmed", "failed"].includes(result.status)) throw new Error("UNVERIFIED_REWARD_RECEIPT");
    if (result.status === "confirmed" && (Number(result.receipt?.status) !== 1 || !result.receipt?.blockNumber ||
        result.receipt.transactionHash?.toLowerCase() !== result.hash.toLowerCase() ||
        !matchesRewardReceipt(proof, result.receipt, config.relayer))) throw new Error("UNVERIFIED_REWARD_RECEIPT");
    sent.set(proof.roundId, result.hash);
    return result;
  }
  return {
    pending: proof => sent.get(proof.roundId) || null,
    submit: async (proof, config) => (await request(proof, config)).hash,
    receipt: request,
    retryFailed() { /* Operator reviews failures. No automatic replacement transaction. */ },
  };
}
