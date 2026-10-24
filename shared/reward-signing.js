/** Native MON reward proofs are a separate domain/type from archived score-only proofs. */
export const REWARD_NAME = "NdobolRiverRewards";
export const REWARD_VERSION = "1";
export const REWARD_TYPES = Object.freeze({
  RoundReward: [
    { name: "roundId", type: "bytes32" },
    { name: "player", type: "address" },
    { name: "trackId", type: "bytes32" },
    { name: "score", type: "uint256" },
    { name: "trash", type: "uint256" },
    { name: "weightGrams", type: "uint256" },
    { name: "rewardWei", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
});
