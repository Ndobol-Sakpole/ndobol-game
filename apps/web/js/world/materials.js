import * as THREE from "three";
import { rng, material } from "../core/procedural.js";
/** Small deterministic canvas materials: no downloaded maps, no per-frame allocations. */
export function surface(kind, color, repeat = 1) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext("2d"),
    random = rng(918 + kind.length * 37);
  const pixels = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++)
    for (let x = 0; x < 256; x++) {
      const n = random(),
        grain = kind === "wood" || kind === "bark";
      const v = grain
        ? 155 + 45 * Math.sin(x * 0.35 + Math.sin(y * 0.025) * 2) + n * 40
        : 145 + n * 65 + 18 * Math.sin(x * 0.08) * Math.cos(y * 0.06);
      const i = (y * 256 + x) * 4;
      pixels.data[i] = v;
      pixels.data[i + 1] = v;
      pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
  ctx.putImageData(pixels, 0, 0);
  if (kind === "masonry") {
    ctx.fillStyle = "#494a40";
    ctx.fillRect(0, 0, 256, 256);
    for (let row = -1; row < 5; row++) for (let col = -1; col < 5; col++) {
      const x = col * 70 + (row % 2) * 35, y = row * 57;
      const shade = 100 + random() * 75;
      ctx.fillStyle = `rgb(${shade},${shade + 3},${shade - 7})`;
      ctx.beginPath();
      ctx.moveTo(x + 7, y + 5); ctx.lineTo(x + 63, y + 3);
      ctx.lineTo(x + 67, y + 44); ctx.lineTo(x + 57, y + 52);
      ctx.lineTo(x + 3, y + 49); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "#d4d3b533";ctx.lineWidth = 2;ctx.stroke();
    }
  }
  if (kind === "grass")
    for (let i = 0; i < 2400; i++) {
      const x = random() * 256,
        y = random() * 256;
      ctx.strokeStyle = i % 3 ? "#72835f" : "#b0b494";
      ctx.lineWidth = 0.6;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (random() - 0.5) * 5, y - 2 - random() * 7);
      ctx.stroke();
    }
  if (kind === "rock")
    for (let i = 0; i < 30; i++) {
      ctx.strokeStyle = "#53534a66";
      ctx.lineWidth = 0.5 + random();
      const x = random() * 256,
        y = random() * 256;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + random() * 25, y + random() * 30);
      ctx.stroke();
    }
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(repeat, repeat);
  map.anisotropy = 4;
  return material(color, {
    map,
    bumpMap: map,
    bumpScale: kind === "rock" ? 0.14 : 0.075,
    flatShading: false,
    roughness: 0.94,
  });
}
export function rockGeometry(seed = 51) {
  const g = new THREE.IcosahedronGeometry(1, 2),
    p = g.attributes.position;
  // Position-based displacement keeps duplicate vertices joined.
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      k = 1 + 0.13 * Math.sin(x * 8 + seed) * Math.sin(z * 7 + y * 5);
    p.setXYZ(i, x * k, y * k, z * k);
  }
  g.computeVertexNormals();
  return g;
}
