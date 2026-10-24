export function waveHeight(x, z, time) {
  return (
    Math.sin(x * 0.55 + time * 1.5) * 0.07 +
    Math.sin(z * 0.38 + time * 1.1) * 0.09
  );
}
export const waveGLSL =
  "sin(p.x * 0.55 + uTime * 1.5) * 0.07 + sin(p.z * 0.38 + uTime * 1.1) * 0.09";
