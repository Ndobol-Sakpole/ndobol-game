import { randomBytes, randomInt, randomUUID } from "node:crypto";
import { createRound } from "../../../shared/game/round.js";
import { DEFAULT_RAFT } from "../../../shared/game/rafts.js";
import { GAME } from "../../../shared/game/config.js";
import { PROTOCOL_VERSION } from "../../../shared/messages.js";
import { tracks } from "./tracks.js";
import { tokenHash } from "../session-token.js";
export { tokenHash };
export class RoomError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}
const fail = (code) => {
  throw new RoomError(code);
};
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function createRoomManager({
  config = GAME,
  now = Date.now,
  persist = () => {},
  requireWallet = false,
} = {}) {
  const rooms = new Map(),
    memberships = new Map();
  function roomFor(client) {
    const m = memberships.get(client);
    if (!m) fail("NOT_JOINED");
    const room = rooms.get(m.code);
    if (!room) fail("ROOM_NOT_FOUND");
    return { room, member: m };
  }
  function newRound(room) {
    return createRound(tracks[room.trackId], {
      roundId: randomUUID(),
      mode: "online",
      raftId: room.raftId,
      config,
    });
  }
  function broadcast(room) {
    room.lastBroadcastPhase = room.round.state.phase;
    const payload = {
      roomCode: room.code,
      hostId: room.hostId,
      serverTime: now(),
      state: room.round.snapshot(),
      persistence: room.persistence,
    };
    const encoded = JSON.stringify({
      v: PROTOCOL_VERSION,
      type: "snapshot",
      payload,
    });
    for (const m of room.members.values())
      if (m.client) {
        if (m.client.sendEncoded) m.client.sendEncoded(encoded);
        else m.client.send("snapshot", payload);
      }
  }
  function attach(room, client, p, token = randomBytes(32).toString("hex")) {
    const record = {
      code: room.code,
      playerId: p.id,
      tokenHash: tokenHash(token),
      disconnectedAt: null,
      client,
    };
    room.members.set(p.id, record);
    memberships.set(client, record);
    room.emptySince = null;
    client.send("joined", {
      code: room.code,
      playerId: p.id,
      slot: p.slot,
      token,
      lastSeq: p.lastSeq,
    });
    broadcast(room);
    return record;
  }
  function add(room, client, payload) {
    if (room.round.state.phase !== "lobby") fail("ROUND_STARTED");
    if (room.round.state.players.length >= config.maxPlayers) fail("ROOM_FULL");
    const address = requireWallet ? client.wallet : payload.address?.toLowerCase() || null;
    if (requireWallet && payload.address && payload.address.toLowerCase() !== address) fail("WALLET_MISMATCH");
    if (address && room.round.state.players.some((p) => p.address === address))
      fail("ADDRESS_IN_ROOM");
    const slot = [0, 1, 2, 3].find(
      (n) => !room.round.state.players.some((p) => p.slot === n),
    );
    const p = room.round.addPlayer({
      id: randomUUID(),
      name: payload.name.trim(),
      animal: payload.animal,
      address,
      slot,
    });
    if (
      !room.round.state.players.some(
        (player) => player.id === room.hostId && player.connected,
      )
    )
      room.hostId = p.id;
    attach(room, client, p);
  }
  function disconnect(client, permanent = false) {
    const member = memberships.get(client);
    if (!member) return;
    memberships.delete(client);
    member.client = null;
    member.disconnectedAt = permanent ? now() - config.reconnectMs - 1 : now();
    const room = rooms.get(member.code);
    if (!room) return;
    room.round.setConnected(member.playerId, false);
    if (room.hostId === member.playerId)
      room.hostId =
        room.round.state.players.find((p) => p.connected && !p.bot)?.id ||
        member.playerId;
    if (![...room.members.values()].some((m) => m.client))
      room.emptySince ??= now();
    if (permanent && room.round.state.phase === "lobby") {
      room.members.delete(member.playerId);
      room.round.state.players = room.round.state.players.filter(
        (p) => p.id !== member.playerId,
      );
    }
    broadcast(room);
  }
  function handle(client, type, p) {
    if (["create", "join", "resume"].includes(type)) {
      if (requireWallet && !client.wallet) fail("WALLET_REQUIRED");
      if (requireWallet && p.address && p.address.toLowerCase() !== client.wallet) fail("WALLET_MISMATCH");
      if (memberships.has(client)) fail("ALREADY_JOINED");
      if (type === "create") {
        if (rooms.size >= config.maxRooms) fail("ROOM_LIMIT");
        let code;
        do {
          code = Array.from(
            { length: 6 },
            () => alphabet[randomInt(alphabet.length)],
          ).join("");
        } while (rooms.has(code));
        const room = {
          code,
          trackId: p.trackId,
          raftId: p.raftId || DEFAULT_RAFT,
          hostId: null,
          members: new Map(),
          createdAt: now(),
          lastActive: now(),
          emptySince: null,
          persistence: { saved: false, error: null },
        };
        room.round = newRound(room);
        rooms.set(code, room);
        add(room, client, p);
        return;
      }
      const room = rooms.get(p.code);
      if (!room) fail("ROOM_NOT_FOUND");
      if (type === "join") {
        add(room, client, p);
        return;
      }
      const member = [...room.members.values()].find(
        (m) => m.tokenHash === tokenHash(p.token),
      );
      if (!member) fail("INVALID_SESSION");
      if (member.client) fail("SESSION_ACTIVE");
      if (
        member.disconnectedAt === null ||
        now() - member.disconnectedAt > config.reconnectMs
      )
        fail("RECONNECT_EXPIRED");
      const player = room.round.state.players.find(
        (p) => p.id === member.playerId,
      );
      if (!player) fail("RECONNECT_EXPIRED");
      if (requireWallet && player.address !== client.wallet) fail("WALLET_MISMATCH");
      room.round.setConnected(player.id, true);
      attach(room, client, player, p.token);
      return;
    }
    const { room, member } = roomFor(client);
    room.lastActive = now();
    const player = room.round.state.players.find(
      (p) => p.id === member.playerId,
    );
    if (type === "leave") {
      disconnect(client, true);
      client.send("left", {});
      return;
    }
    if (type === "ready" || type === "animal") {
      if (room.round.state.phase !== "lobby") fail("ROUND_STARTED");
      if (type === "ready") player.ready = p.ready;
      else {
        player.animal = p.animal;
        player.ready = false;
      }
      broadcast(room);
      return;
    }
    if (type === "start") {
      if (room.hostId !== player.id) fail("HOST_ONLY");
      if (room.round.state.phase !== "lobby") fail("ROUND_STARTED");
      if (room.round.state.players.some((p) => !p.connected || !p.ready))
        fail("NOT_READY");
      for (let slot = 0; slot < config.maxPlayers; slot++)
        if (!room.round.state.players.some((p) => p.slot === slot))
          room.round.addPlayer({
            id: `bot-${slot}`,
            name: `Bot ${slot + 1}`,
            animal: ["dog", "monkey", "pig", "squirrel"][slot % 4],
            slot,
            bot: true,
          });
      room.round.start();
      broadcast(room);
      return;
    }
    if (type === "input") {
      if (p.roundId !== room.round.state.roundId) fail("STALE_ROUND");
      room.round.queueInput(player.id, p);
      return;
    }
    if (type === "again") {
      if (room.hostId !== player.id) fail("HOST_ONLY");
      if (room.round.state.phase !== "results") fail("ROUND_NOT_FINISHED");
      const humans = room.round.state.players.filter(
        (p) => !p.bot && p.connected,
      );
      room.round = newRound(room);
      room.persistence = { saved: false, error: null };
      for (const old of humans) room.round.addPlayer(old);
      for (const [id, m] of room.members)
        if (!humans.some((p) => p.id === id)) {
          if (m.client) memberships.delete(m.client);
          room.members.delete(id);
        }
      broadcast(room);
      return;
    }
    fail("UNSUPPORTED_MESSAGE");
  }
  let steps = 0;
  function step(sendSnapshots = true) {
    steps++;
    for (const room of rooms.values()) {
      room.round.step();
      if (room.round.consumeFinish()) {
        try {
          const roundId = room.round.state.roundId;
          const pending = persist(
            room.round.snapshot(),
            [...room.members.values()].map((m) => ({
              playerId: m.playerId,
              tokenHash: m.tokenHash,
            })),
          );
          if (pending?.then) {
            room.persistence = { saved: false, saving: true, error: null };
            pending.then(() => {
              if (room.round.state.roundId === roundId) { room.persistence = { saved: true, error: null }; broadcast(room); }
            }).catch(() => {
              if (room.round.state.roundId === roundId) { room.persistence = { saved: false, error: "SAVE_FAILED" }; broadcast(room); }
              console.error("Round persistence failed");
            });
          } else room.persistence = { saved: true, error: null };
        } catch (error) {
          room.persistence = { saved: false, error: "SAVE_FAILED" };
          console.error("Round persistence failed:", error.message);
        }
      }
      if (
        sendSnapshots &&
        steps % Math.max(1, Math.round(config.tickHz / config.snapshotHz)) === 0
      )
        broadcast(room);
    }
  }
  function snapshots() {
    for (const room of rooms.values()) {
      const phase = room.round.state.phase;
      if (
        !["lobby", "results"].includes(phase) ||
        phase !== room.lastBroadcastPhase
      )
        broadcast(room);
    }
  }
  function sweep() {
    for (const [code, room] of rooms) {
      if (room.round.state.phase === "lobby")
        for (const [id, m] of room.members)
          if (!m.client && now() - m.disconnectedAt > config.reconnectMs) {
            room.members.delete(id);
            room.round.state.players = room.round.state.players.filter(
              (p) => p.id !== id,
            );
            broadcast(room);
          }
      const empty =
        room.emptySince !== null &&
        now() - room.emptySince >= config.emptyRoomMs;
      const idle =
        room.round.state.phase === "lobby" &&
        now() - room.lastActive > config.lobbyIdleMs;
      const expired =
        room.round.state.phase === "results" &&
        room.round.state.phaseTime * 1000 > config.resultsRetentionMs;
      if (empty || idle || expired) {
        for (const m of room.members.values())
          if (m.client) {
            memberships.delete(m.client);
            m.client.send("error", {
              code: "ROOM_EXPIRED",
              message: "Room expired",
            });
          }
        rooms.delete(code);
      }
    }
  }
  return {
    rooms,
    handle,
    step,
    sweep,
    snapshots,
    disconnect,
    broadcast,
    close() {
      for (const room of rooms.values())
        for (const m of room.members.values()) m.client?.close?.();
      rooms.clear();
      memberships.clear();
    },
  };
}
