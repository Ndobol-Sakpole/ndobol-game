export function createDebug(bus) {
  const $ = (id) => document.getElementById(id),
    samples = [],
    controls = new AbortController(),
    opts = { signal: controls.signal };
  let elapsed = 0,
    frames = 0,
    current = { fps: 0, drawCalls: 0, triangles: 0 };
  function toggle(open) {
    $("debug-panel").hidden = !open;
    $("debug-toggle").setAttribute("aria-expanded", String(open));
  }
  $("debug-toggle").addEventListener(
    "click",
    () => toggle($("debug-panel").hidden),
    opts,
  );
  $("debug-close").addEventListener(
    "click",
    () => {
      toggle(false);
      $("debug-toggle").focus();
    },
    opts,
  );
  window.addEventListener(
    "keydown",
    (e) => {
      if (e.code === "Escape") toggle(false);
    },
    opts,
  );
  for (const [id, event] of [
    ["track-select", "track"],
    ["quality-select", "quality"],
    ["camera-select", "camera"],
  ])
    $(id).addEventListener(
      "change",
      (e) => bus.emit(event, e.target.value),
      opts,
    );
  $("ambient").addEventListener(
    "change",
    (e) => bus.emit("ambient", e.target.checked),
    opts,
  );
  return {
    sample(dt, info) {
      if (dt <= 0 || document.hidden) return;
      elapsed += dt;
      frames++;
      if (elapsed >= 0.5) {
        current = {
          fps: Math.round(frames / elapsed),
          drawCalls: info.render.calls,
          triangles: info.render.triangles,
        };
        samples.push(current);
        if (samples.length > 120) samples.shift();
        $("fps").textContent = current.fps;
        $("draw-calls").textContent = current.drawCalls;
        const mean =
          samples.reduce((sum, s) => sum + s.fps, 0) / samples.length;
        $("perf-summary").textContent =
          `FPS avg ${mean.toFixed(1)} / min ${Math.min(...samples.map((s) => s.fps))} · ${samples.length} × 0.5s samples`;
        frames = 0;
        elapsed = 0;
      }
    },
    setQuality(name, quality) {
      samples.length = 0;
      elapsed = 0;
      frames = 0;
      $("quality-select").value = name;
      $("quality-description").textContent = quality.description;
    },
    snapshot: () => ({ ...current, samples: samples.slice() }),
    dispose() {
      controls.abort();
    },
  };
}
