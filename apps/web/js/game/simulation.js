import { clamp } from "../core/config.js";
/** Pure fixed-step simulation. Distances in metres, time in seconds. No Three.js or DOM. */
export function createSimulation(track, bus) {
  const state = {
    s: 15,
    lateral: 0,
    speed: 0,
    steer: 0,
    bump: 0,
    elapsed: 0,
    score: 0,
    collected: 0,
    active: false,
    complete: false,
    previousS: 15,
    previousLateral: 0,
  };
  const picked = new Set();
  let collisionCooldown = 0,
    pickupCooldown = 0;
  return {
    state,
    picked,
    start() {
      state.active = true;
    },
    pause() {
      state.active = false;
      state.speed = 0;
    },
    update(dt, input) {
      state.previousS = state.s;
      state.previousLateral = state.lateral;
      if (!state.active || state.complete) return;
      state.elapsed += dt;
      state.steer = input.steer;
      collisionCooldown = Math.max(0, collisionCooldown - dt);
      pickupCooldown = Math.max(0, pickupCooldown - dt);
      state.bump *= Math.exp(-dt * 5);
      state.speed += (input.throttle * 6 - state.speed * 1.2) * dt;
      state.s = clamp(state.s + state.speed * dt, 6, track.length - 12);
      state.lateral = clamp(
        state.lateral + input.steer * dt * 3.3,
        -track.width / 2 + 2.1,
        track.width / 2 - 2.1,
      );
      for (const obstacle of track.obstacles) {
        const ds = state.s - obstacle.s,
          dl = state.lateral - obstacle.lateral,
          distance = Math.hypot(ds, dl),
          radius = obstacle.radius + 1.45;
        if (distance < radius) {
          const normalS = distance > 0.001 ? ds / distance : -1,
            normalL = distance > 0.001 ? dl / distance : 0;
          state.s += normalS * (radius - distance);
          state.lateral += normalL * (radius - distance);
          if (collisionCooldown === 0) {
            state.speed *= -0.3;
            state.bump = 1;
            collisionCooldown = 1;
            bus.emit("collision", obstacle.type);
          }
        }
      }
      state.s = clamp(state.s, 6, track.length - 12);
      state.lateral = clamp(
        state.lateral,
        -track.width / 2 + 2.1,
        track.width / 2 - 2.1,
      );
      if (input.collect && pickupCooldown === 0) {
        pickupCooldown = 0.25;
        const index = track.trash.findIndex(
          (item, i) =>
            !picked.has(i) &&
            Math.hypot(item.s - state.s, item.lateral - state.lateral) < 3.8,
        );
        if (index >= 0) {
          picked.add(index);
          state.score += 100;
          state.collected++;
          bus.emit("collected", {
            id: `${track.id}:${index}`,
            type: track.trash[index].type,
            score: state.score,
          });
        }
      }
      if (state.s >= track.length - 12) {
        state.complete = true;
        state.active = false;
        state.speed = 0;
        bus.emit("complete", {
          trackId: track.id,
          score: state.score,
          trashCount: state.collected,
          durationMs: Math.round(state.elapsed * 1000),
        });
      }
    },
  };
}
