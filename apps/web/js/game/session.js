import { GAME } from "../../../../shared/game/config.js";
import { createLocalRound } from "./local.js";
import { createClient } from "../net/client.js";
import { createInterpolator } from "../net/interpolation.js";
/** Session orchestration owns input/rules/transport. Render modules only consume poses. */
export function createSession({ onState, onEvent, onStatus, onError }) {
  const interpolation = createInterpolator(),
    localInterpolation = createInterpolator({
      delayMs: 1000 / GAME.tickHz,
      maxExtrapolationMs: 0,
    });
  let local = null,
    latest = null,
    meta = {},
    seq = 0,
    accumulator = 0,
    command = { fart: false, reach: 0, moveX: 0, moveZ: 0, turn: 0 },
    lastEvent = 0,
    roundId,
    predicted = null,
    predictedAt = -100000,
    online = false;
  const client = createClient({
    onStatus,
    onMessage(m) {
      if (m.type === "joined") {
        seq = Math.max(seq, m.payload.lastSeq + 1);
        online = true;
      }
      if (m.type === "snapshot") {
        meta = m.payload;
        accept(meta.state);
        interpolation.push(meta.state, meta.serverTime);
        const self = meta.state.players.find(
          (p) => p.id === client.session?.playerId,
        );
        if (predicted && self?.lastSeq >= predicted.seq) predicted = null;
      }
      if (m.type === "error") onError(m.payload.code);
    },
  });
  function accept(state) {
    if (roundId !== state.roundId) {
      roundId = state.roundId;
      lastEvent = state.eventId;
      seq = Math.max(
        0,
        (state.players.find((p) => p.id === client.session?.playerId)
          ?.lastSeq ?? -1) + 1,
      );
      predicted = null;
      predictedAt = -100000;
    }
    latest = state;
    if (local)
      localInterpolation.push(state, (state.tick / GAME.tickHz) * 1000);
    for (const event of state.events)
      if (event.id > lastEvent) {
        onEvent(event);
        lastEvent = event.id;
      }
    onState(state, {
      ...meta,
      playerId: local ? "local-player" : client.session?.playerId,
      online,
    });
  }
  return {
    get state() {
      return latest;
    },
    get client() {
      return client;
    },
    get online() {
      return online;
    },
    async restore() {
      if (client.session) {
        online = true;
        await client.connect();
      }
    },
    solo(track, profile) {
      client.close({ forget: true });
      online = false;
      meta = {};
      interpolation.reset();
      localInterpolation.reset();
      local = createLocalRound(track, profile);
      local.start();
      accumulator = 0;
      accept(local.snapshot());
      onStatus("local");
    },
    async join(type, payload) {
      local = null;
      online = true;
      await client.connect();
      client.send(type, payload);
    },
    send(type, payload) {
      client.send(type, payload);
    },
    leave() {
      client.close({ forget: true });
      local = null;
      latest = null;
      online = false;
      interpolation.reset();
      onStatus("offline");
    },
    update(dt, input) {
      if (!latest) return;
      command.fart ||= input.fart;
      command.reach = input.reach || command.reach;
      command.moveX = input.moveX || 0;
      command.moveZ = input.moveZ || 0;
      command.turn = input.turn || 0;
      accumulator += dt;
      while (accumulator >= 1 / GAME.tickHz) {
        accumulator -= 1 / GAME.tickHz;
        if (latest.phase === "running") {
          const packet = { roundId: latest.roundId, seq: seq++, ...command };
          if (local) local.queueInput("local-player", packet);
          else {
            client.send("input", packet);
            const self = latest.players.find(
              (p) => p.id === client.session?.playerId,
            );
            if (
              packet.fart &&
              latest.elapsed - (self?.lastFart ?? -100) >=
                GAME.minFartInterval - 1 / GAME.tickHz &&
              performance.now() - predictedAt >= GAME.minFartInterval * 1000
            ) {
              predictedAt = performance.now();
              predicted = { seq: packet.seq, at: performance.now() };
              onEvent({ type: "predicted-fart", slot: client.session?.slot });
            }
          }
        }
        command.fart = false;
        command.reach = 0;
        if (local) {
          local.step();
          accept(local.snapshot());
        }
      }
    },
    visual() {
      const state = local
        ? localInterpolation.sample(
            (latest.tick / GAME.tickHz) * 1000 + accumulator * 1000,
          )
        : interpolation.sample(client.serverNow);
      if (!state) return null;
      if (predicted) {
        const p = state.players.find((p) => p.id === client.session?.playerId);
        if (p)
          p.gas = Math.max(p.gas, 1 - (performance.now() - predicted.at) / 250);
      }
      return state;
    },
    rhythm() {
      return (
        latest?.elapsed +
        (online
          ? Math.max(
              0,
              Math.min(
                0.15,
                (client.serverNow - (meta.serverTime || client.serverNow)) /
                  1000,
              ),
            )
          : 0)
      );
    },
  };
}
