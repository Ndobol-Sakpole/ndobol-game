import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRound } from "../shared/game/round.js";
import { GAME, ANIMALS, TRACK_RULES } from "../shared/game/config.js";
import { canTransition, transition } from "../shared/game/state.js";
import {
  scorePlayer,
  validateResult,
  resultBounds,
  scoringConfig,
} from "../shared/game/scoring.js";
import {
  CatmullRomCurve3,
  Vector3,
} from "../apps/web/vendor/three.module.min.js";
const tracks = ["bengawan", "mahakam"].map((id) =>
  JSON.parse(
    readFileSync(
      new URL(`../apps/web/js/world/tracks/${id}.json`, import.meta.url),
    ),
  ),
);
function crew(track, bots = true) {
  const round = createRound(track);
  for (let i = 0; i < 4; i++) {
    round.addPlayer({ id: `p${i}`, name: `P${i}`, slot: i, bot: bots }).ready =
      true;
  }
  return round;
}
test("state machine permits only documented transitions", () => {
  assert.ok(canTransition("lobby", "countdown"));
  assert.ok(!canTransition("lobby", "results"));
  assert.throws(() => transition({ phase: "running" }, "lobby"));
});
test("score formula and upper bound reject tampered/impossible evidence", () => {
  const legacy = scoringConfig(4);
  assert.equal(scorePlayer({ trash: 2, syncBeats: 3 }, true, legacy), 700);
  const track = tracks[0];
  const result = {
    durationMs: 180000,
    trash: 2,
    syncBeats: 0,
    score: 700,
    completed: true,
  };
  assert.ok(validateResult(result, track, legacy));
  assert.ok(!validateResult({ ...result, score: 701 }, track, legacy));
  assert.ok(!validateResult({ ...result, trash: 99 }, track, legacy));
  assert.ok(!validateResult({ ...result, durationMs: 1 }, track, legacy));
  assert.ok(resultBounds(track, 180).score < 10000);
});
test("all companions are small free modifiers", () => {
  for (const p of Object.values(ANIMALS))
    for (const key of ["reach", "cooldown", "stability"])
      assert.ok(p[key] >= 0.8 && p[key] <= 1.2);
});
for (const track of tracks) {
  test(`${track.id}: canonical physical length matches rendered spline`, () => {
    const curve = new CatmullRomCurve3(
      track.path.map(([x, z]) => new Vector3(x, 0, z)),
      false,
      "catmullrom",
      0.35,
    );
    curve.arcLengthDivisions = 600;
    assert.ok(Math.abs(curve.getLength() - track.length) < 0.001);
  });
  test(`${track.id}: full deterministic bot round reaches results with valid scores`, () => {
    const a = crew(track),
      b = crew(track);
    a.start();
    b.start();
    for (
      let i = 0;
      i < (TRACK_RULES[track.id].limitSeconds + 7) * GAME.tickHz;
      i++
    ) {
      a.step();
      b.step();
      if (a.state.phase === "results") break;
    }
    assert.equal(a.state.phase, "results");
    assert.deepEqual(a.snapshot(), b.snapshot());
    assert.ok(a.state.completed);
    assert.ok(a.state.collected > 0);
    for (const p of a.state.players)
      assert.ok(
        validateResult(
          {
            ...p,
            durationMs: Math.round(a.state.elapsed * 1000),
            completed: a.state.completed,
          },
          track,
        ),
      );
  });
}
test("empty human crew times out and cannot fake position by input", () => {
  const round = crew(tracks[0], false);
  round.start();
  for (let i = 0; i < 6000 && round.state.phase !== "results"; i++)
    round.step();
  assert.equal(round.state.reason, "timeout");
  assert.equal(round.state.completed, false);
  assert.equal(round.state.collected, 0);
});
test("free fart impulses move the raft without a rhythm award", () => {
  const a = crew(tracks[0], false),
    b = crew(tracks[0], false);
  a.start();
  b.start();
  let seq = 0;
  for (let i = 0; i < 700; i++) {
    if (
      a.state.phase === "running" &&
      Math.abs(a.state.elapsed - Math.round(a.state.elapsed)) < 0.02
    )
      for (const p of a.state.players)
        a.queueInput(p.id, { seq: seq++, fart: true, steer: 0, reach: 0 });
    a.step();
    b.step();
  }
  assert.ok(a.state.s > b.state.s + 10);
  assert.equal(a.state.players[0].syncBeats, 0);
  assert.equal(b.state.s, GAME.startDistance);
});

