import { encodeRewardClaim, matchesRewardReceipt } from "../../../../shared/reward-claim.js";
/** Only called by an explicit Claim click. A sent transaction is never automatically resubmitted. */
export function createClaimClient({ provider = globalThis.ethereum, storage = globalThis.localStorage, now = Date.now } = {}) {
  const sent = new Map();
  const key = (p) => `ndobol-claim:${p.domain.chainId}:${p.domain.verifyingContract.toLowerCase()}:${p.message.roundId}:${p.message.player.toLowerCase()}`;
  function pending(proof) {
    const k = key(proof);
    if (sent.has(k)) return sent.get(k);
    try { const value = storage?.getItem(k); if (/^0x[0-9a-f]{64}$/i.test(value)) return value; } catch { /* Storage can be unavailable in private browsing. */ }
    return null;
  }
  async function network(proof) {
    if (!provider?.request) throw new Error("WALLET_REQUIRED");
    const chainId = Number(await provider.request({ method: "eth_chainId" }));
    if (chainId !== proof.domain.chainId) throw new Error("WRONG_NETWORK");
  }
  return {
    pending,
    async submit(proof, config) {
      const data = encodeRewardClaim(proof, config);
      const existing = pending(proof);
      if (existing) return existing;
      if (BigInt(proof.message.deadline) < BigInt(Math.floor(now() / 1000))) throw new Error("REWARD_EXPIRED");
      await network(proof);
      const accounts = await provider.request({ method: "eth_accounts" });
      const from = accounts.find(a => a.toLowerCase() === proof.message.player.toLowerCase());
      if (!from) throw new Error("WRONG_REWARD_WALLET");
      const tx = { from, to: config.contract, data, value: "0x0" };
      const code = await provider.request({ method: "eth_getCode", params: [tx.to, "latest"] });
      if (!code || /^0x0*$/.test(code)) throw new Error("REWARD_NOT_DEPLOYED");
      await provider.request({ method: "eth_call", params: [tx, "latest"] });
      // Wallet estimates gas and asks the player to approve the transaction.
      await network(proof);
      const hash = await provider.request({ method: "eth_sendTransaction", params: [tx] });
      if (!/^0x[0-9a-f]{64}$/i.test(hash)) throw new Error("INVALID_TRANSACTION_HASH");
      sent.set(key(proof), hash);
      try { storage?.setItem(key(proof), hash); } catch { /* Memory retains pending hash. */ }
      return hash;
    },
    async receipt(proof) {
      const hash = pending(proof);
      if (!hash) return null;
      await network(proof);
      const receipt = await provider.request({ method: "eth_getTransactionReceipt", params: [hash] });
      if (!receipt) return { hash, status: "pending" };
      if (![0, 1].includes(Number(receipt.status)) || !receipt.blockNumber ||
          receipt.transactionHash?.toLowerCase() !== hash.toLowerCase())
        throw new Error("UNVERIFIED_REWARD_RECEIPT");
      if (Number(receipt.status) === 1 && !matchesRewardReceipt(proof, receipt))
        throw new Error("UNVERIFIED_REWARD_RECEIPT");
      return { hash, status: Number(receipt.status) === 1 ? "confirmed" : "failed" };
    },
    retryFailed(proof) {
      // Caller may use only after a mined failure. Never invoked on a timeout or RPC error.
      sent.delete(key(proof));
      try { storage?.removeItem(key(proof)); } catch { /* Optional storage. */ }
    },
  };
}
