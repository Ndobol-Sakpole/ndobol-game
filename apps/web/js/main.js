import { clearWalletSession } from "./wallet/auth.js";
import { apiUrl } from "./net/config.js";
import * as THREE from "three";
import { bankHeight } from "./world/terrain.js";
import { createWalletUI } from "./ui/wallet.js";
import { RAFTS } from "../../../shared/game/rafts.js";
import { isFatal } from "../../../shared/game/rewards.js";
import { QUALITY } from "./core/config.js";
import { createRenderer } from "./core/renderer.js";
import { createLoop } from "./core/loop.js";
import { createInput } from "./core/input.js";
import { createEventBus } from "./core/events.js";
import { loadTrack } from "./world/tracks.js";
import { createEnvironment } from "./world/environment.js";
import { createObstacles } from "./world/obstacles.js";
import { createRiverDetails } from "./world/details.js";
import { createAmbient } from "./world/ambient.js";
import { waveHeight } from "./world/waves.js";
import { createGetek } from "./entities/getek.js";
import { createAnimal } from "./entities/animals.js";
import { createTrash } from "./entities/trash.js";
import { createCamera } from "./camera/follow.js";
import { createSession } from "./game/session.js";
import { createUI } from "./ui/hud.js";
import { createDebug } from "./debug/panel.js";
import { createFeedback } from "./feedback/effects.js";

const bus = createEventBus(),
  canvas = document.querySelector("#scene"),
  view = createRenderer(canvas, QUALITY.medium),
  scene = new THREE.Scene();
const input = createInput(),
  camera = createCamera(canvas),
  ui = createUI(bus),
  debug = createDebug(bus),
  ambient = createAmbient(),
  feedback = createFeedback();
scene.add(feedback.root);
const wallet = createWalletUI({
  locked: () => Boolean(session.state),
  onIdentity(state) {
    const self = session.state?.players.find(p => p.id === session.client.session?.playerId);
    if (self && (self.address !== state.address?.toLowerCase() || state.chainId !== 10143)) {
      bus.emit("lobby");
      ui.toast("Wallet berubah. Login kembali sebelum masuk room.");
    }
  },
  onAddress(address) {
    document.querySelector("#player-address").value = address || "";
  },
});
let world,
  qualityName = "medium",
  visualTime = 0,
  uiTimer = 0,
  metadata = {},
  proofRound = null,
  previousPhase = null,
  selectedRaft = "bambu-polos",
  selectedAnimal = "dog";