test("side pickup obeys reach and cooldown; trash scores at most once", () => {
  const track = {
    ...tracks[0],
    obstacles: [],
    trash: [
      { s: 15, lateral: 3, type: "bottle" },
      { s: 16, lateral: 3, type: "can" },
      { s: 100, lateral: 3, type: "bag" },
    ],
  };
  const round = crew(track, false);
  round.state.players[0].x = 0.85;
  round.state.players[0].z = 0;
  round.start();
  while (round.state.phase === "countdown") round.step();
  const input = (seq, reach) => {
    round.queueInput("p0", { seq, reach, fart: false, steer: 0 });
    round.step();
  };
  input(0, -1);
  assert.equal(round.state.collected, 0);
  for (let i = 0; i < 40; i++) round.step();
  input(1, 1);
  assert.equal(round.state.collected, 1);
  input(2, 1);
  assert.equal(round.state.collected, 1);
  for (let i = 0; i < 40; i++) round.step();
  input(3, 1);
  assert.equal(round.state.collected, 2);
  assert.equal(round.state.players[0].score, 53);
  for (let i = 0; i < 40; i++) round.step();
  input(4, 1);
  assert.equal(round.state.collected, 2);
  assert.equal(new Set(round.state.picked).size, 2);
});
test("collision slows and rocks the raft without ending a running round", () => {
  const round = crew(
    {
      ...tracks[0],
      trash: [],
      obstacles: [{ s: 15, lateral: 0, radius: 1, type: "rock" }],
    },
    false,
  );
  round.start();
  while (round.state.phase === "countdown") round.step();
  round.state.speed = 4;
  round.step();
  assert.equal(round.state.phase, "running");
  assert.ok(round.state.speed < 2);
  assert.ok(round.state.bump > 0);
  const impacts = round.state.events.filter(
    (e) => e.type === "collision",
  ).length;
  for (let i = 0; i < 10; i++) round.step();
  assert.equal(
    round.state.events.filter((e) => e.type === "collision").length,
    impacts,
  );
});

// Hull/crew physics are deterministic shared rules, never animation-only effects.
const { RAFT_IDS, DECK } = await import("../shared/game/rafts.js");
const { initHull, stepHull, impactHull, walkPlayer, gasImpulse } =
  await import("../shared/game/physics.js");
