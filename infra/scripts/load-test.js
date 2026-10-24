import { performance, monitorEventLoopDelay } from "node:perf_hooks";
import { once } from "node:events";
import { setTimeout as delay } from "node:timers/promises";
import { writeFileSync } from "node:fs";
import os from "node:os";
import { createApiServer } from "../../services/api/server.js";
import { createRoom, startRoom, drive } from "../../tests/helpers.js";
import { tracks } from "../../services/api/rooms/tracks.js";
const rooms = 20,
  seconds = Number(process.env.LOAD_SECONDS || 20),
  clients = [],
  api = createApiServer({ walletRequired: false, signing: { privateKey: null } });
api.listen(0, "127.0.0.1");
await once(api, "listening");
const url = `ws://127.0.0.1:${api.address().port}/rooms`;
try {
  for (let r = 0; r < rooms; r++) {
    const group = await createRoom(url, 4, r % 2 ? "mahakam" : "bengawan");
    clients.push(...group);
    await startRoom(group);
  }
  const histogram = monitorEventLoopDelay({ resolution: 10 });
  histogram.enable();
  const cpuStart = process.cpuUsage(),
    start = performance.now(),
    before = api.roomServer.stats.ticks,
    seq = new Map(clients.map((c) => [c, 0]));
  const timer = setInterval(() => {
    for (const c of clients) {
      const s = c.latest?.state;
      if (s?.phase === "running" && c.ws.readyState === 1)
        c.send("input", {
          roundId: s.roundId,
          seq: seq.get(c),
          ...drive(s, tracks[s.trackId]),
        });
      seq.set(c, seq.get(c) + 1);
    }
  }, 1000 / 30);
  await delay(seconds * 1000);
  clearInterval(timer);
  histogram.disable();
  const elapsed = (performance.now() - start) / 1000,
    cpu = process.cpuUsage(cpuStart);
  const result = {
    date: new Date().toISOString(),
    platform: `${os.platform()} ${os.arch()}`,
    cpu: os.cpus()[0]?.model,
    node: process.version,
    rooms,
    clients: clients.length,
    seconds: elapsed,
    tickHz: (api.roomServer.stats.ticks - before) / elapsed,
    maxStepMs: api.roomServer.stats.maxStepMs,
    overruns: api.roomServer.stats.overruns,
    droppedMs: api.roomServer.stats.droppedMs,
    eventLoopP99Ms: histogram.percentile(99) / 1e6,
    cpuPercentOneCore: (cpu.user + cpu.system) / 1e4 / elapsed,
    rssMiB: process.memoryUsage().rss / 1048576,
    receivedMiB: clients.reduce((sum, c) => sum + c.bytes, 0) / 1048576,
    connected: clients.filter((c) => c.ws.readyState === 1).length,
    errors: clients.flatMap((c) =>
      c.messages.filter((m) => m.type === "error").map((m) => m.payload.code),
    ),
  };
  console.log(JSON.stringify(result, null, 2));
  if (process.env.PERF_OUTPUT)
    writeFileSync(
      process.env.PERF_OUTPUT,
      JSON.stringify(result, null, 2) + "\n",
    );
  if (result.connected !== 80 || result.errors.length || result.tickHz < 28)
    process.exitCode = 1;
} finally {
  clients.forEach((c) => c.close());
  await api.dispose();
}
