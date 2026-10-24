import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
const onRender = process.env.RENDER === "true";
if (!onRender && existsSync(".env")) process.loadEnvFile(".env");
const env = {
  ...process.env,
  API_ORIGIN:
    process.env.API_ORIGIN ||
    `http://127.0.0.1:${process.env.API_PORT || 8787}`,
};
const files = onRender ? ["services/api/server.js"] : ["services/api/server.js", "infra/static-server.js"];
const children = files.map(
  (file) => spawn(process.execPath, [file], { stdio: "inherit", env }),
);
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill("SIGTERM");
  process.exitCode = code;
}
for (const child of children) child.on("exit", (code) => stop(code || 0));
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => stop());
