import { GAME, TRACK_RULES, ANIMALS } from "./config.js";
import { REWARDS, trashMass, rewardWei } from "./rewards.js";
/** Explicit legacy rules keep old stored proofs valid without retroactive MON rewards. */
export const scoringConfig = (version, config = GAME) => ({
  ...config, rulesVersion: version,
  syncPoints: version < 4 ? 8 : 0,
});
export function scorePlayer(player, completed, config = GAME) {
  if (config.rulesVersion >= 5)
    return Math.floor(player.weightGrams * REWARDS.pointsPerKg / 1000);
  return player.trash * config.trashPoints + player.syncBeats * config.syncPoints +
    (completed ? config.finishPoints : 0);
}
export function resultBounds(track, durationSeconds, config = GAME) {
  const seconds = Math.min(durationSeconds, TRACK_RULES[track.id].limitSeconds);
  const maxBeats = config.syncPoints > 0
    ? Math.floor((seconds + config.beatWindow) / config.beatSeconds) + 1 : 0;
  const weightGrams = track.trash.reduce((sum, item) => sum + trashMass(item), 0);
  return {
    trash: track.trash.length, weightGrams, syncBeats: maxBeats,
    score: config.rulesVersion >= 5 ? weightGrams * REWARDS.pointsPerKg / 1000 :
      track.trash.length * config.trashPoints + maxBeats * config.syncPoints + config.finishPoints,
    minFinishSeconds: (track.length - config.finishMargin - config.startDistance) / config.maxSpeed,
  };
}
/** Validate exact item ownership and mass for v5, never a client-provided weight. */
export function validateResult(result, track, config = GAME) {
  if (!track) return false;
  const bounds = resultBounds(track, result.durationMs / 1000, config);
  if (!Number.isSafeInteger(result.durationMs) || result.durationMs <= 0 ||
      result.durationMs > (TRACK_RULES[track.id].limitSeconds + 1) * 1000) return false;
  if (![result.trash, result.syncBeats, result.score].every(Number.isSafeInteger) ||
      result.trash < 0 || result.trash > bounds.trash || result.syncBeats < 0 ||
      result.syncBeats > bounds.syncBeats) return false;
  if (result.completed && result.durationMs / 1000 + 1 / config.tickHz < bounds.minFinishSeconds) return false;
  if (config.rulesVersion >= 5) {
    if (!Array.isArray(result.picked) || result.picked.length !== result.trash ||
        new Set(result.picked).size !== result.picked.length ||
        result.picked.some(i => !Number.isInteger(i) || i < 0 || i >= track.trash.length)) return false;
    const mass = result.picked.reduce((sum, i) => sum + trashMass(track.trash[i]), 0);
    if (result.weightGrams !== mass) return false;
    const cooldown = config.reachCooldown * (ANIMALS[result.animal]?.cooldown || 0.88);
    if (result.trash > Math.ceil(result.durationMs / 1000 / cooldown) + 1) return false;
    if (result.reason !== undefined) {
      if (!["finish", "timeout", "capsized", "sunk"].includes(result.reason) ||
          Boolean(result.completed) !== (result.reason === "finish")) return false;
      if (result.rewardWei !== (result.bot ? "0" : rewardWei(mass, result.reason))) return false;
    }
  }
  return result.score === scorePlayer(result, result.completed, config) && result.score <= bounds.score;
}
