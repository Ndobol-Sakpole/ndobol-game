import * as THREE from "three";
/** Unequal banks with low waterline, eroded slope and a rolling upper terrace. */
export function bankHeight(track, s, lateral) {
  const distance = Math.abs(lateral) - track.width / 2,
    b = track.bank || { height: 1.4, variation: 0.6, slope: 5 };
  if (distance <= 0) return -0.14;
  const side = lateral < 0 ? -1 : 1;
  if (track.kind === "canal") {
    const top = b.height + (side < 0 ? 0.25 : 0);
    return distance < b.slope ? -0.14 + (top + 0.14) * distance / b.slope : top + Math.max(0, distance - 4) * 0.025;
  }
  const top =
    b.height +
    b.variation *
      (0.55 +
        0.3 * Math.sin(s * 0.044 + side * 2) +
        0.15 * Math.sin(s * 0.17)) +
    (side < 0 ? 0.7 : 0);
  const f = Math.min(1, distance / b.slope);
  return -0.14 + top * f * (2 - f) + Math.max(0, distance - b.slope) * 0.035;
}
export function terrainStrip(track, side, from, to, segments = 180, rows = 10) {
  const positions = [],
    uv = [],
    colors = [],
    indices = [];
  for (let i = 0; i <= segments; i++)
    for (let j = 0; j <= rows; j++) {
      const s = -35 + (i / segments) * (track.length + 135),
        l = side * (track.width / 2 + from + ((to - from) * j) / rows),
        p = track.frame(s, l).position,
        h = bankHeight(track, s, l);
      positions.push(p.x, h, p.z);
      if (track.kind === "canal" && from < 0) uv.push(s / 4, h / 2);
      else uv.push(l / 5, s / 5);
      const shade = 0.78 + 0.22 * Math.sin(s * 0.04 + j * 0.2) ** 2;
      colors.push(shade, shade, shade);
      if (i < segments && j < rows) {
        const a = i * (rows + 1) + j;
        indices.push(a, a + 1, a + rows + 1, a + 1, a + rows + 2, a + rows + 1);
      }
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  g.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2));
  g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
