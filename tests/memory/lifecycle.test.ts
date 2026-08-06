import { describe, expect, it, vi } from "vitest";

import { ExternalStore } from "#core/store/external-store";

const snapshot = {
  error: null,
  metadata: null,
  status: "idle" as const,
  quality: {
    effectiveFps: 24,
    effectiveFrameStep: 1,
    reason: "base" as const,
    adaptiveResolutionScale: 1,
    effectiveResolutionScale: 1,
    resolution: { width: 0, height: 0 },
  },
};

describe("bounded JS lifecycle", () => {
  it("releases all external-store listeners idempotently", () => {
    const store = new ExternalStore(snapshot);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);
    store.clear();
    store.clear();
    unsubscribe();
    store.publish({ ...snapshot, status: "loading" });
    expect(listener).not.toHaveBeenCalled();
  });
});
