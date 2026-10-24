import { FIXED_STEP } from "./config.js";
export function createLoop(update, render) {
  let previous = 0,
    accumulator = 0,
    request = 0,
    running = false;
  function frame(ms) {
    if (!running) return;
    const realDelta = previous ? (ms - previous) / 1000 : 0;
    const dt = Math.min(realDelta, 0.1);
    previous = ms;
    accumulator += dt;
    while (accumulator >= FIXED_STEP) {
      update(FIXED_STEP);
      accumulator -= FIXED_STEP;
    }
    render(accumulator / FIXED_STEP, dt, realDelta);
    request = requestAnimationFrame(frame);
  }
  const reset = () => {
    previous = 0;
    accumulator = 0;
  };
  document.addEventListener("visibilitychange", reset);
  return {
    start() {
      if (!running) {
        running = true;
        reset();
        request = requestAnimationFrame(frame);
      }
    },
    stop() {
      running = false;
      cancelAnimationFrame(request);
    },
    dispose() {
      this.stop();
      document.removeEventListener("visibilitychange", reset);
    },
  };
}
