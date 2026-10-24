import { WebSocket } from "ws";
import { once } from "node:events";
import { setImmediate as immediate } from "node:timers/promises";
import { message } from "../shared/messages.js";
export async function flush() {
  await immediate();
  await immediate();
  await immediate();
}
export async function connect(url, options = {}) {
  const { authToken, ...socketOptions } = options;
  const ws = new WebSocket(url, socketOptions),
    messages = [],
    waiters = new Set();
  let latest = null,
    bytes = 0;
  ws.on("message", (raw) => {
    bytes += raw.length;
    const m = JSON.parse(raw);
    messages.push(m);
    if (messages.length > 30) messages.shift();
    if (m.type === "snapshot") latest = m.payload;
    for (const w of [...waiters])
      if (w.type === m.type && w.predicate(m.payload)) {
        clearTimeout(w.timer);
        waiters.delete(w);
        w.resolve(m.payload);
      }
  });
  ws.on("error", () => {});
  await once(ws, "open");
  const api = {
    ws,
    messages,
    get latest() {
      return latest;
    },
    get bytes() {
      return bytes;
    },
    send(type, payload = {}) {
      ws.send(JSON.stringify(message(type, payload)));
    },
    wait(type, predicate = () => true) {
      const found = [...messages]
        .reverse()
        .find((m) => m.type === type && predicate(m.payload));
      if (found) return Promise.resolve(found.payload);
      return new Promise((resolve, reject) => {
        const w = {
          type,
          predicate,
          resolve,
          timer: setTimeout(() => {
            waiters.delete(w);
            reject(new Error(`Timeout: ${type}`));
          }, 5000),
        };
        waiters.add(w);
      });
    },
    close() {
      ws.terminate();
      for (const w of waiters) {
        clearTimeout(w.timer);
        w.resolve(null);
      }
      waiters.clear();
    },
  };
  api.send("hello", { protocol: 4, ...(authToken ? { authToken } : {}) });
  await api.wait("welcome");
  return api;
}
export async function createRoom(
  url,
  count = 2,
  trackId = "bengawan",
  address = null,
) {
  const clients = [];
  for (let i = 0; i < count; i++) {
    const c = await connect(url);
    clients.push(c);
    const profile = {
      name: `Pemain ${i + 1}`,
      animal: ["duck", "buffalo", "proboscis"][i % 3],
      address: i === 0 ? address : null,
    };
    c.send(
      i ? "join" : "create",
      i
        ? { ...profile, code: clients[0].joined.code }
        : { ...profile, trackId },
    );
    c.joined = await c.wait("joined");
    c.send("ready", { ready: true });
  }
  await clients[0].wait(
    "snapshot",
    (p) =>
      p.state.players.length === count && p.state.players.every((v) => v.ready),
  );
  return clients;
}
export async function startRoom(clients) {
  clients[0].send("start");
  return clients[0].wait("snapshot", (p) => p.state.phase === "countdown");
}
export function drive(state, track, slot = 0) {
  const obstacle = track.obstacles.find(
    (o) =>
      o.s > state.s - 2 &&
      o.s - state.s < 11 &&
      Math.abs(o.lateral - state.lateral) < o.radius + 2,
  );
  const target = obstacle
    ? obstacle.lateral + (obstacle.lateral > 0 ? -1 : 1) * (obstacle.radius + 3)
    : 0;
  const player = state.players.find(p => p.slot === slot) || state.players[0];
  const homeX = (player.slot % 2 ? 0.85 : -0.85) - (state.loadX || 0) * 0.8 + (state.roll || 0) * 0.8;
  const homeZ = (player.slot < 2 ? -0.85 : 0.85) - (state.loadZ || 0) * 0.6;
  return {
    fart: Math.abs(state.elapsed - Math.round(state.elapsed)) < 0.025,
    moveX: Math.abs(homeX - player.x) > 0.12 ? Math.sign(homeX - player.x) : 0,
    moveZ: Math.abs(homeZ - player.z) > 0.12 ? Math.sign(homeZ - player.z) : 0,
    turn: (() => {
      const desired = Math.atan2(
          (target - state.lateral) * 0.9 - (state.lateralVelocity || 0) * 1.2,
          4,
        ),
        p = player,
        a = desired - (state.heading || 0) - (p.facing || 0),
        delta = Math.atan2(Math.sin(a), Math.cos(a));
      return Math.abs(delta) > 0.08 ? Math.sign(delta) : 0;
    })(),
    reach: Math.floor(state.elapsed) % 2 ? -1 : 1,
  };
}
