import * as THREE from "three";
import {
  instance,
  mesh,
  material,
  disposeObject,
  rng,
} from "../core/procedural.js";
import { waveHeight } from "../world/waves.js";
import {
  RAFTS,
  DEFAULT_RAFT,
  FLOAT_CORNERS,
} from "../../../../shared/game/rafts.js";

function grainTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 512;
  const c = canvas.getContext("2d"),
    random = rng(413);
  c.fillStyle = "#dcc294";
  c.fillRect(0, 0, 128, 512);
  for (let i = 0; i < 350; i++) {
    c.strokeStyle = `rgba(76,48,17,${0.025 + random() * 0.09})`;
    c.lineWidth = 0.4 + random();
    const x = random() * 128,
      y = random() * 512;
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + (random() - 0.5) * 3, y + 20 + random() * 120);
    c.stroke();
  }
  const t = new THREE.CanvasTexture(canvas);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
/** Broad, walkable procedural hulls, built from the concept silhouettes in output/ndobol-assets. */
export function createGetek(type = DEFAULT_RAFT) {
  if (!Object.hasOwn(RAFTS, type)) throw new TypeError("Unknown raft");
  const root = new THREE.Group(),
    body = new THREE.Group();
  root.add(body);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12),
    box = new THREE.BoxGeometry(1, 1, 1);
  const torus = new THREE.TorusGeometry(1, 0.095, 6, 20),
    white = material("#fff", { flatShading: false });
  const wood = material("#fff", {
    map: grainTexture(),
    roughness: 0.84,
    flatShading: false,
  });
  const bamboo = [],
    nodes = [],
    caps = [],
    ropes = [],
    beams = [];
  const square =
    type === "ranjang-hanyut" ||
    type === "drum-biru" ||
    type === "getek-sultan";
  for (let i = 0; i < 15; i++) {
    const x = (i - 7) * 0.31,
      length = 4.65 + (i % 3) * 0.07;
    bamboo.push({
      p: [x, 0.31, 0],
      r: square ? [0, 0, 0] : [Math.PI / 2, 0, 0],
      s: square ? [0.295, 0.21, length] : [0.162, length, 0.162],
      color: ["#e7bb69", "#f6d589", "#dba852"][i % 3],
    });
    if (!square)
      for (let j = -2; j <= 2; j++)
        nodes.push({
          p: [x, 0.31, j * 0.9 + (i % 2) * 0.13],
          r: [Math.PI / 2, 0, 0],
          s: [0.168, 0.026, 0.168],
          color: "#a47e3c",
        });
    for (const side of [-1, 1])
      if (!square)
        caps.push({
          p: [x, 0.31, side * (length / 2 + 0.01)],
          r: [Math.PI / 2, 0, 0],
          s: [0.12, 0.015, 0.12],
          color: "#956b34",
        });
  }
  body.add(instance(square ? box : cylinder, wood, bamboo));
  if (nodes.length)
    body.add(instance(cylinder, white, nodes), instance(cylinder, white, caps));
  for (const side of [-1, 1]) {
    beams.push({
      p: [side * 2.34, 0.47, 0],
      r: [Math.PI / 2, 0, 0],
      s: [0.14, 4.95, 0.14],
      color: type === "getek-sultan" ? "#e6b34b" : "#d6a450",
    });
    beams.push({
      p: [0, 0.48, side * 2.34],
      r: [0, 0, Math.PI / 2],
      s: [0.14, 4.95, 0.14],
      color: type === "getek-sultan" ? "#e6b34b" : "#d6a450",
    });
    for (let i = -2; i <= 2; i++)
      for (let loop = 0; loop < 3; loop++) {
        ropes.push({
          p: [side * 2.32, 0.45, i * 1.02 + loop * 0.055],
          r: [0, 0, 0],
          s: [0.21, 0.21, 0.21],
          color: "#987242",
        });
        ropes.push({
          p: [i * 1.02 + loop * 0.055, 0.45, side * 2.32],
          r: [0, Math.PI / 2, 0],
          s: [0.21, 0.21, 0.21],
          color: "#987242",
        });
      }
  }
  body.add(instance(cylinder, white, beams), instance(torus, white, ropes));
  const floats = [];
  for (const [x, z] of FLOAT_CORNERS) {
    const group = new THREE.Group();
    group.position.set(x * 1.85, 0, z * 1.6);
    body.add(group);
    floats.push(group);
    if (type === "ban-bekas") {
      const rubber = material("#292e2e", { roughness: 1, flatShading: false });
      group.add(
        mesh(
          new THREE.TorusGeometry(0.48, 0.23, 10, 28),
          rubber,
          [x * 0.4, -0.03, 0],
          [1, 1, 1],
          [-Math.PI / 2, 0, 0],
        ),
      );
      const tread = [];
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        tread.push({
          p: [x * 0.4 + Math.cos(a) * 0.68, -0.02, Math.sin(a) * 0.68],
          r: [0, -a, 0],
          s: [0.08, 0.24, 0.09],
          color: i % 3 ? "#414644" : "#5a5548",
        });
      }
      group.add(instance(box, white, tread));
    } else if (type === "getek-botol") {
      const bottles = [],
        lids = [],
        necks = [];
      for (let i = 0; i < 8; i++) {
        const px = ((i % 4) - 1.5) * 0.22,
          pz = (Math.floor(i / 4) - 0.5) * 0.9;
        bottles.push({
          p: [px, -0.06, pz],
          s: [0.13, 0.8, 0.13],
          r: [Math.PI / 2, 0, 0],
          color: i % 2 ? "#95d9cf" : "#b9ece5",
        });
        necks.push({
          p: [px, -0.06, pz - 0.44],
          s: [0.075, 0.14, 0.075],
          r: [Math.PI / 2, 0, 0],
          color: "#d5f8eb",
        });
        lids.push({
          p: [px, -0.06, pz - 0.53],
          s: [0.08, 0.06, 0.08],
          r: [Math.PI / 2, 0, 0],
          color: i % 2 ? "#23856b" : "#237cb5",
        });
      }
      group.position.x = x * 2.1;
      group.add(
        instance(cylinder, white, bottles),
        instance(cylinder, white, necks),
        instance(cylinder, white, lids),
      );
    } else if (type === "drum-biru") {
      group.add(
        mesh(
          cylinder,
          material("#287ec9", {
            metalness: 0.25,
            roughness: 0.5,
            flatShading: false,
          }),
          [0, -0.15, 0],
          [0.48, 1.38, 0.48],
          [Math.PI / 2, 0, 0],
        ),
      );
      const bands = [];
      for (const n of [-0.52, 0, 0.52])
        bands.push({
          p: [0, -0.15, n],
          s: [0.493, 0.06, 0.493],
          r: [Math.PI / 2, 0, 0],
          color: "#174e81",
        });
      bands.push({
        p: [0.12, 0.04, 0.7],
        s: [0.07, 0.03, 0.07],
        r: [Math.PI / 2, 0, 0],
        color: "#918b73",
      });
      group.add(instance(cylinder, white, bands));
    } else {
      const logs = [];
      for (let i = 0; i < 3; i++)
        logs.push({
          p: [(i - 1) * 0.32, -0.02, 0],
          s: [0.18, 1.8, 0.18],
          r: [Math.PI / 2, 0, 0],
          color: type === "getek-sultan" ? "#236d65" : "#ad8c45",
        });
      group.add(instance(cylinder, wood, logs));
    }
  }
  if (type === "ranjang-hanyut") {
    const patches = [];
    for (let x = 0; x < 6; x++)
      for (let z = 0; z < 6; z++)
        patches.push({
          p: [(x - 2.5) * 0.71, 0.5, (z - 2.5) * 0.71],
          s: [0.7, 0.14, 0.7],
          color: ["#b36b5c", "#4f8691", "#e7bf85", "#75958a"][(x * 7 + z) % 4],
        });
    body.add(instance(box, white, patches));
    const headboard = [
      { p: [0, 1.1, -2.27], s: [4.5, 0.7, 0.13], color: "#885c3e" },
    ];
    for (const x of [-2.2, 2.2])
      headboard.push({
        p: [x, 0.85, -2.27],
        s: [0.18, 1.4, 0.18],
        color: "#6c472f",
      });
    body.add(instance(box, wood, headboard));
    for (const x of [-1.55, 1.55])
      body.add(
        mesh(
          cylinder,
          material("#c9a86f"),
          [x, 0.75, -1.7],
          [0.18, 0.9, 0.18],
          [0, 0, Math.PI / 2],
        ),
      );
  }
  const flags = [];
  if (type === "getek-sultan") {
    const borders = [],
      gold = [],
      details = [];
    for (const side of [-1, 1]) {
      borders.push(
        { p: [side * 2.3, 0.18, 0], s: [0.2, 0.65, 4.8], color: "#176663" },
        { p: [0, 0.18, side * 2.3], s: [4.8, 0.65, 0.2], color: "#176663" },
      );
      borders.push(
        { p: [side * 2.13, 0.49, 0], s: [0.28, 0.04, 4.4], color: "#a83c3d" },
        { p: [0, 0.49, side * 2.13], s: [4.4, 0.04, 0.28], color: "#a83c3d" },
      );
      for (const z of [-2.22, 2.22]) {
        gold.push({
          p: [side * 2.22, 0.76, z],
          s: [0.1, 0.75, 0.1],
          color: "#efc458",
        });
        details.push({
          p: [side * 2.22, 1.18, z],
          s: [0.16, 0.24, 0.16],
          color: "#ffe098",
        });
      }
      for (let j = -3; j <= 3; j++)
        details.push({
          p: [side * 2.42, 0.24, j * 0.6],
          s: [0.05, 0.13, 0.13],
          color: "#e8bc56",
        });
      const flag = mesh(
        new THREE.PlaneGeometry(0.55, 0.34, 4, 1),
        material("#c84442", { side: THREE.DoubleSide }),
        [side * 2.22, 1.4, -2.22],
      );
      flags.push(flag);
      body.add(flag);
    }
    body.add(
      instance(box, white, borders),
      instance(
        cylinder,
        material("#edbd57", { metalness: 0.45, roughness: 0.32 }),
        gold,
      ),
      instance(new THREE.IcosahedronGeometry(1, 1), white, details),
    );
  }
  const rings = [];
  for (let i = 0; i < 3; i++) {
    const ring = mesh(
      new THREE.RingGeometry(2.65, 2.68, 48),
      new THREE.MeshBasicMaterial({
        color: "#e0f4d5",
        transparent: true,
        opacity: 0.25,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      [0, 0.025, 0],
      [1, 1.2, 1],
      [-Math.PI / 2, 0, 0],
    );
    root.add(ring);
    rings.push(ring);
  }
  return {
    root,
    deck: body,
    type,
    deckHeight: type === "ranjang-hanyut" ? 0.61 : 0.49,
    slots: FLOAT_CORNERS.map(
      ([x, z]) => new THREE.Vector3(x * 0.85, 0.49, z * 0.85),
    ),
    update(frame, time, motion) {
      root.position.copy(frame.position);
      root.rotation.y = frame.yaw - (motion.heading || 0);
      body.position.y =
        waveHeight(frame.position.x, frame.position.z, time) +
        (motion.heave || 0);
      body.rotation.x = (motion.pitch || 0) + Math.sin(time * 1.1) * 0.008;
      body.rotation.z = (motion.roll || 0) + Math.sin(time * 1.5) * 0.008;
      floats.forEach((g, i) => {
        const integrity = motion.floats?.[i] ?? 1;
        g.scale.y = type === "getek-botol" ? 1 : 0.18 + 0.82 * integrity;
        if (type === "getek-botol")
          for (const batch of g.children) {
            if (batch.isInstancedMesh) batch.count = Math.round(8 * integrity);
          }
        g.position.y = -(1 - integrity) * 0.1;
      });
      rings.forEach((r, i) => {
        const t = (time * 0.24 + i / 3) % 1;
        r.scale.set(1 + t * 0.55, 1.1 + t * 0.55, 1);
        r.material.opacity = (1 - t) * 0.23;
        r.position.z = (motion.speed || 0) * t * 0.35;
      });
      flags.forEach((f, i) => {
        f.rotation.y = Math.sin(time * 3 + i) * 0.2;
      });
    },
    dispose() {
      disposeObject(root);
    },
  };
}
