import { createWalletAuth } from "./wallet-auth.js";
import { createSupabaseStore } from "../../data/supabase-store.js";
import { PROTOCOL_VERSION } from "../../shared/messages.js";
import http from "node:http";
import { fileURLToPath } from "node:url";
import { attachRooms } from "./rooms.js";
import { createStore } from "../../data/store.js";
import { createSigner, ApiError } from "./signing/index.js";
import { GAME } from "../../shared/game/config.js";
export function createApiServer({
  database = ":memory:",
  persistence,
  walletRequired = true,
  signing = {},
  roomOptions = {},
} = {}) {
  const allowedOrigins = roomOptions.allowedOrigins || ["http://127.0.0.1:4174", "http://localhost:4174"];
  const auth = createWalletAuth();
  const store = persistence || createStore(database),
    signer = createSigner(store, signing);
  const server = http.createServer(async (req, res) => {
    const origin = req.headers.origin;
    const cors = origin && allowedOrigins.includes(origin) ? { "Access-Control-Allow-Origin": origin, "Vary": "Origin" } : {};
    const reply = (status, body) => {
      res.writeHead(status, {
        ...cors,
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(body));
    };
    if (origin && !allowedOrigins.includes(origin)) return reply(403, { error: "ORIGIN_NOT_ALLOWED" });
    if (req.method === "OPTIONS") {
      res.writeHead(204, { ...cors, "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "Content-Type,Authorization", "Access-Control-Max-Age": "600" });
      res.end(); return;
    }
    const url = new URL(req.url, "http://localhost"),
      route = url.pathname,
      token = req.headers.authorization?.replace(/^Bearer /, "");
    try {
      if (req.method === "GET" && route === "/health")
        return reply(200, {
          ok: true,
          phase: 2,
          protocol: PROTOCOL_VERSION,
          signing: signer.enabled,
          rooms: server.roomServer.rooms.size,
          tickHz: GAME.tickHz,
        });
      if (req.method === "GET" && route === "/rewards/config")
        return reply(200, signer.rewardConfig);
      if (req.method === "GET" && route === "/leaderboard") {
        const track = url.searchParams.get("track");
        if (!["bengawan", "mahakam"].includes(track))
          throw new ApiError(400, "INVALID_TRACK");
        return reply(200, { track, entries: await store.leaderboard(track) });
      }
      if (req.method === "GET" && route === "/rounds/result") {
        const id = url.searchParams.get("roundId");
        if (!id || id.length > 64) throw new ApiError(400, "INVALID_ROUND");
        return reply(200, await signer.get(id, token));
      }
      if (req.method === "POST" && ["/rounds/sign", "/auth/challenge", "/auth/verify"].includes(route)) {
        let data = "",
          size = 0;
        for await (const chunk of req) {
          size += chunk.length;
          if (size > 2048) throw new ApiError(413, "BODY_TOO_LARGE");
          data += chunk;
        }
        let body;
        try {
          body = JSON.parse(data);
        } catch {
          throw new ApiError(400, "INVALID_JSON");
        }
        if (route.startsWith("/auth/")) {
          if (!origin || !allowedOrigins.includes(origin)) throw new ApiError(403, "ORIGIN_NOT_ALLOWED");
          if (!body || typeof body !== "object" || Array.isArray(body)) throw new ApiError(400, "INVALID_REQUEST");
          const ip = process.env.TRUST_PROXY === "true" ? (req.headers["x-forwarded-for"]?.split(",").at(-1)?.trim() || req.socket.remoteAddress) : req.socket.remoteAddress;
          if (route === "/auth/challenge") return reply(200, auth.challenge(body.address, origin, ip));
          return reply(200, await auth.verify(body.id, body.signature, origin, ip));
        }
        if (
          !body ||
          Array.isArray(body) ||
          Object.keys(body).length !== 2 ||
          typeof body.roundId !== "string" ||
          !body.roundId ||
          body.roundId.length > 64 ||
          typeof body.playerId !== "string" ||
          !body.playerId ||
          body.playerId.length > 64
        )
          throw new ApiError(400, "INVALID_REQUEST");
        return reply(200, await signer.sign(body, token));
      }
      if (route === "/rooms")
        return reply(426, { error: "WEBSOCKET_REQUIRED" });
      reply(404, { error: "NOT_FOUND" });
    } catch (error) {
      if (error instanceof ApiError)
        return reply(error.status, { error: error.code });
      console.error("API request failed:", error.message);
      reply(500, { error: "INTERNAL_ERROR" });
    }
  });
  server.roomServer = attachRooms(server, {
    ...roomOptions,
    allowedOrigins,
    authenticate: walletRequired ? auth.authenticate : undefined,
    persist: store.persistRound,
  });
  server.store = store;
  server.signer = signer;
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  server.dispose = () => {
    server.roomServer.close();
    server.closeAllConnections();
    return new Promise((resolve) =>
      server.close(() => {
        Promise.resolve(store.close()).then(resolve);
      }),
    );
  };
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.env.NODE_ENV === "production" && !process.env.ALLOWED_ORIGINS) throw new Error("Set exact ALLOWED_ORIGINS for the deployed web game");
  const server = createApiServer({
      persistence: process.env.DATA_BACKEND === "supabase" ? createSupabaseStore() : undefined,
      database: process.env.DATABASE_PATH || "data/ndobol.sqlite",
      roomOptions: {
        allowedOrigins: (process.env.ALLOWED_ORIGINS || "http://127.0.0.1:4174,http://localhost:4174")
          .split(",")
          .filter(Boolean),
      },
    }),
    port = Number(process.env.PORT || process.env.API_PORT || 8787),
    host = process.env.HOST || "127.0.0.1";
  if (process.env.DATA_BACKEND === "supabase") await server.store.leaderboard("bengawan");
  server.listen(port, host, () =>
    console.log(
      `Ndobol API: http://${host}:${port} · signing ${server.signer.enabled ? "enabled" : "unconfigured"}`,
    ),
  );
  for (const signal of ["SIGINT", "SIGTERM"])
    process.on(signal, () => server.dispose().then(() => process.exit(0)));
}
