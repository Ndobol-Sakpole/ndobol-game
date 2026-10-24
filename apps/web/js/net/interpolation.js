import { wrapAngle } from "../../../../shared/game/rafts.js";
import { GAME } from "../../../../shared/game/config.js";
/** Authoritative poses only; extrapolation is bounded when a packet arrives late. */
export function createInterpolator({
  delayMs = GAME.interpolationMs,
  maxExtrapolationMs = GAME.maxExtrapolationMs,
} = {}) {
  let frames = [],
    roundId = null;
  return {
    push(state, serverTime) {
      if (state.roundId !== roundId) {
        frames = [];
        roundId = state.roundId;
      }
      if (frames.length && state.tick <= frames.at(-1).state.tick) return;
      frames.push({ state, time: serverTime });
      if (frames.length > 30) frames.shift();
    },
    sample(serverNow) {
      if (!frames.length) return null;
      const target = serverNow - delayMs;
      while (frames.length > 2 && frames[1].time <= target) frames.shift();
      const a = frames[0],
        b = frames[1] || a,
        latest = frames.at(-1).state;
      if (a.state.phase !== b.state.phase || !["running", "finished"].includes(latest.phase))
        return latest;
      const factor = Math.max(
        0,
        Math.min(1, (target - a.time) / Math.max(1, b.time - a.time)),
      );
      const out = { ...latest, players: latest.players.map((p) => ({ ...p })) };
      for (const key of [
        "s",
        "lateral",
        "speed",
        "steer",
        "bump",
        "elapsed",
        "beat",
        "roll",
        "pitch",
        "heave",
        "lateralVelocity",
      ])
        out[key] =
          (a.state[key] || 0) +
          ((b.state[key] || 0) - (a.state[key] || 0)) * factor;
      out.heading =
        (a.state.heading || 0) +
        wrapAngle((b.state.heading || 0) - (a.state.heading || 0)) * factor;
      if (target > b.time && latest.phase === "running")
        out.s +=
          (b.state.speed * Math.min(maxExtrapolationMs, target - b.time)) /
          1000;
      for (const p of out.players) {
        const pa = a.state.players.find((v) => v.id === p.id),
          pb = b.state.players.find((v) => v.id === p.id);
        if (pa && pb) {
          for (const key of ["gas", "x", "z", "walk"])
            p[key] =
              (pa[key] || 0) + ((pb[key] || 0) - (pa[key] || 0)) * factor;
          p.facing =
            (pa.facing || 0) +
            wrapAngle((pb.facing || 0) - (pa.facing || 0)) * factor;
        }
      }
      return out;
    },
    reset() {
      frames = [];
      roundId = null;
    },
  };
}
