export const PHASES = Object.freeze([
  "lobby",
  "countdown",
  "running",
  "finished",
  "results",
]);
const next = Object.freeze({
  lobby: ["countdown"],
  countdown: ["running", "lobby"],
  running: ["finished"],
  finished: ["results"],
  results: ["lobby"],
});
export function canTransition(from, to) {
  return next[from]?.includes(to) === true;
}
export function transition(state, phase) {
  if (!canTransition(state.phase, phase))
    throw new Error(`Invalid round transition ${state.phase} -> ${phase}`);
  state.phase = phase;
  state.phaseTime = 0;
}
