import test from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { readFile } from "node:fs/promises";
import { createEventBus } from "../apps/web/js/core/events.js";
import { createSimulation } from "../apps/web/js/game/simulation.js";
import { createInput } from "../apps/web/js/core/input.js";
import { waveHeight } from "../apps/web/js/world/waves.js";
import { message, isMessage } from "../shared/messages.js";
import { CHAINS } from "../shared/chains.js";
import { createStaticServer } from "../infra/static-server.js";
const neutral = { throttle: 0, steer: 0, collect: false };
const track = JSON.parse(
  await readFile(
    new URL("../apps/web/js/world/tracks/bengawan.json", import.meta.url),
  ),
);
track.length = 370;

test("short touch pickup remains queued until a fixed update samples it", (t) => {
  const previousWindow = globalThis.window,
    previousDocument = globalThis.document;
  const button = new EventTarget();
  button.dataset = { key: "reachRight" };
  button.classList = { add() {}, remove() {} };
  button.setPointerCapture = () => {};
  globalThis.window = new EventTarget();
  globalThis.document = new EventTarget();
  document.querySelectorAll = () => [button];
  const input = createInput();
  input.setEnabled(true);
  const down = new Event("pointerdown");
  Object.defineProperty(down, "pointerId", { value: 1 });
  button.dispatchEvent(down);
  const up = new Event("pointerup");
  Object.defineProperty(up, "pointerId", { value: 1 });
  button.dispatchEvent(up);
  t.after(() => {
    input.dispose();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  });
  assert.equal(input.sample().reach, 1);
  assert.equal(input.sample().reach, 0);
});

test("event bus unsubscribe does not leave listeners", () => {
  const bus = createEventBus();
  let calls = 0;
  const off = bus.on("tick", () => calls++);
  bus.emit("tick");
  off();
  bus.emit("tick");
  assert.equal(calls, 1);
});
test("fixed simulation moves, clamps banks, and pauses clock", () => {
  const sim = createSimulation(track, createEventBus());
  sim.start();
  for (let i = 0; i < 240; i++)
    sim.update(1 / 60, { ...neutral, throttle: 1, steer: 1 });
  assert.ok(sim.state.s > 22);
  assert.ok(sim.state.lateral <= track.width / 2 - 2.1);
  const elapsed = sim.state.elapsed;
  sim.pause();
  sim.update(10, neutral);
  assert.equal(sim.state.elapsed, elapsed);
});
test("nearby trash scores once; far trash cannot be collected", () => {
  const bus = createEventBus(),
    sim = createSimulation(track, bus);
  let events = 0;
  bus.on("collected", () => events++);
  sim.start();
  for (let i = 0; i < 120; i++)
    sim.update(1 / 60, { ...neutral, collect: true });
  assert.equal(sim.state.score, 100);
  assert.equal(sim.state.collected, 1);
  assert.equal(events, 1);
});
test("obstacle collision resolves overlap and emits impact", () => {
  const bus = createEventBus(),
    sim = createSimulation(track, bus);
  let hit = false;
  bus.on("collision", () => {
    hit = true;
  });
  sim.start();
  sim.state.s = 27;
  sim.state.lateral = -6;
  sim.update(1 / 60, neutral);
  assert.ok(hit);
  assert.ok(Math.hypot(sim.state.s - 27, sim.state.lateral + 6) >= 3.04);
});
test("completed route emits exactly one local result", () => {
  const bus = createEventBus(),
    sim = createSimulation(track, bus);
  let results = 0;
  bus.on("complete", () => results++);
  sim.start();
  sim.state.s = track.length - 12;
  sim.update(1 / 60, neutral);
  sim.update(1 / 60, neutral);
  assert.equal(results, 1);
  assert.ok(sim.state.complete);
});
test("wave is bounded and moves over time", () => {
  assert.notEqual(waveHeight(2, 3, 0), waveHeight(2, 3, 3));
  for (let i = 0; i < 100; i++)
    assert.ok(Math.abs(waveHeight(i, i * 2, i)) <= 0.16001);
});
test("v4 rejects scores, positions, stale versions, and non-finite inputs", () => {
  const payload = {
    roundId: "r1",
    seq: 1,
    fart: true,
    moveX: 0,
    moveZ: 0,
    turn: 0,
    reach: 1,
  };
  assert.ok(isMessage(message("input", payload), "client"));
  for (const extra of [
    { score: 100 },
    { s: 10 },
    { clientTime: 100 },
    { turn: Infinity },
  ])
    assert.throws(() => message("input", { ...payload, ...extra }));
  assert.ok(!isMessage({ v: 1, type: "input", payload }));
  assert.ok(!isMessage({ v: 2, type: "snapshot", payload: {} }, "client"));
});
test("Monad networks remain explicit and separate", () => {
  assert.equal(CHAINS.testnet.id, 10143);
  assert.equal(CHAINS.mainnet.id, 143);
});
for (const id of ["bengawan", "mahakam"])
  test(`${id}: data includes all required types and valid spline`, async () => {
    const data = JSON.parse(
      await readFile(
        new URL(`../apps/web/js/world/tracks/${id}.json`, import.meta.url),
      ),
    );
    assert.equal(data.id, id);
    assert.ok(data.path.length >= 4);
    assert.deepEqual(
      new Set(data.animals.map((x) => x.type)),
      new Set(["duck", "buffalo", "proboscis"]),
    );
    assert.deepEqual(
      new Set(data.trash.map((x) => x.type)),
      new Set(["bottle", "bag", "can"]),
    );
    assert.deepEqual(
      new Set(data.obstacles.map((x) => x.type)),
      new Set(["rock", "log", "hyacinth"]),
    );
  });
