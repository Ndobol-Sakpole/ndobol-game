import http from "node:http";
import { readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".png": "image/png",
};
export function createStaticServer({
  apiOrigin = process.env.API_ORIGIN || "http://127.0.0.1:8787",
} = {}) {
  const target = new URL(apiOrigin);
  const server = http.createServer(async (req, res) => {
    if (req.url.startsWith("/api/")) {
      const upstream = http.request(
        {
          hostname: target.hostname,
          port: target.port,
          path: req.url.slice(4),
          method: req.method,
          headers: { ...req.headers, host: target.host },
        },
        (reply) => {
          res.writeHead(reply.statusCode, reply.headers);
          reply.pipe(res);
        },
      );
      upstream.on("error", () => {
        if (!res.headersSent)
          res.writeHead(502, { "Content-Type": "application/json" });
        res.end('{"error":"SERVER_UNAVAILABLE"}');
      });
      upstream.setTimeout(10000, () => upstream.destroy());
      req.pipe(upstream);
      req.on("aborted", () => upstream.destroy());
      return;
    }
    try {
      if (!["GET", "HEAD"].includes(req.method)) {
        res.writeHead(405, { Allow: "GET, HEAD" }).end();
        return;
      }
      let pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      if (pathname === "/") {
        res.writeHead(302, { Location: "/apps/web/index.html" }).end();
        return;
      }
      if (
        !pathname.startsWith("/apps/web/") &&
        !pathname.startsWith("/shared/")
      ) {
        res.writeHead(404).end("Not found");
        return;
      }
      if (pathname.endsWith("/")) pathname += "index.html";
      const target = path.resolve(ROOT, `.${pathname}`),
        resolved = await realpath(target);
      if (
        !["apps/web", "shared"].some((dir) =>
          resolved.startsWith(path.join(ROOT, dir) + path.sep),
        ) ||
        !(await stat(resolved)).isFile()
      ) {
        res.writeHead(404).end();
        return;
      }
      const data = await readFile(resolved);
      res.writeHead(200, {
        "Content-Type":
          types[path.extname(resolved)] || "application/octet-stream",
        "Content-Length": data.length,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch {
      res.writeHead(404).end("Not found");
    }
  });
  server.on("upgrade", (req, socket, head) => {
    if (new URL(req.url, "http://localhost").pathname !== "/rooms") {
      socket.end("HTTP/1.1 404 Not Found\r\n\r\n");
      return;
    }
    const upstream = http.request({
      hostname: target.hostname,
      port: target.port,
      path: "/rooms",
      headers: { ...req.headers, host: target.host },
    });
    upstream.on("upgrade", (reply, peer, peerHead) => {
      socket.write(
        `HTTP/1.1 101 Switching Protocols\r\n${Object.entries(reply.headers)
          .map(([k, v]) => `${k}: ${v}`)
          .join("\r\n")}\r\n\r\n`,
      );
      if (head.length) peer.write(head);
      if (peerHead.length) socket.write(peerHead);
      peer.pipe(socket);
      socket.pipe(peer);
      peer.on("error", () => socket.destroy());
      socket.on("error", () => peer.destroy());
      socket.on("close", () => peer.destroy());
      peer.on("close", () => socket.destroy());
    });
    upstream.on("response", (reply) => {
      socket.end(
        `HTTP/1.1 ${reply.statusCode} Rejected\r\nConnection: close\r\n\r\n`,
      );
      reply.resume();
    });
    upstream.on("error", () => socket.destroy());
    socket.on("error", () => upstream.destroy());
    upstream.end();
  });
  return server;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.WEB_PORT || 4174),
    host = process.env.HOST || "127.0.0.1";
  createStaticServer().listen(port, host, () =>
    console.log(`Ndobol world: http://${host}:${port}/apps/web/index.html`),
  );
}
