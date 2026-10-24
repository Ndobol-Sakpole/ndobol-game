import { sampleCurrent } from "./water.js";
import { clamp } from "./config.js";
import { RAFTS, DECK, FLOAT_CORNERS, wrapAngle } from "./rafts.js";
export function initHull() {
  return {
    roll: 0,
    pitch: 0,
    rollVelocity: 0,
    pitchVelocity: 0,
    heading: 0,
    yawVelocity: 0,
    lateralVelocity: 0,
    loadX: 0,
    loadZ: 0,
    balance: 1,
    floats: [1, 1, 1, 1],
    wetness: 0,
    buoyancy: 1,
    heave: 0,
    verticalVelocity: 0,
    current: 0,
    rapid: 0,
    flooding: 0,
    sinkTime: 0,
    failureReason: null,
    deathAxis: "roll",
    deathDirection: 1,
  };
}
export function walkPlayer(p, command, hull, dt) {
  const x = command.moveX || 0,
    z = command.moveZ || 0;
  const norm = Math.max(1, Math.hypot(x, z));
  const slip =
    Math.abs(hull.roll) > DECK.slideAngle ? hull.roll * DECK.slideForce : 0;
  const slipZ =
    Math.abs(hull.pitch) > DECK.slideAngle ? -hull.pitch * DECK.slideForce : 0;
  p.x = clamp(
    p.x + ((x / norm) * DECK.walkSpeed - slip) * dt,
    -DECK.halfWidth,
    DECK.halfWidth,
  );
  p.z = clamp(
    p.z + ((z / norm) * DECK.walkSpeed + slipZ) * dt,
    -DECK.halfLength,
    DECK.halfLength,
  );
  p.facing = wrapAngle(p.facing + (command.turn || 0) * DECK.turnSpeed * dt);
  p.walk = Math.hypot(x, z) > 0 ? 1 : Math.min(1, Math.abs(slip));
}
export function gasImpulse(state, p, c) {
  if (state.failureReason) return;
  const hull = RAFTS[state.raftId],
    mass = hull.mass + state.wetness * 0.35;
  const force = DECK.gasImpulse / mass;
  const direction = p.facing + state.heading;
  const x = Math.sin(direction) * force,
    forward = Math.cos(direction) * force;
  state.speed = clamp(state.speed + forward, -c.maxSpeed, c.maxSpeed);
  state.lateralVelocity = clamp(
    state.lateralVelocity + x,
    -DECK.maxLateralSpeed,
    DECK.maxLateralSpeed,
  );
  const localX = Math.sin(p.facing) * force,
    localForward = Math.cos(p.facing) * force;
  state.yawVelocity +=
    ((-p.x * localForward - p.z * localX) * DECK.torque) / mass;
  state.rollVelocity += localX * hull.recoil;
  state.pitchVelocity -= localForward * hull.recoil;
}
export function stepHull(state, dt, c, track = {}) {
  if (state.failureReason) return stepWreck(state, dt);
  const water = sampleCurrent(track, state.s, state.lateral, state.elapsed);
  state.current = water.forward;
  state.rapid = water.strength;
  const hull = RAFTS[state.raftId],
    count = Math.max(1, state.players.length);
  state.loadX = state.players.reduce((sum, p) => sum + p.x, 0) / count;
  state.loadZ = state.players.reduce((sum, p) => sum + p.z, 0) / count;
  const integrity = state.floats.reduce((a, b) => a + b, 0) / 4;
  const damagedX =
    state.floats.reduce((n, f, i) => n + (1 - f) * FLOAT_CORNERS[i][0], 0) *
    0.1;
  const damagedZ =
    state.floats.reduce((n, f, i) => n + (1 - f) * FLOAT_CORNERS[i][1], 0) *
    0.1;
  const targetRoll =
    -state.loadX * hull.weightTilt -
    damagedX +
    Math.sin(state.elapsed * 1.8) * (0.018 + water.chop * 0.5);
  const targetPitch =
    state.loadZ * hull.weightTilt * 0.65 +
    damagedZ +
    Math.sin(state.elapsed * 2.35) * (0.014 + water.chop * 0.65);
  const stiffness = hull.spring * (0.55 + 0.45 * integrity),
    damping = hull.damping;
  // Righting leverage collapses after the deck edge submerges. Counterweight can
  // still recover a small list, but an overturned hull cannot spring upright.
  const tipping = (angle) =>
    Math.sign(angle) * Math.max(0, Math.abs(angle) - c.unstableAngle) * stiffness * 4;
  state.rollVelocity +=
    ((targetRoll - state.roll) * stiffness + tipping(state.roll) - state.rollVelocity * damping) * dt;
  state.pitchVelocity +=
    ((targetPitch - state.pitch) * stiffness + tipping(state.pitch) - state.pitchVelocity * damping) *
    dt;
  state.roll = clamp(
    state.roll + state.rollVelocity * dt,
    -DECK.maxRoll,
    DECK.maxRoll,
  );
  state.pitch = clamp(state.pitch + state.pitchVelocity * dt, -Math.PI, Math.PI);
  state.yawVelocity += (water.cross * 0.12 - state.yawVelocity * 1.4) * dt;
  state.heading = wrapAngle(state.heading + state.yawVelocity * dt);
  if (state.raftId === "ranjang-hanyut")
    state.wetness = clamp(
      state.wetness + (Math.abs(state.roll) > 0.22 ? 0.08 : -0.009) * dt,
      0,
      1,
    );
  const tilt = Math.max(Math.abs(state.roll), Math.abs(state.pitch));
  state.flooding = clamp(state.flooding +
    (tilt > c.floodAngle ? (tilt - c.floodAngle) * c.floodRate : -c.drainRate) * dt, 0, 1);
  state.buoyancy = Math.max(0,
    hull.buoyancy * (0.2 + 0.8 * integrity) - state.wetness * 0.25 - state.flooding * 0.45);
  const targetHeave =
    (state.buoyancy - 0.85) * 0.25 -
    (1 - integrity) * 0.5 - state.flooding * 0.6 +
    Math.sin(state.elapsed * 5) * water.chop;
  state.verticalVelocity =
    (state.verticalVelocity || 0) +
    (((targetHeave - state.heave) * 18) / hull.mass -
      (state.verticalVelocity || 0) * 4) *
      dt;
  state.heave += state.verticalVelocity * dt;
  state.balance = clamp(1 - tilt / c.capsizeAngle, 0, 1);
  state.sinkTime = state.buoyancy < c.sinkBuoyancy || state.flooding >= 0.95
    ? state.sinkTime + dt : Math.max(0, state.sinkTime - dt * 2);
  if (tilt >= c.capsizeAngle) state.failureReason = "capsized";
  else if (state.sinkTime >= c.sinkGraceSeconds) state.failureReason = "sunk";
  if (state.failureReason) {
    state.deathAxis = Math.abs(state.roll) >= Math.abs(state.pitch) ? "roll" : "pitch";
    state.deathDirection = Math.sign(state[state.deathAxis]) || 1;
    state.speed = state.lateralVelocity = state.yawVelocity = 0;
    state.balance = 0;
    return;
  }
  const drag = hull.drag + (1 - integrity) * 0.6 + state.wetness * 0.25;
  state.speed +=
    (water.forward + c.baseCurrent - state.speed) * (1 - Math.exp(-drag * dt));
  state.lateralVelocity +=
    (water.cross - state.lateralVelocity) *
    (1 - Math.exp((-DECK.lateralDrag / hull.mass) * dt));
  const speed = Math.hypot(state.speed, state.lateralVelocity);
  if (speed > c.maxSpeed) {
    state.speed *= c.maxSpeed / speed;
    state.lateralVelocity *= c.maxSpeed / speed;
  }
  state.steer = state.lateralVelocity / DECK.maxLateralSpeed;
}
/** Authoritative terminal motion, kept in snapshots through the finished phase. */
export function stepWreck(state, dt) {
  if (!state.failureReason) return;
  if (state.failureReason === "capsized") {
    const key = state.deathAxis;
    state[key] += (state.deathDirection * Math.PI - state[key]) * (1 - Math.exp(-dt * 2.3));
  }
  // The overturned bamboo underside remains visible at the surface; a sunk hull disappears.
  const depth = state.failureReason === "sunk" ? -2.8 : 0.34;
  state.heave += (depth - state.heave) * (1 - Math.exp(-dt * 1.3));
  state.speed = state.lateralVelocity = state.yawVelocity = 0;
}
export function impactHull(state, obstacle, speed, stability = 1) {
  const dx = obstacle.lateral - state.lateral,
    forward = obstacle.s - state.s;
  const localX =
    dx * Math.cos(state.heading) - forward * Math.sin(state.heading);
  const localZ =
    -dx * Math.sin(state.heading) - forward * Math.cos(state.heading);
  const corner = (localX >= 0 ? 1 : 0) + (localZ > 0 ? 2 : 0);
  const hull = RAFTS[state.raftId];
  const sign = obstacle.lateral > state.lateral ? 1 : -1;
  state.rollVelocity += (sign * 0.65 * stability) / hull.mass;
  state.pitchVelocity += (0.28 * stability) / hull.mass;
  state.yawVelocity += (sign * 0.14) / hull.mass;
  let kind = null;
  if (
    state.raftId === "ban-bekas" &&
    obstacle.sharp &&
    state.floats[corner] > 0
  ) {
    state.floats[corner] = 0;
    kind = "puncture";
  } else if (
    state.raftId === "getek-botol" &&
    ["rock", "log"].includes(obstacle.type) &&
    speed > 1.2 &&
    state.floats[corner] > 0.35
  ) {
    state.floats[corner] = 0.35;
    kind = "bottles";
  } else if (
    state.raftId === "drum-biru" &&
    obstacle.type === "rock" &&
    speed > 1.5 &&
    state.floats[corner] > 0.65
  ) {
    state.floats[corner] = 0.65;
    kind = "dent";
  }
  return kind ? { kind, corner } : null;
}

/** Soft circular crew contacts prevent overlapping characters on the walking deck. */
export function resolveCrewContacts(players) {
  for (let pass = 0; pass < 2; pass++)
    for (let i = 0; i < players.length; i++)
      for (let j = i + 1; j < players.length; j++) {
        const a = players[i],
          b = players[j],
          dx = b.x - a.x,
          dz = b.z - a.z,
          distance = Math.hypot(dx, dz),
          spacing = 0.66;
        if (distance >= spacing) continue;
        const nx = distance > 1e-6 ? dx / distance : i % 2 ? 1 : -1,
          nz = distance > 1e-6 ? dz / distance : 0,
          push = (spacing - distance) / 2;
        a.x = clamp(a.x - nx * push, -DECK.halfWidth, DECK.halfWidth);
        a.z = clamp(a.z - nz * push, -DECK.halfLength, DECK.halfLength);
        b.x = clamp(b.x + nx * push, -DECK.halfWidth, DECK.halfWidth);
        b.z = clamp(b.z + nz * push, -DECK.halfLength, DECK.halfLength);
      }
}
