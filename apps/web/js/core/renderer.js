import * as THREE from "three";
export function createRenderer(canvas, quality) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  function setQuality(next) {
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, next.pixelRatio));
    renderer.shadowMap.enabled = next.shadows;
    resize();
  }
  function resize() {
    renderer.setSize(window.innerWidth, window.innerHeight, false);
  }
  setQuality(quality);
  return {
    renderer,
    resize,
    setQuality,
    render: (scene, camera) => renderer.render(scene, camera),
    dispose: () => renderer.dispose(),
  };
}
