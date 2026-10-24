export function createEventBus() {
  const listeners = new Map();
  return {
    on(type, listener) {
      if (!listeners.has(type)) listeners.set(type, new Set());
      listeners.get(type).add(listener);
      return () => listeners.get(type)?.delete(listener);
    },
    emit(type, payload) {
      for (const listener of listeners.get(type) || []) listener(payload);
    },
    clear() {
      listeners.clear();
    },
  };
}