const tracks = Object.fromEntries(
  await Promise.all(
    ["bengawan", "mahakam"].map(async (id) => [id, await loadTrack(id)]),
  ),
);
function buildWorld(track) {
  const environment = createEnvironment(track, QUALITY[qualityName]),
    obstacles = createObstacles(track),
    details = createRiverDetails(track),
    getek = createGetek(selectedRaft),
    trash = createTrash(track);
  const animals = track.animals.map((item) => {
    const animal = createAnimal(item.type),
      frame = track.frame(item.s, item.lateral);
    animal.root.position.copy(frame.position);
    animal.root.position.y =
      item.type === "duck" ? 0.05 : bankHeight(track, item.s, item.lateral);
    if (item.type === "duck") animal.root.scale.setScalar(0.45);
    animal.root.rotation.y = frame.yaw + (item.lateral < 0 ? -1.2 : 1.2);
    return animal;
  });
  return {
    track,
    environment,
    obstacles,
    details,
    getek,
    trash,
    animals,
    crew: [],
    crewKey: "",
    dispose() {
      [
        ...this.crew,
        environment,
        obstacles,
        details,
        getek,
        trash,
        ...animals,
      ].forEach((o) => o.dispose());
    },
  };
}
function changeTrack(id, force = false) {
  if (!tracks[id]) return;
  if (!force && world?.track.id === id) return;
  const next = buildWorld(tracks[id]);
  world?.dispose();
  world = next;
  scene.add(
    world.environment.root,
    world.obstacles.root,
    world.details.root,
    world.getek.root,
    world.trash.root,
    ...world.animals.map((a) => a.root),
  );
  scene.background = world.environment.sky;
  scene.fog = world.environment.fog;
  camera.reset();
  ui.setTrack(world.track);
  ui.setReady(true);
  crew(session?.state);
}
function crew(state) {
  const players =
    state?.players ||
    [selectedAnimal, "monkey", "pig", "squirrel"].map((animal, slot) => ({
      animal,
      slot,
      id: slot === 0 ? "preview" : "bot",
      x: slot % 2 ? 0.85 : -0.85,
      z: slot < 2 ? -0.85 : 0.85,
      facing: 0,
    }));
  const key = players.map((p) => p.slot + ":" + p.animal).join(",");
  if (world.crewKey === key) return;
  world.crewKey = key;
  world.crew.forEach((a) => a.dispose());
  world.crew = [];
  for (const p of players) {
    const animal = createAnimal(p.animal);
    animal.slot = p.slot;
    animal.root.scale.setScalar(
      p.animal === "buffalo" ? 0.36 : p.animal === "proboscis" ? 0.66 : 0.76,
    );
    animal.root.position.set(p.x || 0, world.getek.deckHeight, p.z || 0);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.37, 0.42, 24),
      new THREE.MeshBasicMaterial({
        color: ["#ffe19c", "#6ddbc8", "#eba6b2", "#b8ace9"][p.slot],
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.012;
    animal.root.add(ring);
    const arrow = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.35, 3),
      new THREE.MeshBasicMaterial({
        color: ["#ffe19c", "#6ddbc8", "#eba6b2", "#b8ace9"][p.slot],
      }),
    );
    arrow.rotation.x = -Math.PI / 2;
    arrow.position.set(0, 0.07, -0.8);
    animal.root.add(arrow);
    const labelCanvas = document.createElement("canvas");
    labelCanvas.width = 64;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext("2d");
    ctx.fillStyle = "#143f36";
    ctx.beginPath();
    ctx.arc(32, 32, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#fff5cf";
    ctx.font = "bold 32px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(p.slot + 1), 32, 33);
    const labelTexture = new THREE.CanvasTexture(labelCanvas),
      label = new THREE.Sprite(
        new THREE.SpriteMaterial({ map: labelTexture, depthTest: false }),
      );
    label.position.y = 2;
    label.scale.set(0.5, 0.5, 1);
    animal.root.add(label);
    world.getek.deck.add(animal.root);
    world.crew.push(animal);
  }
}
const session = createSession({
  onStatus(value) {
    ui.setStatus(value);
    if (value === "expired" && session.state) bus.emit("lobby");
  },
  onError(code) {
    if (["WALLET_REQUIRED", "WALLET_MISMATCH"].includes(code)) { clearWalletSession(); bus.emit("lobby"); }
    if (
      ![
        "ROOM_EXPIRED",
        "RECONNECT_EXPIRED",
        "INVALID_SESSION",
        "SESSION_ACTIVE",
      ].includes(code)
    )
      ui.requestError(code);
  },
  onState(state, meta) {
    metadata = meta;
    if (state.raftId !== selectedRaft) {
      selectedRaft = state.raftId;
      changeTrack(state.trackId, true);
    } else changeTrack(state.trackId);
    crew(state);
    input.setEnabled(state.phase === "running");
    if (previousPhase !== state.phase) {
      previousPhase = state.phase;
      if (state.phase === "running") canvas.focus();
      if (state.phase === "countdown") {
        proofRound = null;
        ui.proof(null);
      }
    }
    if (state.phase === "results" && proofRound !== state.roundId && (!meta.online || meta.persistence?.saved || meta.persistence?.error)) {
      proofRound = state.roundId;
      loadResults(state, meta);
    }
  },
  onEvent(event) {
    if (!world) return;
    if (event.type === "collected") {
      world.trash.collect(event.trashId, visualTime);
      ui.toast(`${ui.t("collected")} · +${event.weightGrams} g`);
      feedback.sound("collected");
      world.crew.forEach((a) => a.react(visualTime));
    }
    if (event.type === "finished" && isFatal(event.reason)) {
      feedback.splash(world.getek.root.position, 3);
      feedback.sound("collision");
      camera.impact(1);
    }
    if (event.type === "collision") {
      camera.impact(event.strength);
      feedback.splash(world.getek.root.position, 1.5);
      feedback.sound("collision");
      ui.toast(ui.t("collision"));
      world.crew.forEach((a) => a.react(visualTime, 0.6));
    }
    if (event.type === "damage") {
      feedback.sound(event.kind === "puncture" ? "puncture" : "collision");
      ui.toast(ui.t(event.kind));
      camera.impact(0.8);
    }
    if (["fart", "predicted-fart"].includes(event.type)) {
      const own =
        event.type === "fart" &&
        session.online &&
        event.slot === session.client.session?.slot;
      if (!own) {
        const actor = world.crew.find((a) => a.slot === event.slot);
        if (actor) {
          actor.root.updateWorldMatrix(true, false);
          const p = actor.root.localToWorld(new THREE.Vector3(0, 0.4, 0.36)),
            back = actor.root
              .localToWorld(new THREE.Vector3(0, 0.4, 1.36))
              .sub(p)
              .normalize();
          feedback.gas(p, back, event.slot);
          actor.react(visualTime, 0.25);
        }
      }
    }
  },
});
async function loadResults(state, meta) {
  const id = state.roundId,
    self = state.players.find((p) => p.id === meta.playerId);
  const eligible = !isFatal(state.reason) && Number(self?.rewardWei || 0) > 0;
  ui.proof(null, meta.online && self?.address && eligible ? "signing" : "guestResult");
  if (isFatal(state.reason)) ui.signError("REWARD_FORFEITED");
  else if (self?.weightGrams === 0) ui.signError("NO_REWARD");
  if (!meta.online) {
    ui.leaderboard(null);
    return;
  }
  if (meta.persistence?.error) ui.signError("SAVE_FAILED");
  if (meta.online && meta.persistence?.saved && self?.address && eligible) {
    try {
      const proof = await session.client.result(id);
      if (proofRound === id) ui.proof(proof, "signed");
    } catch (error) {
      if (proofRound === id) ui.signError(error.message);
    }
  }
  try {
    const response = await fetch(apiUrl(`/leaderboard?track=${state.trackId}`));
    if (!response.ok) throw new Error();
    const body = await response.json();
    if (proofRound === id) ui.leaderboard(body.entries);
  } catch {
    if (proofRound === id) ui.leaderboard(null);
  }
}
const guarded = (fn) => async (value) => {
  try {
    await fn(value);
  } catch (error) {
    ui.requestError(error.message);
  }
};
let entering = false;
bus.on("enter", guarded(async () => {
  if (entering) return;
  entering = true;
  feedback.unlock();
  try { await wallet.ensure(); ui.setStatus("verified"); ui.enter(); await session.restore(); }
  finally { entering = false; }
}));