function hull(raftId = "bambu-polos") {
  return {
    ...initHull(),
    raftId,
    elapsed: 1,
    s: 15,
    lateral: 0,
    speed: 0,
    cohesion: 0,
    players: [{ x: 1.4, z: 0 }],
  };
}
test("crew weight lists a plain raft more than tyres; counterweight recovers it", () => {
  const plain = hull(),
    tyre = hull("ban-bekas");
  plain.players[0].x = tyre.players[0].x = 1.1;
  for (let i = 0; i < 150; i++) {
    stepHull(plain, 1 / 30, GAME);
    stepHull(tyre, 1 / 30, GAME);
  }
  assert.ok(plain.roll < -0.25);
  assert.ok(Math.abs(plain.roll) > Math.abs(tyre.roll) * 1.6);
  plain.players.push({ x: -1.1, z: 0 });
  for (let i = 0; i < 300; i++) stepHull(plain, 1 / 30, GAME);
  assert.ok(Math.abs(plain.roll) < 0.04);
});
test("walking stays on the deck, diagonal speed is normalized, facing wraps", () => {
  const p = { x: 0, z: 0, facing: 0 },
    q = { ...p },
    s = hull();
  walkPlayer(p, { moveX: 1, moveZ: 1, turn: 1 }, s, 1 / 30);
  walkPlayer(q, { moveX: 1, moveZ: 0 }, s, 1 / 30);
  assert.ok(Math.abs(Math.hypot(p.x, p.z) - q.x) < 1e-9);
  for (let i = 0; i < 3000; i++)
    walkPlayer(p, { moveX: 1, moveZ: 1, turn: 1 }, s, 1 / 30);
  assert.ok(
    p.x <= DECK.halfWidth &&
      p.z <= DECK.halfLength &&
      Math.abs(p.facing) <= Math.PI,
  );
});
test("gas direction and crew offset impart momentum and torque, with bounded speed", () => {
  const a = hull(),
    b = hull();
  gasImpulse(a, { x: 1, z: 0, facing: 0 }, GAME);
  gasImpulse(b, { x: 0, z: 1, facing: Math.PI / 2 }, GAME);
  assert.ok(a.speed > 0 && a.yawVelocity < 0);
  assert.ok(b.lateralVelocity > 0 && b.yawVelocity < 0);
  for (let i = 0; i < 100; i++) gasImpulse(a, { x: 0, z: 0, facing: 0 }, GAME);
  assert.equal(a.speed, GAME.maxSpeed);
});
test("sharp contact bursts only the struck tyre; blunt rocks never puncture; damage reduces buoyancy", () => {
  const s = hull("ban-bekas");
  stepHull(s, 1 / 30, GAME);
  const before = s.buoyancy;
  assert.equal(impactHull(s, { s: 16, lateral: 1, type: "rock" }, 4), null);
  assert.deepEqual(s.floats, [1, 1, 1, 1]);
  const sharp = { s: 16, lateral: 1, type: "log", sharp: true };
  assert.deepEqual(impactHull(s, sharp, 3), { kind: "puncture", corner: 1 });
  assert.deepEqual(s.floats, [1, 0, 1, 1]);
  assert.equal(impactHull(s, sharp, 3), null);
  for (let i = 0; i < 90; i++) stepHull(s, 1 / 30, GAME);
  assert.ok(s.buoyancy < before);
  assert.ok(s.roll < 0);
});
test("bottle lashings, drum dents and a soaked mattress have different consequences", () => {
  const bottle = hull("getek-botol"),
    drum = hull("drum-biru"),
    bed = hull("ranjang-hanyut");
  assert.equal(
    impactHull(bottle, { type: "rock", s: 16, lateral: -1 }, 3).kind,
    "bottles",
  );
  assert.equal(
    impactHull(drum, { type: "rock", s: 16, lateral: -1 }, 3).kind,
    "dent",
  );
  assert.ok(bottle.floats[0] < drum.floats[0]);
  for (let i = 0; i < 300; i++) stepHull(bed, 1 / 30, GAME);
  assert.ok(bed.wetness > 0 && bed.wetness <= 1);
});
test("fart cooldown prevents packet spam from increasing thrust", () => {
  const track = { ...tracks[0], obstacles: [], trash: [] },
    a = crew(track, false),
    b = crew(track, false);
  a.start();
  b.start();
  while (a.state.phase === "countdown") {
    a.step();
    b.step();
  }
  for (let i = 0; i < Math.floor(GAME.minFartInterval * GAME.tickHz); i++) {
    a.queueInput("p0", { seq: i, fart: true });
    if (i === 0) b.queueInput("p0", { seq: i, fart: true });
    a.step();
    b.step();
  }
  assert.equal(a.state.speed, b.state.speed);
  assert.equal(a.state.s, b.state.s);
});
for (const track of tracks)
  for (const raftId of RAFT_IDS)
    test(`${track.id}/${raftId}: four bots finish safely within the configured clock`, () => {
      const round = createRound(track, { raftId });
      for (let slot = 0; slot < 4; slot++)
        round.addPlayer({ id: `b${slot}`, name: "Bot", slot, bot: true });
      round.start();
      while (round.state.phase !== "results") round.step();
      assert.ok(round.state.completed);
      assert.ok(Number.isFinite(round.state.roll));
      assert.ok(round.state.elapsed <= TRACK_RULES[track.id].limitSeconds);
      for (const player of round.state.players)
        assert.ok(
          validateResult(
            {
              ...player,
              durationMs: Math.round(round.state.elapsed * 1000),
              completed: true,
            },
            track,
          ),
        );
    });

