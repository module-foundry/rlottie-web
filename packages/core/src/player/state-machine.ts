import type { RLottieStatus } from "#core/types/index";

const TRANSITIONS: Readonly<Record<RLottieStatus, ReadonlySet<RLottieStatus>>> = {
  destroyed: new Set(),
  error: new Set(["loading", "destroyed"]),
  idle: new Set(["initializing", "loading", "destroyed"]),
  initializing: new Set(["loading", "error", "destroyed"]),
  stopped: new Set(["loading", "playing", "paused", "destroyed"]),
  completed: new Set(["loading", "playing", "stopped", "destroyed"]),
  paused: new Set(["loading", "playing", "stopped", "error", "destroyed"]),
  ready: new Set(["loading", "playing", "paused", "stopped", "destroyed"]),
  loading: new Set(["loading", "ready", "playing", "paused", "error", "destroyed"]),
  playing: new Set(["loading", "paused", "stopped", "completed", "error", "destroyed"]),
};

export const canTransition = (from: RLottieStatus, to: RLottieStatus): boolean =>
  from === to || TRANSITIONS[from].has(to);
