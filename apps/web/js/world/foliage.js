import * as THREE from "three";
/** Curved blades and pointed bamboo leaf sprays, packed into one instanced geometry. */
export function foliageGeometry(grass = false) {
  const positions = [],
    uv = [];
  const count = grass ? 7 : 28;
  for (let i = 0; i < count; i++) {
    const angle = i * 2.39996,
      radius = grass ? 0.1 : (i / count) * 0.9;
    const x = Math.sin(angle) * radius,
      z = Math.cos(angle) * radius,
      y = grass ? 0 : 0.15 * Math.sin(i * 3);
    const length = grass
        ? 0.7 + 0.3 * Math.sin(i * 4)
        : 0.45 + 0.22 * Math.sin(i * 3) ** 2,
      width = grass ? 0.045 : 0.11;
    const dx = Math.cos(angle),
      dz = Math.sin(angle),
      tip = [
        x + dx * (grass ? 0.3 : length),
        y + (grass ? length : 0.1),
        z + dz * (grass ? 0.3 : length),
      ];
    const points = [
      [x - width * dz, y, z + width * dx],
      [x + width * dz, y, z - width * dx],
      [
        (x + tip[0]) * 0.5 - width * dz * 0.7,
        y + length * 0.22,
        (z + tip[2]) * 0.5 + width * dx * 0.7,
      ],
      [
        (x + tip[0]) * 0.5 + width * dz * 0.7,
        y + length * 0.22,
        (z + tip[2]) * 0.5 - width * dx * 0.7,
      ],
      tip,
    ];
    for (const [a, b, c] of [
      [0, 1, 2],
      [1, 3, 2],
      [2, 3, 4],
    ]) {
      for (const k of [a, b, c]) {
        positions.push(...points[k]);
        uv.push(k % 2, k / 4);
      }
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.computeVertexNormals();
  return g;
}
