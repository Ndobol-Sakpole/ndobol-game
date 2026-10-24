import * as THREE from "three";
export function createCamera(canvas) {
  const camera = new THREE.PerspectiveCamera(
      43,
      innerWidth / innerHeight,
      0.1,
      230,
    ),
    target = new THREE.Vector3(),
    desired = new THREE.Vector3();
  const controls = new AbortController();
  let mode = "follow",
    angle = 0.3,
    elevation = 0.65,
    radius = 19,
    pointer = null,
    initialized = false;
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (mode !== "orbit") return;
      pointer = { x: e.clientX, y: e.clientY, id: e.pointerId };
      canvas.setPointerCapture(e.pointerId);
    },
    { signal: controls.signal },
  );
  canvas.addEventListener(
    "pointermove",
    (e) => {
      if (!pointer || mode !== "orbit") return;
      angle -= (e.clientX - pointer.x) * 0.006;
      elevation = THREE.MathUtils.clamp(
        elevation + (e.clientY - pointer.y) * 0.005,
        0.15,
        1.4,
      );
      pointer.x = e.clientX;
      pointer.y = e.clientY;
    },
    { signal: controls.signal },
  );
  for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
    canvas.addEventListener(
      event,
      () => {
        pointer = null;
      },
      { signal: controls.signal },
    );
  canvas.addEventListener(
    "wheel",
    (e) => {
      if (mode !== "orbit") return;
      e.preventDefault();
      radius = THREE.MathUtils.clamp(radius + e.deltaY * 0.02, 6, 45);
    },
    { passive: false, signal: controls.signal },
  );
  let shake = 0;
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    camera,
    impact(strength = 1) {
      if (!reduced) shake = Math.min(0.15, strength * 0.1);
    },
    setMode(value) {
      mode = value;
      pointer = null;
    },
    reset() {
      initialized = false;
    },
    resize() {
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
    },
    update(frame, dt, lobby) {
      const wide = innerWidth > 900;
      if (mode === "orbit") {
        target.copy(frame.position);
        desired
          .set(
            Math.sin(angle) * Math.cos(elevation) * radius,
            Math.sin(elevation) * radius,
            Math.cos(angle) * Math.cos(elevation) * radius,
          )
          .add(target);
      } else if (lobby) {
        target
          .copy(frame.position)
          .addScaledVector(frame.right, wide ? -3.5 : 0);
        target.y = wide ? 0.6 : -1;
        desired
          .copy(frame.position)
          .addScaledVector(frame.tangent, -15)
          .addScaledVector(frame.right, 9.5);
        desired.y = 12.8;
        if (innerWidth < 600) {
          desired.sub(frame.position).multiplyScalar(1.3).add(frame.position);
        }
      } else {
        target
          .copy(frame.position)
          .addScaledVector(frame.tangent, innerWidth < 600 ? 0 : 2);
        target.y = 0.4;
        desired
          .copy(frame.position)
          .addScaledVector(frame.tangent, -13.5)
          .addScaledVector(frame.right, 2.2);
        desired.y = 11.8;
        if (innerWidth < 600) {
          desired.sub(frame.position).multiplyScalar(1.35).add(frame.position);
        }
      }
      camera.position.lerp(desired, initialized ? 1 - Math.exp(-dt * 4) : 1);
      shake *= Math.exp(-dt * 10);
      camera.position.x += Math.sin(performance.now() * 0.04) * shake;
      camera.lookAt(target);
      initialized = true;
    },
    dispose() {
      controls.abort();
    },
  };
}