test("game static server serves modules and rejects private and encoded traversal paths", async (t) => {
  const server = createStaticServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}`;
  for (const route of [
    "/apps/web/index.html",
    "/apps/web/vendor/three.module.min.js",
    "/shared/messages.js",
  ])
    assert.equal((await fetch(url + route)).status, 200);
  for (const route of [
    "/.env",
    "/package.json",
    "/apps/web/%2e%2e%2f%2e%2e%2f.env",
    "/shared/%2e%2e%2fpackage.json",
  ])
    assert.equal((await fetch(url + route)).status, 404);
});

const { fartSamples } = await import("../apps/web/js/feedback/fart-audio.js");
test("synthesized fart variants are finite, distinct, bounded and decay to silence", () => {
  const a = fartSamples(48000, 0),
    b = fartSamples(48000, 1);
  assert.notEqual(a.length, b.length);
  for (const data of [a, b, fartSamples(48000, 0, true)]) {
    let sum = 0,
      peak = 0;
    for (const v of data) {
      assert.ok(Number.isFinite(v));
      sum += v;
      peak = Math.max(peak, Math.abs(v));
    }
    assert.ok(peak > 0.02 && peak < 1);
    assert.ok(Math.abs(sum / data.length) < 0.002);
    assert.ok(Math.abs(data.at(-1)) < 0.001);
  }
});

test("holding Space and touch maintains thrust until release, blur or cancellation", t => {
  const saved = { window: globalThis.window, document: globalThis.document };
  const button = new EventTarget(); button.dataset={key:"fart"}; button.classList={add(){},remove(){}};button.setPointerCapture=()=>{};
  globalThis.window=new EventTarget();globalThis.document=new EventTarget();document.querySelectorAll=()=>[button];
  const input=createInput(); input.setEnabled(true);
  t.after(()=>{ input.dispose();Object.assign(globalThis,saved); });
  const key=(type,repeat=false)=>{const e=new Event(type,{cancelable:true});Object.defineProperties(e,{code:{value:"Space"},repeat:{value:repeat}});return e;};
  window.dispatchEvent(key("keydown"));
  for(let i=0;i<180;i++) assert.equal(input.sample().fart,true);
  window.dispatchEvent(key("keyup"));assert.equal(input.sample().fart,false);
  window.dispatchEvent(key("keydown"));input.sample();window.dispatchEvent(new Event("blur"));assert.equal(input.sample().fart,false);
  const down=new Event("pointerdown");Object.defineProperty(down,"pointerId",{value:1});button.dispatchEvent(down);
  for(let i=0;i<90;i++) assert.equal(input.sample().fart,true);
  const cancel=new Event("pointercancel");Object.defineProperty(cancel,"pointerId",{value:1});button.dispatchEvent(cancel);
  assert.equal(input.sample().fart,false);
  window.dispatchEvent(key("keydown"));input.setEnabled(false);assert.equal(input.sample().fart,false);
});

test("sustained fart loops have finite bounded energy and no sharp boundary click", () => {
  for(let slot=0;slot<4;slot++) {
    const samples=fartSamples(48000,slot,false,true);
    assert.ok(samples.length>48000);
    assert.ok(Math.abs(samples[0]-samples.at(-1))<0.12);
    assert.ok(samples.every(x=>Number.isFinite(x)&&Math.abs(x)<0.73));
    assert.ok(samples.reduce((sum,x)=>sum+x*x,0)/samples.length>0.01);
  }
});
