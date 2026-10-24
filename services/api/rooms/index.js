import { WebSocketServer, WebSocket } from "ws";
import { performance } from "node:perf_hooks";
import { GAME } from "../../../shared/game/config.js";
import { PROTOCOL_VERSION, isMessage } from "../../../shared/messages.js";
import { createRoomManager } from "./manager.js";
export function attachRooms(
  server,
  { config = GAME, persist, manual = false, allowedOrigins = [], authenticate } = {},
) {
  const wss = new WebSocketServer({
    noServer: true,
    maxPayload: 4096,
    perMessageDeflate: false,
  });
  const manager = createRoomManager({ config, persist, requireWallet: Boolean(authenticate) });
  server.on("upgrade", (req, socket, head) => {
    if (
      new URL(req.url, "http://localhost").pathname !== "/rooms" ||
      (req.headers.origin &&
        allowedOrigins.length &&
        !allowedOrigins.includes(req.headers.origin))
    ) {
      socket.end("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      return;
    }
    if (wss.clients.size >= config.maxConnections) {
      socket.end("HTTP/1.1 503 Service Unavailable\r\n\r\n");
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) =>
      wss.emit("connection", ws, req),
    );
  });
  wss.on("connection", (ws, req) => {
    let handshake = false,
      lastSeen = Date.now(),
      rateAt = Date.now(),
      count = 0,
      violations = 0;
    function sendEncoded(encoded) {
      if (ws.readyState !== WebSocket.OPEN) return;
      if (ws.bufferedAmount > 262144) {
        ws.close(1013, "Slow consumer");
        return;
      }
      ws.send(encoded);
    }
    const client = {
      sendEncoded,
      send(type, payload) {
        sendEncoded(JSON.stringify({ v: PROTOCOL_VERSION, type, payload }));
      },
      close() {
        ws.close(1001, "Server shutdown");
      },
    };
    const helloTimer = setTimeout(() => {
      if (!handshake) ws.close(1008, "Handshake required");
    }, 5000);
    helloTimer.unref();
    const heartbeat = setInterval(() => {
      if (Date.now() - lastSeen > config.heartbeatTimeoutMs) ws.terminate();
      else if (ws.readyState === WebSocket.OPEN) ws.ping();
    }, config.heartbeatMs);
    heartbeat.unref();
    ws.on("pong", () => {
      lastSeen = Date.now();
    });
    ws.on("message", (bytes, binary) => {
      lastSeen = Date.now();
      if (Date.now() - rateAt >= 1000) {
        rateAt = Date.now();
        count = 0;
      }
      if (++count > config.inputRate) {
        if (++violations > 3) ws.close(1008, "Rate limit");
        return;
      }
      let m;
      try {
        if (binary) throw Error();
        m = JSON.parse(bytes.toString());
      } catch {
        ws.close(1007, "Invalid JSON");
        return;
      }
      if (!isMessage(m, "client")) {
        client.send("error", {
          code:
            m?.v !== PROTOCOL_VERSION ? "PROTOCOL_VERSION" : "INVALID_MESSAGE",
          message: "Unsupported protocol or invalid payload",
        });
        if (++violations > 3) ws.close(1008, "Invalid messages");
        return;
      }
      if (m.type === "hello") {
        if (handshake) {
          ws.close(1008, "Duplicate handshake");
          return;
        }
        client.wallet = authenticate?.(m.payload.authToken, req.headers.origin) || null;
        handshake = true;
        clearTimeout(helloTimer);
        client.send("welcome", {
          protocol: PROTOCOL_VERSION,
          serverTime: Date.now(),
          heartbeatMs: config.heartbeatMs,
        });
        return;
      }
      if (!handshake) {
        ws.close(1008, "Handshake required");
        return;
      }
      if (m.type === "ping") {
        client.send("pong", {
          clientTime: m.payload.clientTime,
          serverTime: Date.now(),
        });
        return;
      }
      try {
        manager.handle(client, m.type, m.payload);
      } catch (error) {
        client.send("error", {
          code: error.code || "REQUEST_REJECTED",
          message: error.code || "Request rejected",
        });
      }
    });
    ws.on("error", () => {});
    ws.on("close", () => {
      clearTimeout(helloTimer);
      clearInterval(heartbeat);
      manager.disconnect(client);
    });
  });
  let timer,
    previous = performance.now(),
    accumulator = 0,
    lastSnapshot = previous;
  const stats = { ticks: 0, overruns: 0, maxStepMs: 0, droppedMs: 0 };
  if (!manual)
    timer = setInterval(
      () => {
        const now = performance.now();
        const elapsed = now - previous;
        if (elapsed > config.maxCatchUpMs) {
          stats.overruns++;
          stats.droppedMs += elapsed - config.maxCatchUpMs;
        }
        accumulator += Math.min(elapsed, config.maxCatchUpMs);
        previous = now;
        let count = 0;
        while (
          accumulator >= 1000 / config.tickHz &&
          count++ < Math.ceil((config.maxCatchUpMs / 1000) * config.tickHz)
        ) {
          const start = performance.now();
          manager.step(false);
          stats.maxStepMs = Math.max(
            stats.maxStepMs,
            performance.now() - start,
          );
          stats.ticks++;
          accumulator -= 1000 / config.tickHz;
        }
        if (accumulator >= 1000 / config.tickHz) {
          stats.overruns++;
          ((accumulator = 0), (lastSnapshot = previous));
        }
        if (now - lastSnapshot >= 1000 / config.snapshotHz) {
          manager.snapshots();
          lastSnapshot +=
            Math.floor((now - lastSnapshot) / (1000 / config.snapshotHz)) *
            (1000 / config.snapshotHz);
        }
        manager.sweep();
      },
      Math.max(1, Math.floor(1000 / config.tickHz)),
    );
  timer?.unref();
  return {
    ...manager,
    stats,
    wss,
    close() {
      clearInterval(timer);
      manager.close();
      for (const ws of wss.clients) ws.terminate();
      wss.close();
    },
  };
}
