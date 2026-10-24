import { GAME, ANIMALS, TRACK_RULES, clamp } from "./config.js";
import { transition } from "./state.js";
import { DEFAULT_RAFT, RAFTS, wrapAngle } from "./rafts.js";
import {
  resolveCrewContacts,
  initHull,
  walkPlayer,
  gasImpulse,
  stepHull,
  impactHull,
  stepWreck,
} from "./physics.js";
import { scorePlayer } from "./scoring.js";
import { trashMass, rewardWei, isFatal } from "./rewards.js";

export function createRound(
  track,
  {
    roundId = "local",
    config = GAME,
    mode = "local",
    raftId = DEFAULT_RAFT,
  } = {},
) {
  if (!Object.hasOwn(RAFTS, raftId)) throw new Error("INVALID_RAFT");
  const c = config;
  const state = {
    roundId,
    rulesVersion: 5,
    raftId,
    ...initHull(),
    trackId: track.id,
    mode,
    phase: "lobby",
    phaseTime: 0,
    tick: 0,
    elapsed: 0,
    limitSeconds: TRACK_RULES[track.id].limitSeconds,
    s: c.startDistance,
    lateral: 0,
    speed: 0,
    steer: 0,
    bump: 0,
    cohesion: 0,
    beat: 0,
    score: 0,
    collected: 0,
    weightGrams: 0,
    rewardWei: "0",
    completed: false,
    reason: null,
    players: [],
    picked: [],
    events: [],
    eventId: 0,
  };
  const input = new Map(),
    collisionTimes = new Map();
  let finishNotified = false;
  function emit(type, data = {}) {
    state.events.push({
      id: ++state.eventId,
      type,
      at: state.elapsed,
      ...data,
    });
    if (state.events.length > c.eventHistory) state.events.shift();
  }
  function addPlayer({
    id,
    name,
    animal = "duck",
    address = null,
    bot = false,
    slot,
    connected = true,
  }) {
    if (
      state.phase !== "lobby" ||
      state.players.length >= c.maxPlayers ||
      !ANIMALS[animal] ||
      state.players.some((p) => p.id === id || p.slot === slot)
    )
      throw new Error("Invalid player");
    const player = {
      id,
      name,
      animal,
      address,
      bot,
      connected,
      slot,
      ready: bot,
      trash: 0,
      weightGrams: 0,
      rewardWei: "0",
      picked: [],
      alive: true,
      syncBeats: 0,
      score: 0,
      lastSeq: -1,
      fartSeq: -1,
      lastFart: -100,
      lastReach: -100,
      lastBeat: -1,
      gas: 0,
      thrustActive: false,
      x: slot % 2 ? 0.85 : -0.85,
      z: slot < 2 ? -0.85 : 0.85,
      facing: 0,
      walk: 0,
    };
    state.players.push(player);
    state.players.sort((a, b) => a.slot - b.slot);
    return player;
  }
  function queueInput(playerId, command) {
    const player = state.players.find((p) => p.id === playerId);
    if (
      !player ||
      state.phase !== "running" ||
      !player.connected ||
      player.bot ||
      command.seq <= player.lastSeq
    )
      return false;
    player.lastSeq = command.seq;
    const previous = input.get(playerId);
    input.set(playerId, {
      ...command,
      fart: Boolean(command.fart),
      reach: command.reach || previous?.reach || 0,
      at: state.elapsed,
    });
    return true;
  }
  function fart(player, seq = player.lastSeq) {
    if (state.elapsed - player.lastFart < c.minFartInterval) return;
    player.lastFart = state.elapsed;
    player.fartSeq = seq;
    player.gas = 1;
    gasImpulse(state, player, c);
    emit("fart", { playerId: player.id, slot: player.slot });
  }

  function reach(player, side) {
    const power = ANIMALS[player.animal];
    if (
      !side ||
      state.elapsed - player.lastReach < c.reachCooldown * power.cooldown
    )
      return;
    player.lastReach = state.elapsed;
    const heading = state.heading,
      direction = heading + player.facing;
    const originX =
      state.lateral +
      player.x * Math.cos(heading) -
      player.z * Math.sin(heading);
    const originS =
      state.s - player.x * Math.sin(heading) - player.z * Math.cos(heading);
    const index = track.trash.findIndex((item, i) => {
      const dx = item.lateral - originX,
        ds = item.s - originS;
      return (
        !state.picked.includes(i) &&
        side * (dx * Math.cos(direction) - ds * Math.sin(direction)) >= -0.35 &&
        Math.hypot(dx, ds) <= c.reach * power.reach
      );
    });
    emit("reach", {
      playerId: player.id,
      slot: player.slot,
      side,
      success: index >= 0,
    });
    if (index < 0) return;
    state.picked.push(index);
    player.picked.push(index);
    const grams = trashMass(track.trash[index]);
    player.weightGrams += grams;
    state.weightGrams += grams;
    player.trash++;
    state.collected++;
    emit("collected", {
      playerId: player.id,
      index,
      trashId: `${track.id}:${index}`,
      slot: player.slot,
      weightGrams: grams,
    });
  }
  function botCommand(player) {
    const shouldFart =
      state.elapsed - player.lastFart >= 0.66 + player.slot * 0.071;
    const trash = track.trash.find(
      (item, i) =>
        !state.picked.includes(i) &&
        item.s >= state.s - 2 &&
        item.s - state.s < 12,
    );
    const obstacle = track.obstacles.find(
      (o) =>
        o.s > state.s - 2 &&
        o.s - state.s < 10 &&
        Math.abs(o.lateral - state.lateral) < o.radius + c.raftRadius + 0.4,
    );
    const target = obstacle
      ? obstacle.lateral +
        (obstacle.lateral > 0 ? -1 : 1) * (obstacle.radius + c.raftRadius + 1.2)
      : trash
        ? trash.lateral
        : 0;
    const desiredFacing = Math.atan2(
      (target - state.lateral) * 0.9 - state.lateralVelocity * 1.2,
      4,
    );
    const angle = wrapAngle(desiredFacing - state.heading - player.facing);
    const homeX =
      (player.slot % 2 ? 0.85 : -0.85) - state.loadX * 0.8 + state.roll * 0.8;
    const homeZ = (player.slot < 2 ? -0.85 : 0.85) - state.loadZ * 0.6;
    return {
      fart: shouldFart,
      moveX:
        Math.abs(homeX - player.x) > 0.12 ? Math.sign(homeX - player.x) : 0,
      moveZ:
        Math.abs(homeZ - player.z) > 0.12 ? Math.sign(homeZ - player.z) : 0,
      turn: Math.abs(angle) > 0.08 ? Math.sign(angle) : 0,
      reach: trash
        ? Math.sign(trash.lateral - state.lateral) || (player.slot % 2 ? 1 : -1)
        : 0,
    };
  }

  function finish(reason) {
    state.reason = reason;
    state.completed = reason === "finish";
    state.speed = 0;
    state.lateralVelocity = 0;
    if (isFatal(reason)) {
      for (const p of state.players) { p.alive = false; p.thrustActive = false; p.gas = 0; p.walk = 0; }
      input.clear();
    }
    transition(state, "finished");
    emit("finished", { reason });
    updateScores();
  }
  function updateScores() {
    for (const p of state.players) {
      p.score = scorePlayer(p, state.completed, c);
      p.rewardWei = p.bot ? "0" : rewardWei(p.weightGrams, state.reason);
    }
    state.score = state.players.reduce((sum, p) => sum + p.score, 0);
    state.rewardWei = String(state.players.reduce((sum, p) => sum + BigInt(p.rewardWei), 0n));
  }
  function step() {
    const dt = 1 / c.tickHz;
    state.tick++;
    state.phaseTime += dt;
    if (state.phase === "countdown") {
      if (state.phaseTime + 1e-6 >= c.countdownSeconds) {
        transition(state, "running");
        emit("running");
      }
      return;
    }
    if (state.phase === "finished") {
      stepWreck(state, dt);
      if (state.phaseTime + 1e-6 >= (isFatal(state.reason) ? c.deathHoldSeconds : c.finishHoldSeconds))
        transition(state, "results");
      return;
    }
    if (state.phase !== "running") return;
    state.elapsed = Math.min(state.limitSeconds, state.elapsed + dt);
    for (const player of state.players) {
      player.gas = Math.max(0, player.gas - dt * 4);
      const isBot =
        player.bot || (!player.connected && c.disconnectedPolicy === "bot");
      let command = isBot ? botCommand(player) : input.get(player.id);
      if (
        !command ||
        (!isBot && (state.elapsed - command.at) * 1000 > c.inputExpiryMs)
      )
        command = { moveX: 0, moveZ: 0, turn: 0, fart: false, reach: 0 };
      player.thrustActive = Boolean(command.fart);
      walkPlayer(player, command, state, dt);
      if (command.fart) fart(player);
      // Reconnect autopilot preserves the slot but cannot farm a human's MON.
      if (command.reach && (player.bot || player.connected)) reach(player, command.reach);
      if (!isBot && input.has(player.id)) {
        input.get(player.id).reach = 0;
      }
    }
    resolveCrewContacts(state.players);
    stepHull(state, dt, c, track);
    if (state.failureReason) { finish(state.failureReason); return; }
    state.s = clamp(
      state.s + state.speed * dt,
      3,
      track.length - c.finishMargin,
    );
    if (state.s <= 3 && state.speed < 0) state.speed = 0;
    const bank = track.width / 2 - c.raftRadius;
    if (Math.abs(state.lateral + state.lateralVelocity * dt) > bank) {
      state.lateralVelocity *= -0.25;
      if (
        state.elapsed - (collisionTimes.get("bank") ?? -100) >
        c.collisionCooldown
      ) {
        collisionTimes.set("bank", state.elapsed);
        state.rollVelocity += Math.sign(state.lateral) * 0.15;
        emit("collision", { index: -1, strength: 0.35 });
      }
    }
    state.lateral = clamp(
      state.lateral + state.lateralVelocity * dt,
      -track.width / 2 + c.raftRadius,
      track.width / 2 - c.raftRadius,
    );
    state.bump *= Math.exp(-dt * c.wobbleDamping);
    for (let i = 0; i < track.obstacles.length; i++) {
      const o = track.obstacles[i];
      const ds = state.s - o.s,
        dx = state.lateral - o.lateral;
      const distance = Math.hypot(ds, dx),
        radius = o.radius + c.raftRadius;
      if (distance >= radius) continue;
      const nx = distance > 1e-6 ? dx / distance : 1;
      const ns = distance > 1e-6 ? ds / distance : 0;
      const impactSpeed = Math.hypot(state.speed, state.lateralVelocity);
      const normalSpeed = state.speed * ns + state.lateralVelocity * nx;
      if (normalSpeed < 0) {
        state.speed -= normalSpeed * ns * 1.18;
        state.lateralVelocity -= normalSpeed * nx * 1.18;
      }
      state.s = clamp(
        state.s + ns * (radius - distance + 0.005),
        3,
        track.length - c.finishMargin,
      );
      state.lateral = clamp(
        state.lateral + nx * (radius - distance + 0.005),
        -bank,
        bank,
      );
      if (state.elapsed - (collisionTimes.get(i) ?? -100) < c.collisionCooldown)
        continue;
      collisionTimes.set(i, state.elapsed);
      const stability =
        state.players.reduce((n, p) => n + ANIMALS[p.animal].stability, 0) /
        state.players.length;
      const damage = impactHull(state, o, impactSpeed, stability);
      if (damage) emit("damage", damage);
      state.speed *= c.collisionSpeedFactor;
      state.bump = stability;
      emit("collision", { index: i, strength: stability });
    }
    updateScores();
    if (state.s >= track.length - c.finishMargin - 1e-6) finish("finish");
    else if (state.elapsed >= state.limitSeconds - 1e-6) finish("timeout");
  }
  return {
    state,
    addPlayer,
    queueInput,
    step,
    start() {
      if (
        state.players.length < (mode === "local" ? 1 : c.minPlayers) ||
        state.players.some((p) => !p.ready)
      )
        throw new Error("NOT_READY");
      transition(state, "countdown");
    },
    setConnected(id, value) {
      const p = state.players.find((p) => p.id === id);
      if (p) {
        p.connected = value;
        input.delete(id);
      }
    },
    snapshot() {
      return structuredClone(state);
    },
    consumeFinish() {
      if (!finishNotified && ["finished", "results"].includes(state.phase)) {
        finishNotified = true;
        return true;
      }
      return false;
    },
  };
}