const { sampleCurrent } = await import("../shared/game/water.js");
const { createLocalRound } = await import("../apps/web/js/game/local.js");
test("solo defaults to one human and has no propulsion without fart input", () => {
  const r = createLocalRound({ ...tracks[0], obstacles: [] });
  assert.equal(r.state.players.length, 1);
  r.start();
  for (let i = 0; i < 800; i++) r.step();
  assert.equal(r.state.s, GAME.startDistance);
  assert.equal(r.state.lateral, 0);
  assert.equal(r.state.speed, 0);
  assert.equal(
    createLocalRound(tracks[0], { bots: true }).state.players.length,
    4,
  );
});
test("all four facing directions push forward while exhaust points backward, independent of beat", () => {
  for (const facing of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
    const s = hull();
    gasImpulse(s, { facing, x: 0, z: 0 }, GAME);
    assert.ok(
      Math.abs(s.lateralVelocity - Math.sin(facing) * DECK.gasImpulse) < 1e-9,
    );
    assert.ok(Math.abs(s.speed - Math.cos(facing) * DECK.gasImpulse) < 1e-9);
  }
  const a = hull(),
    b = hull();
  a.cohesion = 1;
  b.cohesion = 0;
  gasImpulse(a, { facing: 0.7, x: 0, z: 0 }, GAME);
  gasImpulse(b, { facing: 0.7, x: 0, z: 0 }, GAME);
  assert.equal(a.speed, b.speed);
});
test("Progo has three smooth rapids; current moves a stationary hull only inside rapid sections", () => {
  const progo = tracks[1];
  assert.equal(progo.rapids.length, 3);
  for (const z of progo.rapids) {
    assert.equal(sampleCurrent(progo, z.start).strength, 0);
    assert.equal(sampleCurrent(progo, z.end).strength, 0);
    assert.equal(sampleCurrent(progo, z.start + 7).strength, 1);
  }
  const calm = hull(),
    rapid = hull();
  rapid.s = 80;
  for (let i = 0; i < 100; i++) {
    stepHull(calm, 1 / 30, GAME, progo);
    stepHull(rapid, 1 / 30, GAME, progo);
  }
  assert.equal(calm.speed, 0);
  assert.ok(rapid.speed > 1.5);
  assert.ok(rapid.rapid > 0);
});
test("obstacles resolve penetration on every tick even during feedback cooldown", () => {
  const track = {
      ...tracks[0],
      trash: [],
      obstacles: [{ type: "rock", s: 35, lateral: 0, radius: 2 }],
    },
    r = crew(track, false);
  r.start();
  while (r.state.phase === "countdown") r.step();
  for (let i = 0; i < 10; i++) {
    r.state.s = 34;
    r.state.lateral = 0.5;
    r.state.speed = 4;
    r.step();
    assert.ok(Math.hypot(r.state.s - 35, r.state.lateral) >= 4.149);
  }
});
test("all hulls retain finite bounded physics during arbitrary 360 degree inputs and rapids", () => {
  for (const raftId of RAFT_IDS) {
    const r = createRound(tracks[1], { raftId });
    r.addPlayer({ id: "p", name: "test", slot: 0 }).ready = true;
    r.start();
    for (let i = 0; i < 2500; i++) {
      r.queueInput("p", {
        seq: i,
        fart: i % 12 === 0,
        turn: i % 300 < 150 ? 1 : -1,
        moveX: i % 200 < 100 ? 1 : -1,
        moveZ: i % 120 < 60 ? 1 : -1,
      });
      r.step();
      for (const key of [
        "s",
        "speed",
        "roll",
        "pitch",
        "heave",
        "heading",
        "lateralVelocity",
      ])
        assert.ok(Number.isFinite(r.state[key]));
      assert.ok(Math.abs(r.state.roll) <= DECK.maxRoll);
      assert.ok(r.state.s >= 3);
    }
  }
});

test("rotating the entire hull rotates propulsion but preserves local recoil and torque", () => {
  const a = hull(),
    b = hull();
  b.heading = Math.PI / 2;
  const p = { x: 0.8, z: 0.4, facing: 0.3 };
  gasImpulse(a, p, GAME);
  gasImpulse(b, p, GAME);
  assert.ok(Math.abs(a.speed - b.lateralVelocity) < 1e-9);
  assert.ok(Math.abs(a.lateralVelocity + b.speed) < 1e-9);
  assert.equal(a.yawVelocity, b.yawVelocity);
  assert.equal(a.rollVelocity, b.rollVelocity);
  assert.equal(a.pitchVelocity, b.pitchVelocity);
});

test("pickup follows the character hand side after a 90 degree turn", () => {
  const track = {
    ...tracks[0],
    obstacles: [],
    trash: [
      { s: 17, lateral: 0, type: "bottle" },
      { s: 13, lateral: 0, type: "can" },
    ],
  };
  const r = createLocalRound(track);
  r.start();
  while (r.state.phase === "countdown") r.step();
  r.state.players[0].facing = Math.PI / 2;
  r.queueInput("local-player", { seq: 0, reach: -1 });
  r.step();
  assert.deepEqual(r.state.picked, [0]);
  for (let i = 0; i < 40; i++) r.step();
  r.queueInput("local-player", { seq: 1, reach: 1 });
  r.step();
  assert.deepEqual(r.state.picked, [0, 1]);
});

