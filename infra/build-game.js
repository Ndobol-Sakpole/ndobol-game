import { cp, mkdir, writeFile, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
/** Packaging only: native modules are copied verbatim; no bundler, transpiler or secrets. */
export async function buildGame({ output = new URL("../dist/game/", import.meta.url), apiOrigin = process.env.PUBLIC_API_ORIGIN } = {}) {
  if (!apiOrigin) throw new Error("Set PUBLIC_API_ORIGIN to the Render HTTPS origin");
  const origin = new URL(apiOrigin);
  if (origin.protocol !== "https:" || origin.username || origin.password || origin.search || origin.hash || origin.pathname !== "/") throw new Error("PUBLIC_API_ORIGIN must be a plain HTTPS origin");
  const root = fileURLToPath(new URL("../", import.meta.url));
  const destination = path.resolve(output instanceof URL ? fileURLToPath(output) : output);
  // Only replace the dedicated generated game directory, never arbitrary paths.
  if (destination !== path.join(root, "dist/game")) throw new Error("INVALID_GAME_OUTPUT");
  await rm(destination, { recursive: true, force: true });
  await mkdir(path.join(destination, "apps"), { recursive: true });
  await cp(new URL("../apps/web/", import.meta.url), path.join(destination, "apps/web"), { recursive: true });
  await cp(new URL("../shared/", import.meta.url), path.join(destination, "shared"), { recursive: true });
  const ws = new URL("/rooms", origin); ws.protocol = "wss:";
  const config = { apiOrigin: origin.origin, wsUrl: ws.href };
  await writeFile(path.join(destination,"apps/web/runtime-config.js"), `globalThis.NDOBOL_CONFIG = Object.freeze(${JSON.stringify(config)});\n`);
  console.log("Static game packaged: dist/game (public endpoints only)");
}
if (process.argv[1] === fileURLToPath(import.meta.url)) await buildGame();
