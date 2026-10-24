/** Frozen Phase 2 typed-data schema; Phase 3 must implement this exact type/domain. */
export const RESULT_TYPES = Object.freeze({
  RoundResult: [
    { name: "roundId", type: "bytes32" },
    { name: "player", type: "address" },
    { name: "trackId", type: "bytes32" },
    { name: "score", type: "uint256" },
    { name: "trash", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
});
export const SIGNING_NAME = "NdobolRiverRegistry";
export const SIGNING_VERSION = "2";
