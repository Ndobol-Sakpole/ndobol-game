import { clamp } from "./config.js";
/** Metres/second, deterministic and shared by simulation + procedural water rendering.
 * Calm sections have zero ambient translation: only fart impulses move the raft there.
 * Smooth entry/exit avoids force discontinuities at rapid boundaries.
 */
export function sampleCurrent(track, s, lateral = 0, time = 0) {
  let forward = 0,
    cross = 0,
    chop = 0,
    strength = 0;
  for (const zone of track.rapids || []) {
    const fade = clamp(
      Math.min((s - zone.start) / 6, (zone.end - s) / 6),
      0,
      1,
    );
    const f = fade * fade * (3 - 2 * fade);
    forward += zone.speed * f;
    cross += zone.cross * f * Math.sin(s * 0.13 + time * 0.7 + lateral * 0.12);
    chop += zone.chop * f;
    strength = Math.max(strength, f);
  }
  return { forward, cross, chop, strength };
}
