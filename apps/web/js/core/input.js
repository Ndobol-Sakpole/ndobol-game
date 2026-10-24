const keys = {
  KeyW: "forward",
  KeyS: "backward",
  KeyA: "left",
  KeyD: "right",
  ArrowUp: "forward",
  ArrowDown: "backward",
  ArrowLeft: "turnLeft",
  ArrowRight: "turnRight",
  KeyJ: "turnLeft",
  KeyL: "turnRight",
  Space: "fart",
  KeyQ: "reachLeft",
  KeyE: "reachRight",
};
/** sample() keeps thrust held; reach remains edge-triggered. Blur/cancel releases every control. */
export function createInput() {
  const keyboard = new Set(),
    touches = new Map(),
    controller = new AbortController(),
    options = { signal: controller.signal };
  let enabled = false,
    fart = false,
    reach = 0;
  function action(key) {
    if (key === "fart") fart = true;
    if (key === "reachLeft") reach = -1;
    if (key === "reachRight") reach = 1;
  }
  const clear = () => {
    keyboard.clear();
    touches.clear();
    fart = false;
    reach = 0;
    document
      .querySelectorAll(".pressed")
      .forEach((e) => e.classList.remove("pressed"));
  };
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        !enabled ||
        /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) ||
        (e.target.tagName === "BUTTON" && e.code === "Space") ||
        e.ctrlKey ||
        e.metaKey ||
        !keys[e.code]
      )
        return;
      e.preventDefault();
      if (!e.repeat && !keyboard.has(e.code)) action(keys[e.code]);
      keyboard.add(e.code);
    },
    options,
  );
  window.addEventListener("keyup", (e) => keyboard.delete(e.code), options);
  window.addEventListener("blur", clear, options);
  document.addEventListener("visibilitychange", clear, options);
  document.querySelectorAll("[data-key]").forEach((button) => {
    button.addEventListener(
      "pointerdown",
      (e) => {
        if (!enabled) return;
        e.preventDefault();
        button.setPointerCapture(e.pointerId);
        touches.set(e.pointerId, button.dataset.key);
        action(button.dataset.key);
        button.classList.add("pressed");
      },
      options,
    );
    const release = (e) => {
      touches.delete(e.pointerId);
      button.classList.remove("pressed");
    };
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      button.addEventListener(event, release, options);
  });
  return {
    setEnabled(value) {
      if (enabled !== value) {
        enabled = value;
        clear();
      }
    },
    sample() {
      const active = new Set(
        [...keyboard].map((k) => keys[k]).concat([...touches.values()]),
      );
      const result = {
        fart: fart || active.has("fart"),
        reach,
        moveX: Number(active.has("right")) - Number(active.has("left")),
        moveZ: Number(active.has("backward")) - Number(active.has("forward")),
        turn: Number(active.has("turnRight")) - Number(active.has("turnLeft")),
      };
      fart = false;
      reach = 0;
      return result;
    },
    dispose() {
      clear();
      controller.abort();
    },
  };
}
