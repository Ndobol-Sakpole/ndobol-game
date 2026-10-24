import * as THREE from "three";
import { mesh, material, instance, disposeObject } from "../core/procedural.js";
import { surface, rockGeometry } from "./materials.js";
import { waveHeight } from "./waves.js";
export function createObstacles(track) {
  const rockMat = surface("rock", "#696a5b"),
    woodMat = surface("bark", "#796044");
  const root = new THREE.Group(),
    floating = [];
  for (const item of track.obstacles) {
    const group = new THREE.Group(),
      frame = track.frame(item.s, item.lateral);
    group.position.copy(frame.position);
    if (item.type === "rock") {
      const mat = rockMat;
      group.add(
        mesh(
          rockGeometry(item.s),
          mat,
          [0, item.radius * 0.25, 0],
          [item.radius, item.radius * 0.85, item.radius * 0.86],
        ),
      );
      group.add(
        mesh(rockGeometry(item.s), mat, [0.9, 0.1, 0.9], [0.65, 0.5, 0.7]),
      );
    } else if (item.type === "log") {
      group.add(
        mesh(
          new THREE.CylinderGeometry(0.35, 0.42, 4.2, 8),
          woodMat,
          [0, 0.15, 0],
          [1, 1, 1],
          [0, 0, Math.PI / 2],
        ),
      );
      group.add(
        mesh(
          new THREE.CylinderGeometry(0.12, 0.2, 1.3, 5),
          woodMat,
          [0.7, 0.6, 0],
          [1, 1, 1],
          [0, 0, -0.5],
        ),
      );
      group.add(
        mesh(
          new THREE.CircleGeometry(0.28, 8),
          material("#c3aa78"),
          [2.11, 0.15, 0],
          [1, 1, 1],
          [0, Math.PI / 2, 0],
        ),
      );
      if (item.sharp) {
        const spikes = [];
        for (const x of [-1.1, 0.1, 1.15])
          spikes.push({
            p: [x, 0.65, 0],
            s: [0.16, 1.15, 0.16],
            r: [0.25, 0, x * 0.3],
          });
        group.add(
          instance(
            new THREE.ConeGeometry(1, 1, 6),
            material("#e7c08a"),
            spikes,
          ),
        );
      }
      floating.push(group);
    } else {
      const leaves = [],
        flowers = [];
      for (let i = 0; i < 11; i++) {
        const a = i * 2.4,
          r = Math.sqrt(i / 11) * item.radius;
        leaves.push({
          p: [Math.cos(a) * r, 0.06, Math.sin(a) * r],
          s: [0.5, 0.1, 0.6],
          r: [0, a, 0],
        });
        if (i % 3 === 0)
          flowers.push({
            p: [Math.cos(a) * r, 0.35, Math.sin(a) * r],
            s: [0.14, 0.3, 0.14],
          });
      }
      group.add(
        instance(
          new THREE.IcosahedronGeometry(1, 1),
          material("#619950"),
          leaves,
        ),
        instance(
          new THREE.IcosahedronGeometry(1, 0),
          material("#c2a1d1"),
          flowers,
        ),
      );
      floating.push(group);
    }
    root.add(group);
  }
  return {
    root,
    update(time) {
      floating.forEach((g, i) => {
        g.position.y = waveHeight(g.position.x, g.position.z, time);
        g.rotation.z = Math.sin(time + i) * 0.025;
      });
    },
    dispose() {
      disposeObject(root);
    },
  };
}
