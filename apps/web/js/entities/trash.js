import * as THREE from "three";
import { material, disposeObject } from "../core/procedural.js";
import { waveHeight } from "../world/waves.js";
import { surface } from "../world/materials.js";
/** Each prop is a set of instanced parts sharing one local transform, including caps/handles. */
export function createTrash(track) {
  const root = new THREE.Group(),
    pose = new THREE.Object3D(),
    part = new THREE.Object3D(),
    matrix = new THREE.Matrix4();
  const entries = track.trash.map((item, index) => ({
    ...item,
    id: `${track.id}:${index}`,
    position: track.frame(item.s, item.lateral).position,
    collectedAt: null,
  }));
  const batches = [];
  function add(
    type,
    geometry,
    mat,
    position = [0, 0, 0],
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
  ) {
    const items = entries.filter((e) => e.type === type),
      batch = new THREE.InstancedMesh(geometry, mat, items.length);
    batch.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    batch.frustumCulled = false;
    batch.castShadow = true;
    root.add(batch);
    part.position.set(...position);
    part.scale.set(...scale);
    part.rotation.set(...rotation);
    part.updateMatrix();
    batches.push({ items, batch, local: part.matrix.clone() });
  }
  const bottleProfile = [
    [0.12, -0.5],
    [0.2, -0.45],
    [0.205, -0.33],
    [0.19, -0.28],
    [0.205, -0.2],
    [0.19, -0.12],
    [0.2, 0.1],
    [0.17, 0.25],
    [0.075, 0.34],
    [0.075, 0.47],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const plastic = material("#a5bdab", {
    roughness: 0.35,
    metalness: 0.06,
    flatShading: false,
  });
  add("bottle", new THREE.LatheGeometry(bottleProfile, 12), plastic);
  add(
    "bottle",
    new THREE.CylinderGeometry(0.082, 0.082, 0.13, 12),
    material("#43777a"),
    [0, 0.49, 0],
  );
  add(
    "bottle",
    new THREE.CylinderGeometry(0.207, 0.207, 0.23, 12, 1, true),
    material("#e2d8ba"),
    [0, -0.05, 0],
  );
  add(
    "bottle",
    new THREE.CylinderGeometry(0.209, 0.209, 0.06, 12, 1, true),
    material("#468f7c"),
    [0, -0.03, 0],
  );
  const bag = new THREE.SphereGeometry(1, 14, 10),
    v = bag.attributes.position;
  for (let i = 0; i < v.count; i++) {
    const x = v.getX(i),
      y = v.getY(i),
      z = v.getZ(i),
      fold = 1 + 0.12 * Math.sin(x * 17 + y * 9) * Math.cos(z * 14);
    v.setXYZ(i, x * 0.48 * fold, y * 0.48, z * 0.16 * fold);
  }
  bag.computeVertexNormals();
  const bagMat = surface("plastic", "#c7bba1");
  bagMat.roughness = 0.5;
  add("bag", bag, bagMat);
  for (const x of [-0.22, 0.22])
    add(
      "bag",
      new THREE.TorusGeometry(0.17, 0.035, 5, 14),
      bagMat,
      [x, 0.42, 0],
      [0.7, 1, 1],
    );
  const can = new THREE.CylinderGeometry(0.24, 0.25, 0.53, 14, 4),
    cv = can.attributes.position;
  for (let i = 0; i < cv.count; i++) {
    const x = cv.getX(i),
      y = cv.getY(i),
      z = cv.getZ(i);
    cv.setXYZ(i, x * (1 - 0.18 * Math.cos(y * 9 + z * 5)), y, z);
  }
  can.computeVertexNormals();
  add("can", can, surface("metal", "#9c5946"));
  const metal = material("#b7b8ab", { metalness: 0.6, roughness: 0.4 });
  for (const y of [-0.265, 0.265])
    add("can", new THREE.CylinderGeometry(0.235, 0.235, 0.025, 14), metal, [
      0,
      y,
      0,
    ]);
  add(
    "can",
    new THREE.TorusGeometry(0.065, 0.018, 4, 10),
    metal,
    [0.03, 0.285, 0],
    [1, 1.5, 1],
    [Math.PI / 2, 0, 0],
  );
  add(
    "can",
    new THREE.CylinderGeometry(0.249, 0.249, 0.085, 14, 1, true),
    material("#d9c99c"),
    [0, 0.02, 0],
  );
  return {
    root,
    entries,
    collect(id, time) {
      const e = entries.find((e) => e.id === id);
      if (e && e.collectedAt === null) e.collectedAt = time;
    },
    update(time) {
      for (const { batch, items, local } of batches) {
        items.forEach((e, i) => {
          const age = e.collectedAt === null ? 0 : time - e.collectedAt,
            scale = e.collectedAt === null ? 1 : Math.max(0, 1 - age / 0.7);
          pose.position.set(
            e.position.x,
            0.12 +
              waveHeight(e.position.x, e.position.z, time) +
              Math.min(age, 1) * 2,
            e.position.z,
          );
          pose.rotation.set(
            e.type === "bag" ? 1.2 : 0.25,
            Math.sin(time * 0.12 + i) * 0.3 + i,
            e.type === "bottle"
              ? 1.25 + Math.sin(time + i) * 0.1
              : Math.sin(time + i) * 0.13,
          );
          pose.scale.setScalar(scale);
          pose.updateMatrix();
          matrix.multiplyMatrices(pose.matrix, local);
          batch.setMatrixAt(i, matrix);
        });
        batch.instanceMatrix.needsUpdate = true;
      }
    },
    dispose() {
      disposeObject(root);
    },
  };
}
