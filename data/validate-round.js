import { validateResult, scoringConfig } from "../shared/game/scoring.js";
import { tracks } from "../services/api/rooms/tracks.js";
export function validateRound(state) {
    if (
      state.mode !== "online" ||
      !["finished", "results"].includes(state.phase)
    )
      throw new Error("ROUND_NOT_AUTHORITATIVE");
    const durationMs = Math.round(state.elapsed * 1000),
      track = tracks[state.trackId];
    for (const p of state.players)
      if (
        !validateResult({ ...p, durationMs, reason: state.reason, completed: state.completed }, track, scoringConfig(state.rulesVersion))
      )
        throw new Error("IMPOSSIBLE_RESULT");
    if (
      state.players.reduce((n, p) => n + p.trash, 0) !== state.picked.length ||
      new Set(state.picked).size !== state.picked.length ||
      state.picked.some(
        (i) => !Number.isInteger(i) || i < 0 || i >= track.trash.length,
      )
    )
      throw new Error("INVALID_TRASH_EVIDENCE");
    if (state.rulesVersion >= 5) {
      const owned = state.players.flatMap(p => p.picked);
      if (owned.length !== state.picked.length || new Set(owned).size !== owned.length ||
          owned.some(i => !state.picked.includes(i)) ||
          state.weightGrams !== state.players.reduce((n, p) => n + p.weightGrams, 0) ||
          state.rewardWei !== String(state.players.reduce((n, p) => n + BigInt(p.rewardWei), 0n)))
        throw new Error("INVALID_WEIGHT_EVIDENCE");
    }
  return { durationMs, track };
}
