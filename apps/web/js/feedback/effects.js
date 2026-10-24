import * as THREE from "three";
import { fartSamples } from "./fart-audio.js";
import { disposeObject } from "../core/procedural.js";
/** Fixed-size procedural splash pool and opt-in synthesized feedback; no gameplay state. */
export function createFeedback() {
  const root = new THREE.Group(),
    dummy = new THREE.Object3D(),
    pool = Array.from({ length: 64 }, () => ({ age: 2 }));
  const drops = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.075, 0),
    new THREE.MeshBasicMaterial({ color: "#e8fff1" }),
    pool.length,
  );
  drops.frustumCulled = false;
  root.add(drops);
  const fumes = Array.from({ length: 96 }, () => ({ age: 2 })),
    opacity = new Float32Array(96);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  const gradient = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  gradient.addColorStop(0, "rgba(160,178,97,.6)");
  gradient.addColorStop(0.35, "rgba(125,150,77,.45)");
  gradient.addColorStop(0.7, "rgba(93,121,64,.14)");
  gradient.addColorStop(1, "rgba(93,121,64,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas),
    geometry = new THREE.PlaneGeometry(1, 1);
  geometry.setAttribute(
    "particleAlpha",
    new THREE.InstancedBufferAttribute(opacity, 1),
  );
  const cloudMaterial = new THREE.ShaderMaterial({
    uniforms: { map: { value: texture } },
    transparent: true,
    depthWrite: false,
    vertexShader: `attribute float particleAlpha;varying float alpha;varying vec2 texUv;void main(){alpha=particleAlpha;texUv=uv;gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);}`,
    fragmentShader: `uniform sampler2D map;varying float alpha;varying vec2 texUv;void main(){vec4 c=texture2D(map,texUv);gl_FragColor=vec4(c.rgb,c.a*alpha);}`,
  });
  const clouds = new THREE.InstancedMesh(geometry, cloudMaterial, fumes.length);
  clouds.frustumCulled = false;
  root.add(clouds);
  let gasCursor = 0,
    lastSound = -10;
  let cursor = 0,
    audio = null,
    enabled = true;
  const voices = new Map(), buffers = new Map(), listeners = new AbortController();
  let focused = true;
  const silence = () => { focused = false; for (const slot of voices.keys()) stopVoice(slot); };
  window.addEventListener("blur", silence, { signal: listeners.signal });
  window.addEventListener("focus", () => { focused = true; }, { signal: listeners.signal });
  document.addEventListener("visibilitychange", () => { if (document.hidden) silence(); else focused = true; }, { signal: listeners.signal });
  function stopVoice(slot) {
    const voice = voices.get(slot);
    if (!voice || !audio) return;
    voice.gain.gain.cancelScheduledValues(audio.currentTime);
    voice.gain.gain.setTargetAtTime(0, audio.currentTime, 0.025);
    voice.source.stop(audio.currentTime + 0.12);
    voices.delete(slot);
  }
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  return {
    root,
    unlock() {
      if (!enabled) return;
      try {
        audio ??= new AudioContext();
        audio.resume().catch(() => {});
      } catch {
        /* Audio is optional. */
      }
    },
    setEnabled(value) {
      enabled = value;
      if (!enabled) for (const slot of voices.keys()) stopVoice(slot);
    },
    thrust(slots) {
      const active = new Set(enabled && focused && audio?.state === "running" ? slots : []);
      for (const slot of voices.keys()) if (!active.has(slot)) stopVoice(slot);
      if (!audio) return;
      for (const slot of active) {
        if (voices.has(slot)) continue;
        let buffer = buffers.get(slot);
        if (!buffer) {
          const samples = fartSamples(audio.sampleRate, slot, false, true);
          buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
          buffer.copyToChannel(samples, 0);
          buffers.set(slot, buffer);
        }
        const source = audio.createBufferSource(), filter = audio.createBiquadFilter(), gain = audio.createGain();
        source.buffer = buffer;
        source.loop = true;
        filter.type = "lowpass";
        filter.frequency.value = 1600 + slot * 180;
        filter.Q.value = 0.65;
        gain.gain.setValueAtTime(0, audio.currentTime);
        gain.gain.linearRampToValueAtTime(0.24, audio.currentTime + 0.035);
        source.connect(filter).connect(gain).connect(audio.destination);
        source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
        voices.set(slot, { source, gain });
        source.start();
      }
    },
    gas(position, direction, slot = 0) {
      if (reduced) return;
      for (let i = 0; i < 12; i++)
        Object.assign(fumes[gasCursor++ % fumes.length], {
          age: -i * 0.014,
          x: position.x,
          y: position.y,
          z: position.z,
          vx: direction.x * (2.1 + i * 0.08),
          vz: direction.z * (2.1 + i * 0.08),
          offset: i * 0.7,
        });
      // Colour remains subtle; player identity is also shown as a numbered deck ring.
      void slot;
    },
    sound(type, slot = 0) {
      if (!enabled || !audio || audio.state !== "running") return;
      if (type === "fart" || type === "puncture") {
        const now = audio.currentTime;
        if (now - lastSound < 0.045) return;
        lastSound = now;
        const samples = fartSamples(
            audio.sampleRate,
            slot,
            type === "puncture",
          ),
          buffer = audio.createBuffer(1, samples.length, audio.sampleRate);
        buffer.copyToChannel(samples, 0);
        const source = audio.createBufferSource(),
          filter = audio.createBiquadFilter(),
          gain = audio.createGain();
        source.buffer = buffer;
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(type === "puncture" ? 2800 : 1100, now);
        filter.frequency.exponentialRampToValueAtTime(
          180,
          now + buffer.duration,
        );
        filter.Q.value = 0.8;
        gain.gain.value = type === "puncture" ? 0.38 : 0.58;
        source.connect(filter).connect(gain).connect(audio.destination);
        source.start(now);
        source.onended = () => {
          source.disconnect();
          filter.disconnect();
          gain.disconnect();
        };
        return;
      }
      const oscillator = audio.createOscillator(),
        gain = audio.createGain(),
        now = audio.currentTime;
      const [frequency, end, length] =
        type === "collected"
          ? [620, 980, 0.16]
          : type === "collision"
            ? [100, 45, 0.16]
            : [230, 85, 0.09];
      oscillator.type = type === "collision" ? "triangle" : "sine";
      oscillator.frequency.setValueAtTime(frequency, now);
      oscillator.frequency.exponentialRampToValueAtTime(end, now + length);
      gain.gain.setValueAtTime(0.035, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + length);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(now);
      oscillator.stop(now + length);
      oscillator.onended = () => {
        oscillator.disconnect();
        gain.disconnect();
      };
    },
    splash(position, strength = 1) {
      if (reduced) return;
      for (let i = 0; i < 8; i++) {
        const p = pool[cursor++ % pool.length],
          angle = (i / 8) * Math.PI * 2;
        Object.assign(p, {
          x: position.x,
          z: position.z,
          age: 0,
          vx: Math.cos(angle) * strength,
          vz: Math.sin(angle) * strength,
        });
      }
    },
    update(dt, camera) {
      pool.forEach((p, i) => {
        p.age += dt;
        const t = p.age;
        dummy.position.set(
          (p.x || 0) + (p.vx || 0) * t,
          0.15 + 2 * t - 3 * t * t,
          (p.z || 0) + (p.vz || 0) * t,
        );
        dummy.scale.setScalar(t < 0.7 ? 1 - t / 0.7 : 0);
        dummy.updateMatrix();
        drops.setMatrixAt(i, dummy.matrix);
      });
      drops.instanceMatrix.needsUpdate = true;
      fumes.forEach((p, i) => {
        p.age += dt;
        const t = p.age,
          visible = t >= 0 && t < 1.1;
        const travel = (1 - Math.exp(-t * 1.8)) / 1.8;
        dummy.position.set(
          (p.x || 0) +
            (p.vx || 0) * travel +
            Math.sin(t * 7 + (p.offset || 0)) * 0.06,
          (p.y || 0) + t * 0.3,
          (p.z || 0) + (p.vz || 0) * travel,
        );
        if (camera) dummy.quaternion.copy(camera.quaternion);
        const size = visible ? 0.3 + t * 1.15 : 0;
        dummy.scale.set(size * 1.3, size, 1);
        dummy.updateMatrix();
        clouds.setMatrixAt(i, dummy.matrix);
        opacity[i] = visible
          ? Math.min(1, t * 22) * Math.pow(1 - t / 1.1, 1.7) * 0.72
          : 0;
      });
      geometry.attributes.particleAlpha.needsUpdate = true;
      clouds.instanceMatrix.needsUpdate = true;
    },
    dispose() {
      listeners.abort();
      for (const slot of voices.keys()) stopVoice(slot);
      texture.dispose();
      disposeObject(root);
      audio?.close();
    },
  };
}