const { rewardWei, trashMass, formatMon } = await import("../shared/game/rewards.js");
test("weight determines points and exact MON; finish bonuses never inflate payout", () => {
  assert.equal(rewardWei(1000), "10000000000000");
  assert.equal(formatMon(rewardWei(15000)), "0.00015");
  assert.equal(scorePlayer({ weightGrams: 53 }, true), 53);
  assert.equal(scorePlayer({ weightGrams: 53 }, false), 53);
  assert.equal(rewardWei(15000, "capsized"), "0");
  assert.equal(rewardWei(15000, "sunk"), "0");
  assert.throws(() => rewardWei(1.2));
  assert.throws(() => rewardWei(-1));
  const track = tracks[0], mass = trashMass(track.trash[0]);
  const r = { durationMs: 10000, trash: 1, syncBeats: 0, picked: [0],
    weightGrams: mass, score: mass, completed: false, reason: "sunk", rewardWei: "0" };
  assert.ok(validateResult(r, track));
  assert.ok(!validateResult({ ...r, rewardWei: rewardWei(mass) }, track));
  assert.ok(!validateResult({ ...r, weightGrams: 15000, score: 15000 }, track));
  assert.ok(!validateResult({ ...r, picked: [0, 0], trash: 2 }, track));
});
test("overturned hull kills the crew once, forfeits rewards, rejects input and stays overturned", () => {
  const track = { ...tracks[0], obstacles: [], trash: [{ s: 15, lateral: 1, type: "bottle" }] };
  const r = createLocalRound(track);
  r.start();
  while (r.state.phase === "countdown") r.step();
  r.queueInput("local-player", { seq: 1, reach: 1 }); r.step();
  assert.equal(r.state.players[0].weightGrams, 35);
  assert.ok(BigInt(r.state.rewardWei) > 0n);
  r.state.roll = GAME.capsizeAngle + 0.01; r.step();
  assert.equal(r.state.reason, "capsized");
  assert.equal(r.state.phase, "finished");
  assert.ok(r.state.players.every(p => !p.alive));
  assert.equal(r.state.rewardWei, "0");
  assert.equal(r.state.players[0].rewardWei, "0");
  assert.equal(r.queueInput("local-player", { seq: 2, fart: true }), false);
  assert.equal(r.consumeFinish(), true);
  assert.equal(r.consumeFinish(), false);
  while (r.state.phase !== "results") r.step();
  assert.ok(Math.abs(r.state.roll) > 3.1);
  assert.ok(!r.state.completed);
});
test("four punctured tyres sink after grace; one tyre remains recoverable", () => {
  const a = hull("ban-bekas"), b = hull("ban-bekas");
  a.players[0].x = b.players[0].x = 0;
  a.floats = [0, 0, 0, 0]; b.floats = [1, 0, 1, 1];
  for (let i = 0; i < 70; i++) { stepHull(a, 1 / 30, GAME); stepHull(b, 1 / 30, GAME); }
  assert.equal(a.failureReason, null);
  for (let i = 0; i < 180; i++) { stepHull(a, 1 / 30, GAME); stepHull(b, 1 / 30, GAME); }
  assert.equal(a.failureReason, "sunk");
  assert.ok(a.heave < -2);
  assert.equal(b.failureReason, null);
});
test("holding a plain raft's edge can capsize; walking back early saves it", () => {
  const unsafe = createLocalRound({ ...tracks[0], obstacles: [] }), safe = createLocalRound({ ...tracks[0], obstacles: [] });
  for (const r of [unsafe, safe]) { r.start(); while (r.state.phase === "countdown") r.step(); }
  for (let i = 0; i < 400; i++) {
    unsafe.queueInput("local-player", { seq: i, moveX: 1 }); unsafe.step();
    safe.queueInput("local-player", { seq: i, moveX: i < 12 ? 1 : i < 24 ? -1 : 0 }); safe.step();
  }
  assert.equal(unsafe.state.reason, "capsized");
  assert.equal(safe.state.reason, null);
  assert.ok(Math.abs(safe.state.roll) < 0.1);
});
test("disconnected autopilot does not collect reward-bearing litter for the human", () => {
  const r = createLocalRound({ ...tracks[0], obstacles: [], trash: [{ type: "bottle", s: 15, lateral: 1 }] });
  r.start(); while (r.state.phase === "countdown") r.step();
  r.setConnected("local-player", false);
  for (let i = 0; i < 90; i++) r.step();
  assert.equal(r.state.players[0].weightGrams, 0);
  assert.equal(r.state.players[0].rewardWei, "0");
});

test("held thrust survives between packets, releases immediately and expires on lost input", () => {
  const r=createLocalRound(tracks[0],{animal:"dog"});r.start();
  while(r.state.phase==="countdown") r.step();
  r.queueInput("local-player",{seq:0,fart:true});r.step();
  assert.equal(r.state.players[0].thrustActive,true);
  for(let i=0;i<4;i++)r.step();
  assert.equal(r.state.players[0].thrustActive,true);
  r.queueInput("local-player",{seq:1,fart:false});r.step();
  assert.equal(r.state.players[0].thrustActive,false);
  r.queueInput("local-player",{seq:2,fart:true});
  for(let i=0;i<20;i++)r.step();
  assert.equal(r.state.players[0].thrustActive,false);
});
