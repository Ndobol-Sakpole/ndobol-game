/** Original procedural pressure flutter. A loop sustains as long as thrust is held.
 * Pulse train + filtered turbulence, with irregular flutter and a falling one-shot tail.
 * Reference catalogue (not sampled): docs/visual-audio.md.
 */
export function fartSamples(sampleRate, variant = 0, puncture = false, sustained = false) {
  const duration = sustained ? 2 : puncture ? 0.38 : 0.6 + (variant % 3) * 0.08;
  const data = new Float32Array(Math.ceil(sampleRate * duration));
  let phase = 0, seed = 811 + variant * 113, low = 0, previous = 0, dc = 0;
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate, u = t / duration;
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    const noise = (seed >>> 0) / 2147483648 - 1;
    low += Math.min(1, 2100 / sampleRate) * (noise - low);
    const flutter = Math.sin(t * Math.PI * 2 * 11) + 0.4 * Math.sin(t * Math.PI * 2 * 17.5);
    phase += (52 + variant * 6 + flutter * 12 - (sustained ? 0 : u * 20)) / sampleRate;
    const a = phase * Math.PI * 2;
    // Narrow asymmetric pulses produce a raspy "brrrt", not a pure musical note.
    const pulse = Math.tanh(3.2 * (Math.sin(a) + 0.48 * Math.sin(a * 2 + 0.7)));
    const pressure = 0.6 + 0.25 * flutter;
    const body = puncture ? low * 2 : pulse * 0.38 * pressure + low * 1.7 * (0.45 + Math.abs(pulse));
    const envelope = sustained ? 1 : Math.min(1, t / 0.008) * Math.pow(1 - u, 1.4);
    const value = body * envelope;
    dc = value - previous + 0.995 * dc;
    previous = value;
    data[i] = Math.tanh(dc * 1.4) * 0.72;
  }
  if (sustained) {
    // Overlap the end into the beginning; remove a hard loop-boundary click.
    const fade = Math.floor(sampleRate * 0.04);
    for (let i = 0; i < fade; i++) {
      const t = i / fade;
      data[data.length - fade + i] = data[data.length - fade + i] * (1 - t) + data[i] * t;
    }
    return data.slice(fade);
  }
  return data;
}
