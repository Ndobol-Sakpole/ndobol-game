import test from "node:test";
import assert from "node:assert/strict";
import { spawn, execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const exec = promisify(execFile);
const root = fileURLToPath(new URL("../", import.meta.url));
const configFile = new URL("../dist/game/apps/web/runtime-config.js", import.meta.url);
const cleanEnv = () => ({ ...process.env, RENDER: "", VERCEL: "", PUBLIC_API_ORIGIN: "" });
const build = (target, env = {}) => exec(process.execPath, ["infra/build-target.js", ...target], { cwd: root, env: { ...cleanEnv(), ...env } });

test("Render default build checks API imports without frontend config or signing credentials", async () => {
  const { stdout } = await build([], { RENDER: "true", SIGNER_PRIVATE_KEY: "not-a-key" });
  assert.match(stdout, /API dependencies ready/);
  assert.doesNotMatch(stdout, /Static game packaged/);
});

test("Vercel build without an override packages the supplied public Render endpoint", async () => {
  await build(["vercel"], { SIGNER_PRIVATE_KEY: "private-build-canary" });
  const config = await readFile(configFile, "utf8");
  assert.match(config, /"apiOrigin":"https:\/\/ndobol-game\.onrender\.com"/);
  assert.match(config, /"wsUrl":"wss:\/\/ndobol-game\.onrender\.com\/rooms"/);
  assert.doesNotMatch(config, /private-build-canary/);
  await access(new URL("../dist/game/shared/messages.js", import.meta.url));
  await assert.rejects(access(new URL("../dist/game/.env", import.meta.url)));
  await assert.rejects(access(new URL("../dist/game/services/api/server.js", import.meta.url)));
});

test("Vercel auto-detection respects PUBLIC_API_ORIGIN for independent deployments", async () => {
  await build([], { VERCEL: "1", PUBLIC_API_ORIGIN: "https://fork.example.test" });
  const config = await readFile(configFile, "utf8");
  assert.match(config, /https:\/\/fork\.example\.test/);
  assert.match(config, /wss:\/\/fork\.example\.test\/rooms/);
  assert.doesNotMatch(config, /ndobol-game.onrender/);
});

test("web builds still reject missing or malformed API origins", async () => {
  await assert.rejects(build(["web"]), /Set PUBLIC_API_ORIGIN/);
  for (const origin of ["http://api.example.test", "https://api.example.test/path", "https://user:password@api.example.test"]) {
    await assert.rejects(build(["vercel"], { PUBLIC_API_ORIGIN: origin }), /plain HTTPS origin/);
  }
});

test("Render default start listens publicly on PORT and starts only the API", async t => {
  const child = spawn(process.execPath, ["infra/dev.js"], {
    cwd: root,
    env: {
      ...cleanEnv(), RENDER: "true", NODE_ENV: "production", HOST: "", PORT: "0",
      WEB_PORT: "invalid", DATA_BACKEND: "sqlite", DATABASE_PATH: ":memory:",
      ALLOWED_ORIGINS: "https://game.example.test", SIGNER_PRIVATE_KEY: "",
      REWARD_POOL_ADDRESS: "", RIVER_REGISTRY_ADDRESS: "", REWARD_CLAIMS_ENABLED: "false",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const exited = new Promise(resolve => child.once("exit", resolve));
  t.after(async () => { child.kill("SIGTERM"); await exited; });
  let stdout = "", stderr = "";
  child.stderr.on("data", data => { stderr += data; });
  const port = await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`API start timed out: ${stderr}`)), 10000);
    const finish = value => { clearTimeout(timeout); resolve(value); };
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error(`API exited ${code}: ${stderr}`)); });
    child.stdout.on("data", data => {
      stdout += data;
      const match = stdout.match(/Ndobol API: http:\/\/0\.0\.0\.0:(\d+)/);
      if (match) finish(match[1]);
    });
  });
  const response = await fetch(`http://127.0.0.1:${port}/health`);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).ok, true);
  const rejected = await fetch(`http://127.0.0.1:${port}/health`, { headers: { Origin: "https://untrusted.example.test" } });
  assert.equal(rejected.status, 403);
  assert.equal(child.exitCode, null);
  assert.doesNotMatch(stdout, /Ndobol Web/);
});
