import { REWARD_NAME, REWARD_VERSION } from "./reward-signing.js";
import { rewardWei } from "./game/rewards.js";
import { isAddress } from "./messages.js";
export const REWARD_CLAIMED_TOPIC = "0x79fb4829cb8e409add800152f7f4efba17945bb21d83375fa1279bc9996e58be";
const word = (n) => {
  if (!/^\d+$/.test(String(n))) throw new Error("INVALID_REWARD_PROOF");
  const v = BigInt(n);
  if (v >= 2n ** 256n) throw new Error("INVALID_REWARD_PROOF");
  return v.toString(16).padStart(64, "0");
};
/** Fixed ABI encoder avoids shipping a wallet library/bundler to the native frontend.
 * Differential-tested against viem and the built Solidity ABI. */
export function encodeRewardClaim(proof, config) {
  const m = proof?.message, d = proof?.domain;
  if (!m || !d || !config?.enabled || !proof.claimEnabled ||
      proof.primaryType !== "RoundReward" || d.name !== REWARD_NAME || d.version !== REWARD_VERSION ||
      ![10143, 143].includes(config.chainId) || d.chainId !== config.chainId ||
      !isAddress(config.contract) || d.verifyingContract.toLowerCase() !== config.contract.toLowerCase() ||
      !isAddress(m.player) || !/^0x[0-9a-fA-F]{130}$/.test(proof.signature) ||
      ![m.roundId, m.trackId].every(v => /^0x[0-9a-fA-F]{64}$/.test(v)))
    throw new Error("INVALID_REWARD_PROOF");
  const grams = Number(m.weightGrams);
  if (!Number.isSafeInteger(grams) || grams <= 0 || grams > 1_000_000 ||
      m.rewardWei !== rewardWei(grams) || BigInt(m.score) !== BigInt(grams))
    throw new Error("INVALID_REWARD_PROOF");
  const fields = [m.roundId.slice(2), m.player.slice(2).padStart(64, "0"), m.trackId.slice(2),
    ...[m.score, m.trash, m.weightGrams, m.rewardWei, m.nonce, m.deadline].map(word)];
  // Nine fixed struct words, one bytes offset, then signature length/data/padding.
  return "0xa6603a85" + fields.join("") + word(320) + word(65) + proof.signature.slice(2).padEnd(192, "0");
}
export function matchesRewardReceipt(proof, receipt, sender = proof.message.player) {
  const m = proof.message, pool = proof.domain.verifyingContract.toLowerCase();
  return receipt.to?.toLowerCase() === pool && receipt.from?.toLowerCase() === sender.toLowerCase() &&
    receipt.logs?.some(log => log.address?.toLowerCase() === pool &&
      log.topics?.[0]?.toLowerCase() === REWARD_CLAIMED_TOPIC &&
      log.topics?.[1]?.toLowerCase() === m.roundId.toLowerCase() &&
      log.topics?.[2]?.toLowerCase() === "0x" + m.player.slice(2).toLowerCase().padStart(64, "0") &&
      log.data?.toLowerCase() === "0x" + [m.weightGrams, m.rewardWei, m.nonce].map(word).join(""));
}
