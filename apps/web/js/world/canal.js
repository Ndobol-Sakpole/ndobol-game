import * as THREE from "three";
import { instance, material, mesh } from "../core/procedural.js";
import { surface } from "./materials.js";
import { bankHeight } from "./terrain.js";
/** Canal civil works, inspired by Mataram's stone revetments and inspection paths.
 * Decorative bridges clear the crew; lateral collision uses the shared track width.
 */
export function createCanal(track) {
  const root = new THREE.Group(), slabs = [], caps = [], posts = [], moss = [];
  const box = new THREE.BoxGeometry(1, 1, 1);
  for (let s = -30; s < track.length + 90; s += 2) for (const side of [-1, 1]) {
    const lateral = side * (track.width / 2 + track.bank.slope);
    const frame = track.frame(s, lateral), y = bankHeight(track, s, lateral);
    caps.push({ p: [frame.position.x, y + 0.06, frame.position.z], s: [0.32, 0.25, 2.06], r: [0, frame.yaw, 0] });
    const path = track.frame(s, lateral + side * 1.05);
    slabs.push({ p: [path.position.x, y, path.position.z], s: [1.85, 0.12, 1.97], r: [0, frame.yaw, 0], color: s % 4 ? "#b0ad95" : "#c1baa0" });
    const waterline = track.frame(s, side * (track.width / 2 + 0.12));
    moss.push({ p: [waterline.position.x, 0.13, waterline.position.z], s: [0.14, 0.27, 2], r: [0, frame.yaw, 0] });
    if (s % 8 === 0) posts.push({ p: [path.position.x + frame.right.x * side * 0.85, y + 0.38, path.position.z + frame.right.z * side * 0.85], s: [0.18, 0.76, 0.18], color: "#e1d8b7" });
  }
  root.add(instance(box, surface("rock", "#b4b09e"), caps), instance(box, material("#fff"), slabs), instance(box, material("#fff"), posts), instance(box, material("#59683b"), moss));
  for (const s of [64, 164, 282]) {
    const frame = track.frame(s), bridge = new THREE.Group();
    bridge.position.copy(frame.position); bridge.rotation.y = frame.yaw; root.add(bridge);
    const parts = [], railings = [];
    const span = track.width + 5;
    parts.push({ p: [0, 4.7, 0], s: [span, 0.45, s === 164 ? 6 : 2.8] });
    for (const side of [-1, 1]) {
      parts.push({ p: [side * (track.width / 2 + 0.6), 2.1, 0], s: [1.1, 4.2, 3] });
      for (let x = -span / 2; x <= span / 2; x += 1.4) railings.push({p: [x, 5.35, side * 1.2], s: [0.075, 1.05, 0.075]});
      railings.push({p:[0,5.8,side*1.2],s:[span,0.08,0.08]});
    }
    bridge.add(instance(box, surface("masonry", "#bbb7a2"), parts), instance(box, material("#4e6255"), railings));
    // Side outlet/cross-drain: dark recess above the water, with a masonry surround.
    const outlet = mesh(new THREE.CylinderGeometry(0.48,0.48,0.08,20), material("#27342c"), [track.width/2 + 0.5, 0.75, -5], [1,1,1], [0,0,Math.PI/2]);
    bridge.add(outlet);
  }
  return root;
}