bus.on(
  "create",
  guarded(async (profile) => {
    const auth = await wallet.ensure();
    profile.address = auth.address;
    feedback.unlock();
    return session.join("create", { ...profile, trackId: world.track.id });
  }),
);
bus.on(
  "join",
  guarded(async (profile) => {
    const auth = await wallet.ensure();
    profile.address = auth.address;
    feedback.unlock();
    const joinProfile = { ...profile };
    delete joinProfile.raftId;
    return session.join("join", joinProfile);
  }),
);
bus.on("ready", (value) => session.send("ready", { ready: value }));
bus.on("animal", (animal) => {
  selectedAnimal = animal;
  if (session.online) session.send("animal", { animal });
  else crew(null);
});
bus.on("raft", (raftId) => {
  if (session.state || !Object.hasOwn(RAFTS, raftId)) return;
  selectedRaft = raftId;
  changeTrack(world.track.id, true);
});
bus.on("start", () => {
  feedback.unlock();
  session.send("start");
});
bus.on("again", () => {
  if (session.online) session.send("again");
  else session.solo(world.track, ui.profile() || {});
});
bus.on("lobby", () => {
  session.leave();
  wallet.syncAddress();
  input.setEnabled(false);
  metadata = {};
  previousPhase = null;
  proofRound = null;
  crew(null);
  changeTrack(world.track.id, true);
  ui.update(null);
});
bus.on("track", (id) => {
  if (session.state) {
    ui.setTrack(world.track);
    return;
  }
  changeTrack(id);
});
bus.on("quality", (name) => {
  if (!QUALITY[name]) return;
  qualityName = name;
  view.setQuality(QUALITY[name]);
  debug.setQuality(name, QUALITY[name]);
  changeTrack(world.track.id, true);
  crew(session.state);
});
bus.on("camera", (value) => camera.setMode(value));
bus.on("ambient", (value) =>
  ambient.setEnabled(value).catch((error) => ui.toast(error.message)),
);
bus.on("sound", (value) => {
  feedback.setEnabled(value);
  if (value) feedback.unlock();
});
const loop = createLoop(
  (dt) => session.update(dt, input.sample()),
  (_alpha, dt, realDelta) => {
    if (!world) return;
    visualTime += dt;
    const state = session.visual() || {
        s: 15,
        lateral: 0,
        speed: 0,
        steer: 0,
        bump: 0,
        players: [],
        picked: [],
      },
      frame = world.track.frame(state.s, state.lateral);
    world.environment.update(visualTime, frame.position);
    scene.fog.color.copy(world.environment.sky);
    world.getek.update(frame, visualTime, state);
    world.obstacles.update(visualTime);
    world.details.update(visualTime);
    for (const i of state.picked)
      world.trash.collect(`${world.track.id}:${i}`, visualTime - 2);
    world.trash.update(visualTime);
    world.animals.forEach((animal, i) => {
      animal.update(visualTime + i);
      if (animal.type === "duck")
        animal.root.position.y =
          waveHeight(
            animal.root.position.x,
            animal.root.position.z,
            visualTime,
          ) + 0.05;
    });
    world.crew.forEach((a) => {
      const p = state.players.find((p) => p.slot === a.slot);
      if (p) {
        a.root.position.set(p.x, world.getek.deckHeight, p.z);
        a.root.rotation.y = -p.facing;
        a.root.traverse(o => { if (o.isSprite) o.visible = p.alive !== false; });
      } else {
        a.root.position.set(
          a.slot % 2 ? 0.85 : -0.85,
          world.getek.deckHeight,
          a.slot < 2 ? -0.85 : 0.85,
        );
        a.root.rotation.y = Math.PI + 0.25;
      }
      a.update(visualTime, p || {});
    });
    feedback.thrust(state.phase === "running" ? state.players.filter(p => p.alive && (p.thrustActive || p.gas > 0.1)).map(p => p.slot) : []);
    feedback.update(dt, camera.camera);
    camera.update(frame, dt, !session.state || session.state.phase === "lobby");
    view.render(scene, camera.camera);
    debug.sample(realDelta, view.renderer.info);
    uiTimer += dt;
    if (uiTimer > 0.1) {
      ui.update(session.state, metadata);
      uiTimer = 0;
    }
  },
);
window.addEventListener("resize", () => {
  view.resize();
  camera.resize();
});
canvas.addEventListener("webglcontextlost", (event) => {
  event.preventDefault();
  loop.stop();
  input.setEnabled(false);
  ui.error(
    "Konteks grafis terputus. Muat ulang halaman / Reload to reconnect.",
  );
});
window.ndobolDebug = Object.freeze({
  snapshot: () => ({
    track: world?.track.id,
    quality: qualityName,
    state: session.state ? structuredClone(session.state) : null,
    online: session.online,
    room: metadata.roomCode,
    playerId: metadata.playerId,
    rtt: session.client.rtt,
    performance: debug.snapshot(),
    memory: { ...view.renderer.info.memory },
  }),
});
changeTrack("bengawan");
debug.setQuality(qualityName, QUALITY.medium);
loop.start();
// Resume only after the player connects and verifies the wallet.
