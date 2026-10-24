import * as THREE from "three";
export const TRACK_IDS = ["bengawan", "mahakam"];
export async function loadTrack(id) {
  if (!TRACK_IDS.includes(id)) throw new Error("Track tidak dikenal");
  const response = await fetch(new URL(`./tracks/${id}.json`, import.meta.url));
  if (!response.ok) throw new Error(`Track ${id} gagal dimuat`);
  const data = await response.json();
  const curve = new THREE.CatmullRomCurve3(
    data.path.map(([x, z]) => new THREE.Vector3(x, 0, z)),
    false,
    "catmullrom",
    0.35,
  );
  curve.arcLengthDivisions = 600;
  const length = curve.getLength();
  function frame(distance, lateral = 0) {
    const clamped = THREE.MathUtils.clamp(distance, 0, length);
    const t = THREE.MathUtils.clamp(clamped / length, 0.0001, 0.9999);
    const center = curve.getPointAt(t),
      tangent = curve.getTangentAt(t).normalize();
    center.addScaledVector(tangent, distance - clamped);
    const right = new THREE.Vector3(-tangent.z, 0, tangent.x);
    return {
      position: center.addScaledVector(right, lateral),
      tangent,
      right,
      yaw: Math.atan2(-tangent.x, -tangent.z),
    };
  }
  return { ...data, curve, length, frame };
}
