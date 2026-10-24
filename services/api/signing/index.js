import { keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import {
  RESULT_TYPES,
  SIGNING_NAME,
  SIGNING_VERSION,
} from "../../../shared/signing.js";
import { REWARD_NAME, REWARD_VERSION, REWARD_TYPES } from "../../../shared/reward-signing.js";
import { isFatal } from "../../../shared/game/rewards.js";
import { GAME } from "../../../shared/game/config.js";
import { isAddress } from "../../../shared/messages.js";
import { validateResult, scoringConfig } from "../../../shared/game/scoring.js";
import { tokenHash } from "../session-token.js";
import { tracks } from "../rooms/tracks.js";
export class ApiError extends Error {
  constructor(status, code) {
    super(code);
    this.status = status;
    this.code = code;
  }
}
const fail = (status, code) => {
  throw new ApiError(status, code);
};
export function createSigner(
  store,
  {
    privateKey = process.env.SIGNER_PRIVATE_KEY,
    chainId = Number(process.env.SIGNING_CHAIN_ID || 10143),
    verifyingContract = process.env.RIVER_REGISTRY_ADDRESS,
    rewardPool = process.env.REWARD_POOL_ADDRESS,
    claimsEnabled = process.env.REWARD_CLAIMS_ENABLED === "true",
    now = Date.now,
    config = GAME,
  } = {},
) {
  let account = null;
  if (privateKey) {
    if (![10143, 143].includes(chainId)) throw new Error("Signing requires a Monad chain ID");
    // Preparing a key may happen before deploying the verifier. Keep games usable.
    if (isAddress(verifyingContract) || isAddress(rewardPool)) account = privateKeyToAccount(privateKey);
  }
  if (claimsEnabled && (!account || !isAddress(rewardPool))) throw new Error("Reward claims require a signer key and reward pool");
  const domain = {
    name: SIGNING_NAME,
    version: SIGNING_VERSION,
    chainId,
    verifyingContract,
  };
  let queue = Promise.resolve(); // Serialize nonce allocation across async local signing operations.
  async function auth(roundId, playerId, token) {
    if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
      fail(401, "INVALID_SESSION");
    const evidence = await store.evidence(roundId, playerId, tokenHash(token));
    if (!evidence) fail(403, "RESULT_NOT_OWNED");
    return evidence;
  }
  async function sign({ roundId, playerId }, token) {
    const evidence = await auth(roundId, playerId, token);
    if (!await store.rate(evidence.address || evidence.player_id, now(), config))
      fail(429, "SIGN_RATE_LIMIT");
    if (!evidence.address) fail(403, "GUEST_RESULT");
    if (await store.signed(roundId, playerId)) fail(409, "ALREADY_SIGNED");
    const weighted = evidence.rules_version >= 5;
    if (weighted && isFatal(evidence.reason)) fail(403, "REWARD_FORFEITED");
    if (weighted && evidence.weight_grams === 0) fail(422, "NO_REWARD");
    if (!account || !isAddress(weighted ? rewardPool : verifyingContract)) fail(503, "SIGNING_DISABLED");
    const valid = validateResult(
      {
        score: evidence.score,
        trash: evidence.trash,
        syncBeats: evidence.sync_beats,
        durationMs: evidence.duration_ms,
        completed: Boolean(evidence.completed),
        reason: evidence.reason,
        weightGrams: evidence.weight_grams,
        rewardWei: evidence.reward_wei,
        picked: JSON.parse(evidence.pickup_json),
        animal: evidence.animal,
        bot: false,
      },
      tracks[evidence.track_id],
      scoringConfig(evidence.rules_version, config),
    );
    if (!valid || evidence.mode !== "online") fail(422, "IMPOSSIBLE_RESULT");
    const nonce = await store.nonce(evidence.address),
      deadline = Math.floor(now() / 1000) + config.signatureLifetimeSeconds;
    const result = {
      roundId: keccak256(toHex(roundId)),
      player: evidence.address,
      trackId: keccak256(toHex(evidence.track_id)),
      score: BigInt(evidence.score),
      trash: BigInt(evidence.trash),
      nonce: BigInt(nonce),
      deadline: BigInt(deadline),
    };
    if (weighted) {
      result.weightGrams = BigInt(evidence.weight_grams);
      result.rewardWei = BigInt(evidence.reward_wei);
    }
    const proofDomain = weighted ? { name: REWARD_NAME, version: REWARD_VERSION, chainId, verifyingContract: rewardPool } : domain;
    const types = weighted ? REWARD_TYPES : RESULT_TYPES;
    const primaryType = weighted ? "RoundReward" : "RoundResult";
    const signature = await account.signTypedData({
      domain: proofDomain,
      types,
      primaryType,
      message: result,
    });
    const payload = {
      domain: proofDomain,
      types,
      primaryType,
      message: Object.fromEntries(
        Object.entries(result).map(([key, value]) => [
          key,
          typeof value === "bigint" ? String(value) : value,
        ]),
      ),
      signature,
      signer: account.address,
      roundId,
      trackId: evidence.track_id,
      claimEnabled: Boolean(weighted && claimsEnabled),
    };
    await store.saveSignature(evidence, payload);
    return payload;
  }
  return {
    enabled: Boolean(account),
    address: account?.address || null,
    rewardConfig: { chainId, contract: isAddress(rewardPool) ? rewardPool : null,
      enabled: Boolean(account && isAddress(rewardPool) && claimsEnabled) },
    sign(request, token) {
      const result = queue.then(() => sign(request, token));
      queue = result.catch(() => {});
      return result;
    },
    async get(roundId, token) {
      if (typeof token !== "string" || !/^[a-f0-9]{64}$/.test(token))
        fail(401, "INVALID_SESSION");
      const row = await store.evidenceByToken(roundId, tokenHash(token));
      if (!row) fail(403, "RESULT_NOT_OWNED");
      const signed = await store.signed(roundId, row.session_id);
      if (!signed) fail(404, "NOT_SIGNED");
      return { ...signed, claimEnabled: Boolean(signed.primaryType === "RoundReward" && account && claimsEnabled &&
        signed.domain.verifyingContract.toLowerCase() === rewardPool?.toLowerCase() && signed.domain.chainId === chainId) };
    },
  };
}
