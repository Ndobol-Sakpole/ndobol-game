import * as THREE from "three";
import { GAME } from "../../../../shared/game/config.js";
import { bankHeight } from "./terrain.js";
import { surface } from "./materials.js";
import {
  instance,
  material,
  mesh,
  disposeObject,
  rng,
} from "../core/procedural.js";
/** Procedural riverbank dressing and a visible finish gate; no gameplay rules. */
export function createRiverDetails(track) {
  const root = new THREE.Group(),
    random = rng(track.seed + 71),
    reeds = [],
    leaves = [],
    flowers = [],
    stones = [];
  const box = new THREE.BoxGeometry(1, 1, 1),
    cylinder = new THREE.CylinderGeometry(1, 1, 1, 8);
  for (let i = 0; i < 80; i++) {
    const side = i % 2 ? -1 : 1,
      s = 8 + random() * (track.length - 16),
      lateral = side * (track.width / 2 + 0.3 + random() * 0.9),
      frame = track.frame(s, lateral),
      ground = bankHeight(track, s, lateral);
    for (let j = 0; j < 3; j++) {
      const x = frame.position.x + (random() - 0.5) * 0.8,
        z = frame.position.z + (random() - 0.5) * 0.8,
        h = 0.5 + random() * 0.65;
      reeds.push({
        p: [x, ground + h / 2, z],
        s: [0.025, h, 0.025],
        r: [0, 0, (random() - 0.5) * 0.3],
        color: "#669145",
      });
      flowers.push({
        p: [x, ground + h, z],
        s: [0.065, 0.19, 0.065],
        color: "#836647",
      });
    }
    if (i % 2 === 0)
      stones.push({
        p: [frame.position.x, ground, frame.position.z],
        s: [0.25 + random() * 0.25, 0.17, 0.4],
        color: i % 4 ? "#9b9a79" : "#b1ac87",
      });
    const water = track.frame(
      frame.position.distanceTo(new THREE.Vector3()) % track.length,
      side * (track.width / 2 - 1),
    ).position;
    leaves.push({
      p: [water.x, 0.04, water.z],
      s: [0.35, 0.025, 0.28],
      r: [0, random() * 6, 0],
      color: "#618e5d",
    });
  }
  root.add(
    instance(cylinder, material("#fff"), reeds),
    instance(cylinder, material("#fff"), flowers),
    instance(new THREE.IcosahedronGeometry(1, 1), material("#fff"), stones),
    instance(new THREE.SphereGeometry(1, 10, 6), material("#fff"), leaves),
  );
  for (const [i, s] of (track.kind === "canal" ? [] : [30, 110, 210, 305]).entries()) {
    const side = i % 2 ? -1 : 1,
      frame = track.frame(s, side * (track.width / 2 + 4)),
      group = new THREE.Group();
    group.position.copy(frame.position);
    group.position.y = bankHeight(track, s, side * (track.width / 2 + 4));
    group.rotation.y = frame.yaw;
    root.add(group);
    const parts = [],
      posts = [];
    for (let j = 0; j < 9; j++)
      parts.push({
        p: [(j - 4) * 0.32, 0.7, 0],
        s: [0.3, 0.12, 3],
        color: j % 3 ? "#b28d56" : "#99764c",
      });
    for (const x of [-1.25, 1.25])
      for (const z of [-1.25, 1.25])
        posts.push({ p: [x, 1.25, z], s: [0.09, 3.1, 0.09], color: "#735d3c" });
    parts.push({ p: [0, 1.5, 1.2], s: [2.8, 1.6, 0.12], color: "#af8c60" });
    group.add(
      instance(box, surface("wood", "#fff"), parts),
      instance(cylinder, surface("bark", "#fff"), posts),
    );
    const hutRoof = mesh(
      new THREE.ConeGeometry(2.5, 1.4, 4),
      material(i % 2 ? "#82684d" : "#a56e45"),
      [0, 3.3, 0],
      [1, 1, 1],
      [0, Math.PI / 4, 0],
    );
    group.add(hutRoof);
    const dock = [];
    for (let j = 0; j < 8; j++)
      dock.push({
        p: [side * (-1.6 - j * 0.34), 0.42, 0],
        s: [0.31, 0.12, 1.8],
        color: "#ac8855",
      });
    group.add(instance(box, surface("wood", "#fff"), dock));
  }
  for (const [distance, label] of [
    [GAME.startDistance, "START"],
    [track.length - GAME.finishMargin, "FINISH"],
  ]) {
    const frame = track.frame(distance),
      gate = new THREE.Group();
    gate.position.copy(frame.position);
    gate.rotation.y = frame.yaw;
    root.add(gate);
    const posts = [],
      checks = [],
      buoys = [];
    for (const side of [-1, 1])
      posts.push({
        p: [side * (track.width / 2 + 0.3), 3.5, 0],
        s: [0.17, 7.8, 0.17],
      });
    posts.push({
      p: [0, 7.3, 0],
      s: [0.1, track.width + 1, 0.1],
      r: [0, 0, Math.PI / 2],
    });
    gate.add(instance(cylinder, surface("bark", "#a28a50"), posts));
    for (let i = 0; i < Math.ceil(track.width); i++) {
      const x = -track.width / 2 + i + 0.5;
      checks.push({
        p: [x, 7.05, 0],
        s: [1, 0.35, 0.02],
        color: i % 2 ? "#e9dfb3" : "#263c31",
      });
      // Actual start/finish line coincides with the authoritative distance.
      buoys.push({
        p: [x, 0.06, 0],
        s: [0.46, 0.025, 0.1],
        color: i % 2 ? "#eaddb5" : "#263c31",
      });
    }
    gate.add(
      instance(box, material("#fff"), checks),
      instance(box, material("#fff"), buoys),
    );
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 128;
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#193b30";
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = "#e6c979";
    ctx.lineWidth = 9;
    ctx.strokeRect(5, 5, 502, 118);
    ctx.fillStyle = "#fff0b9";
    ctx.font = "bold 70px Trebuchet MS";
    ctx.textAlign = "center";
    ctx.fillText(label, 256, 89);
    const texture = new THREE.CanvasTexture(c);
    texture.colorSpace = THREE.SRGBColorSpace;
    gate.add(
      mesh(
        new THREE.PlaneGeometry(4.5, 1.12),
        new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }),
        [0, 6.65, 0.06],
      ),
    );
  }
  const streaks = [],
    dummy = new THREE.Object3D();
  for (const zone of track.rapids || [])
    for (let i = 0; i < 70; i++)
      streaks.push({
        zone,
        offset: random(),
        lateral: (random() - 0.5) * (track.width - 2),
        scale: 0.3 + random() * 0.5,
      });
  const foamCanvas = document.createElement("canvas");
  foamCanvas.width = 64;
  foamCanvas.height = 128;
  const foamContext = foamCanvas.getContext("2d");
  for (let i = 0; i < 22; i++) {
    const x = 12 + random() * 40,
      y = 8 + random() * 112,
      r = 5 + random() * 10;
    const g = foamContext.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, "rgba(255,255,255,.6)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    foamContext.fillStyle = g;
    foamContext.fillRect(x - r, y - r, r * 2, r * 2);
  }
  const foamMap = new THREE.CanvasTexture(foamCanvas);
  const foam = new THREE.InstancedMesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({
      map: foamMap,
      color: "#e7debe",
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    streaks.length,
  );
  foam.frustumCulled = false;
  root.add(foam);
  return {
    root,
    update(time) {
      streaks.forEach((e, i) => {
        const t =
            (e.offset + (time * e.zone.speed) / (e.zone.end - e.zone.start)) %
            1,
          frame = track.frame(
            e.zone.start + t * (e.zone.end - e.zone.start),
            e.lateral,
          );
        dummy.position.copy(frame.position);
        dummy.position.y = 0.16 + Math.sin(time * 7 + i) * 0.015;
        dummy.rotation.set(-Math.PI / 2, 0, -frame.yaw);
        dummy.scale.set(e.scale, 1.1 + e.scale * 2, 1);
        dummy.updateMatrix();
        foam.setMatrixAt(i, dummy.matrix);
      });
      foam.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      disposeObject(root);
    },
  };
}
