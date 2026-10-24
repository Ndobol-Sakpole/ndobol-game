import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { createApiServer } from "../services/api/server.js";
import { createRoomManager } from "../services/api/rooms/manager.js";
import { createInterpolator } from "../apps/web/js/net/interpolation.js";
import { GAME } from "../shared/game/config.js";
import { tracks } from "../services/api/rooms/tracks.js";
import { connect, createRoom, startRoom, drive, flush } from "./helpers.js";
async function fixture(t, roomOptions = {}) {
  const api = createApiServer({ walletRequired: false,
    signing: { privateKey: null },
    roomOptions: {
      manual: true,
      config: { ...GAME, inputRate: 1e6 },
      ...roomOptions,
    },
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  t.after(() => api.dispose());
  return { api, url: `ws://127.0.0.1:${api.address().port}/rooms` };
}
for (const trackId of ["bengawan", "mahakam"])
  for (const count of [2, 3, 4])
    test(`${count} WebSocket clients complete ${trackId}, identical results persisted`, async (t) => {
      const { api, url } = await fixture(t),
        clients = await createRoom(url, count, trackId);
      t.after(() => clients.forEach((c) => c.close()));
      await startRoom(clients);
      const room = api.roomServer.rooms.get(clients[0].joined.code),
        sequences = clients.map(() => 0);
      for (
        let tick = 0;
        room.round.state.phase !== "results" && tick < 8000;
        tick++
      ) {
        const state = room.round.state;
        if (state.phase === "running")
          for (let i = 0; i < clients.length; i++)
            clients[i].send("input", {
              roundId: state.roundId,
              seq: sequences[i]++,
              ...drive(state, tracks[trackId], i),
            });
        await flush();
        api.roomServer.step();
      }
      assert.equal(room.round.state.phase, "results");
      assert.equal(room.round.state.completed, true);
      assert.equal(room.persistence.saved, true);
      api.roomServer.broadcast(room);
      await flush();
      const expected = room.round.snapshot();
      for (const c of clients) {
        const result = await c.wait(
          "snapshot",
          (p) => p.state.phase === "results",
        );
        assert.deepEqual(result.state, expected);
      }
      assert.equal(
        api.store.db.prepare("SELECT count(*) AS n FROM round_players").get().n,
        4,
      );
      assert.equal(api.store.leaderboard(trackId).length, count);
      const stored = api.store.db
        .prepare("SELECT raft_id,rules_version,hull_json FROM rounds")
        .get();
      assert.equal(stored.raft_id, expected.raftId);
      assert.equal(stored.rules_version, 5);
      assert.deepEqual(JSON.parse(stored.hull_json).floats, expected.floats);
    });
test("reconnect restores identity, input ack and crew slot; bots take over during absence", async (t) => {
  const { api, url } = await fixture(t),
    clients = await createRoom(url);
  t.after(() => clients.forEach((c) => c.close()));
  await startRoom(clients);
  const original = clients[1].joined,
    room = api.roomServer.rooms.get(original.code);
  for (let i = 0; i < 125; i++) api.roomServer.step();
  clients[1].send("input", {
    roundId: room.round.state.roundId,
    seq: 17,
    fart: true,
    turn: 1,
    reach: 0,
  });
  await flush();
  api.roomServer.step();
  clients[1].close();
  await delay(15);
  assert.equal(room.round.state.players[1].connected, false);
  for (let i = 0; i < 30; i++) api.roomServer.step();
  assert.ok(room.round.state.players[1].lastFart >= 0);
  const resumed = await connect(url);
  clients.push(resumed);
  resumed.send("resume", { code: original.code, token: original.token });
  const joined = await resumed.wait("joined");
  assert.equal(joined.slot, original.slot);
  assert.equal(joined.playerId, original.playerId);
  assert.equal(joined.lastSeq, 17);
  resumed.send("input", {
    roundId: room.round.state.roundId,
    seq: 18,
    fart: false,
    turn: 0,
    reach: 0,
  });
  await flush();
  assert.equal(room.round.state.players[1].lastSeq, 18);
});
test("empty-room cleanup, expired sessions, host handover and ready reset", () => {
  let now = 0;
  const manager = createRoomManager({ now: () => now }),
    make = () => ({
      messages: [],
      send(type, payload) {
        this.messages.push({ type, payload });
      },
    }),
    a = make(),
    b = make();
  manager.handle(a, "create", {
    name: "A",
    animal: "duck",
    trackId: "bengawan",
  });
  const joined = a.messages.find((m) => m.type === "joined").payload;
  manager.handle(b, "join", {
    name: "B",
    animal: "buffalo",
    code: joined.code,
  });
  manager.handle(a, "ready", { ready: true });
  manager.handle(a, "animal", { animal: "proboscis" });
  const room = manager.rooms.get(joined.code);
  assert.equal(room.round.state.players[0].ready, false);
  manager.disconnect(a);
  assert.equal(room.hostId, room.round.state.players[1].id);
  now = GAME.reconnectMs + 1;
  assert.throws(
    () =>
      manager.handle(make(), "resume", {
        code: joined.code,
        token: joined.token,
      }),
    /RECONNECT_EXPIRED/,
  );
  manager.disconnect(b);
  now += GAME.emptyRoomMs + 1;
  manager.sweep();
  assert.equal(manager.rooms.size, 0);
});
test("network rejects bad protocol, forged state, excess players and unresponsive heartbeat", async (t) => {
  const { api, url } = await fixture(t, {
      config: {
        ...GAME,
        inputRate: 1e6,
        heartbeatMs: 20,
        heartbeatTimeoutMs: 70,
      },
    }),
    clients = await createRoom(url, 4);
  t.after(() => clients.forEach((c) => c.close()));
  const extra = await connect(url);
  clients.push(extra);
  extra.send("join", {
    name: "Fifth",
    animal: "duck",
    code: clients[0].joined.code,
  });
  assert.equal((await extra.wait("error")).code, "ROOM_FULL");
  extra.ws.send(JSON.stringify({ v: 1, type: "input", payload: {} }));
  assert.equal(
    (await extra.wait("error", (p) => p.code === "PROTOCOL_VERSION")).code,
    "PROTOCOL_VERSION",
  );
  extra.ws.send(
    JSON.stringify({ v: 4, type: "input", payload: { score: 999999 } }),
  );
  assert.equal(
    (await extra.wait("error", (p) => p.code === "INVALID_MESSAGE")).code,
    "INVALID_MESSAGE",
  );
  const silent = await connect(url, { autoPong: false });
  clients.push(silent);
  await once(silent.ws, "close");
  assert.equal(silent.ws.readyState, 3);
  assert.equal(api.roomServer.rooms.size, 1);
});
test("interpolation at 100–150ms RTT + 15ms jitter stays bounded, monotonic, and converges", () => {
  const renderers = [createInterpolator(), createInterpolator()],
    pending = [[], []],
    last = [0, 0],
    deltas = [];
  let worst = 0;
  for (let ms = 0; ms <= 12000; ms += 10) {
    if (ms % 70 === 0) {
      const state = {
        roundId: "latency",
        tick: ms,
        phase: ms < 11500 ? "running" : "results",
        s: 10 + (ms / 1000) * 3,
        lateral: 0,
        speed: 3,
        turn: 0,
        bump: 0,
        elapsed: ms / 1000,
        beat: ms / 1000,
        players: [],
      };
      for (let i = 0; i < 2; i++)
        pending[i].push({
          at: ms + [50, 75][i] + Math.sin(ms) * 15,
          time: ms,
          state,
        });
    }
    const poses = [];
    for (let i = 0; i < 2; i++) {
      while (pending[i][0]?.at <= ms) {
        const f = pending[i].shift();
        renderers[i].push(f.state, f.time);
      }
      const s = renderers[i].sample(ms);
      if (s) {
        assert.ok(s.s >= last[i] - 1e-6);
        deltas.push(s.s - last[i]);
        last[i] = s.s;
        poses.push(s.s);
      }
    }
    if (poses.length === 2 && ms > 200 && ms < 11500)
      worst = Math.max(worst, Math.abs(poses[0] - poses[1]));
  }
  assert.ok(worst < 0.12, `two-client drift ${worst}m`);
  assert.ok(Math.abs(last[0] - last[1]) < 0.22);
  // Packet starvation never extrapolates more than the configured 100ms.
  const frozen = renderers[0].sample(60000);
  assert.ok(frozen.s <= last[0] + 0.3);
});

test("real WebSocket transport with injected 100/150ms RTT preserves close render poses", async (t) => {
  const { api, url } = await fixture(t, { manual: false, config: GAME }),
    clients = await createRoom(url, 2),
    renderers = [createInterpolator(), createInterpolator()],
    timers = new Set(),
    seq = [0, 0],
    last = [0, 0];
  t.after(() => {
    for (const timer of timers) clearTimeout(timer);
    clients.forEach((c) => c.close());
  });
  let invalidUntil = 0, delayedPackets = 0, maxTimerLateness = 0;
  function later(ms, fn) {
    const due = Date.now() + ms;
    const timer = setTimeout(() => {
      timers.delete(timer);
      const lateness = Math.max(0, Date.now() - due);
      maxTimerLateness = Math.max(maxTimerLateness, lateness);
      // A stalled test host did not deliver the promised 100/150ms RTT.
      // Let the two snapshot buffers refill before measuring that latency case.
      if (lateness > 20) { delayedPackets++; invalidUntil = Date.now() + GAME.interpolationMs + 200; }
      fn();
    }, ms);
    timers.add(timer);
  }
  for (let i = 0; i < 2; i++)
    clients[i].ws.on("message", (raw) => {
      const m = JSON.parse(raw);
      if (m.type === "snapshot")
        later([50, 75][i], () =>
          renderers[i].push(m.payload.state, m.payload.serverTime),
        );
    });
  await startRoom(clients);
  let comparisons = 0,
    worst = 0;
  const started = Date.now();
  while (Date.now() - started < 10000) {
    for (let i = 0; i < 2; i++) {
      const s = clients[i].latest?.state;
      if (s?.phase === "running") {
        const packet = {
          roundId: s.roundId,
          seq: seq[i]++,
          ...drive(s, tracks.bengawan),
        };
        later([50, 75][i], () => {
          if (clients[i].ws.readyState === 1) clients[i].send("input", packet);
        });
      }
    }
    const sampleTime = Date.now();
    const states = renderers.map((r) => r.sample(sampleTime));
    if (sampleTime >= invalidUntil && states.every((s) => s?.phase === "running")) {
      comparisons++;
      worst = Math.max(worst, Math.abs(states[0].s - states[1].s));
      for (let i = 0; i < 2; i++) {
        assert.ok(states[i].s >= last[i] - 0.15);
        last[i] = states[i].s;
      }
    }
    await delay(35);
  }
  assert.ok(comparisons > 20, `Only ${comparisons} valid timing comparisons; host too stalled for this RTT fixture`);
  assert.ok(worst < 0.55, `render drift ${worst.toFixed(3)}m`);
  const room = api.roomServer.rooms.get(clients[0].joined.code);
  assert.ok(room.round.state.players.slice(0, 2).every((p) => p.lastSeq > 0));
  t.diagnostic(
    `Injected RTT 100/150ms: ${comparisons} valid comparisons, max raft divergence ${worst.toFixed(3)}m; ${delayedPackets} host-delayed deliveries, max timer lateness ${maxTimerLateness}ms`,
  );
});

test("new arrival becomes host after the previous sole host disconnects", () => {
  const manager = createRoomManager(),
    client = () => ({ send() {} }),
    a = client(),
    b = client();
  manager.handle(a, "create", {
    name: "A",
    animal: "duck",
    trackId: "bengawan",
  });
  const room = [...manager.rooms.values()][0],
    old = room.hostId;
  manager.disconnect(a, true);
  manager.handle(b, "join", { name: "B", animal: "duck", code: room.code });
  assert.notEqual(room.hostId, old);
  assert.equal(room.hostId, room.round.state.players[0].id);
});

test("room locks the selected tyre hull; authoritative sharp collision and crew pose survive reconnect", async (t) => {
  const { api, url } = await fixture(t),
    a = await connect(url);
  t.after(() => a.close());
  a.send("create", {
    name: "Tester",
    animal: "dog",
    trackId: "bengawan",
    raftId: "ban-bekas",
  });
  const joined = await a.wait("joined"),
    room = api.roomServer.rooms.get(joined.code);
  assert.equal(room.round.state.raftId, "ban-bekas");
  a.send("ready", { ready: true });
  await a.wait("snapshot", (p) => p.state.players[0]?.ready);
  a.send("start");
  await a.wait("snapshot", (p) => p.state.phase === "countdown");
  while (room.round.state.phase === "countdown") api.roomServer.step();
  // Position a deterministic fixture at the real canonical sharp log; this hook is not exposed over the wire.
  const log = tracks.bengawan.obstacles.find((o) => o.sharp);
  Object.assign(room.round.state, {
    s: log.s,
    lateral: log.lateral - 1,
    speed: 3,
  });
  a.send("input", {
    roundId: room.round.state.roundId,
    seq: 1,
    moveX: 1,
    moveZ: -1,
    turn: 1,
    fart: true,
    reach: 0,
  });
  await flush();
  api.roomServer.step();
  api.roomServer.broadcast(room);
  await flush();
  const seen = await a.wait("snapshot", (p) =>
    p.state.floats.some((v) => v === 0),
  );
  assert.ok(
    seen.state.events.some((e) => e.type === "damage" && e.kind === "puncture"),
  );
  const pose = structuredClone(room.round.state.players[0]),
    floats = [...room.round.state.floats];
  a.close();
  await delay(15);
  const b = await connect(url);
  t.after(() => b.close());
  b.send("resume", { code: joined.code, token: joined.token });
  await b.wait("joined");
  const restored = await b.wait(
    "snapshot",
    (p) => p.state.players[0]?.connected,
  );
  assert.equal(restored.state.raftId, "ban-bekas");
  assert.deepEqual(restored.state.floats, floats);
  assert.equal(restored.state.players[0].x, pose.x);
  assert.equal(restored.state.players[0].facing, pose.facing);
});

test("fatal hull state broadcasts the same death and zero payout, persists once, and resets on replay", async t => {
  const { api, url } = await fixture(t), clients = await createRoom(url, 2);
  t.after(() => clients.forEach(c => c.close()));
  await startRoom(clients);
  const room = api.roomServer.rooms.get(clients[0].joined.code);
  while (room.round.state.phase === "countdown") api.roomServer.step();
  // Server-side fixture: the threshold is authoritative, never a client death assertion.
  room.round.state.roll = GAME.capsizeAngle + 0.02;
  while (room.round.state.phase !== "results") api.roomServer.step();
  api.roomServer.broadcast(room); await flush();
  assert.equal(room.persistence.saved, true);
  for (const client of clients) {
    const { state } = await client.wait("snapshot", p => p.state.phase === "results");
    assert.equal(state.reason, "capsized");
    assert.equal(state.rewardWei, "0");
    assert.ok(state.players.every(p => !p.alive && p.rewardWei === "0"));
  }
  assert.equal(api.store.db.prepare("SELECT count(*) AS n FROM rounds").get().n, 1);
  const previous = room.round.state.roundId;
  clients[0].send("again"); await flush();
  assert.notEqual(room.round.state.roundId, previous);
  assert.equal(room.round.state.phase, "lobby");
  assert.equal(room.round.state.failureReason, null);
  assert.ok(room.round.state.players.every(p => p.alive && p.weightGrams === 0));
});
