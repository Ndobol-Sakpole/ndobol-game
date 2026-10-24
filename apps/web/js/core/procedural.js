import * as THREE from "three";
export const material = (color, extra = {}) =>
  new THREE.MeshStandardMaterial({
    color,
    roughness: 0.85,
    flatShading: true,
    ...extra,
  });
export function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let n = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    n = (n + Math.imul(n ^ (n >>> 7), 61 | n)) ^ n;
    return ((n ^ (n >>> 14)) >>> 0) / 4294967296;
  };
}
export function mesh(
  geometry,
  mat,
  position = [0, 0, 0],
  scale = [1, 1, 1],
  rotation = [0, 0, 0],
) {
  const object = new THREE.Mesh(geometry, mat);
  object.position.set(...position);
  object.scale.set(...scale);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}
export function instance(geometry, mat, transforms) {
  const batch = new THREE.InstancedMesh(geometry, mat, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((t, i) => {
    dummy.position.set(...(t.p || [0, 0, 0]));
    dummy.rotation.set(...(t.r || [0, 0, 0]));
    dummy.scale.set(...(t.s || [1, 1, 1]));
    dummy.updateMatrix();
    batch.setMatrixAt(i, dummy.matrix);
    if (t.color) batch.setColorAt(i, new THREE.Color(t.color));
  });
  batch.castShadow = true;
  batch.receiveShadow = true;
  batch.computeBoundingSphere();
  return batch;
}
export function disposeObject(root) {
  const geometries = new Set(),
    materials = new Set();
  root.traverse((o) => {
    if (o.geometry) geometries.add(o.geometry);
    if (o.material)
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        materials.add(m),
      );
    if (o.isInstancedMesh) o.dispose();
  });
  geometries.forEach((g) => g.dispose());
  materials.forEach((m) => {
    for (const value of Object.values(m)) if (value?.isTexture) value.dispose();
    m.dispose();
  });
  root.removeFromParent();
}
