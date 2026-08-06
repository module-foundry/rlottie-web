import { describe, expect, it } from "vitest";

import { isWorkerEvent } from "#core/workers/protocol";

describe("worker protocol", () => {
  it("accepts plain cloned events and rejects unrelated values", () => {
    const event = structuredClone({
      type: "state",
      currentTime: 0,
      currentFrame: 0,
      playerId: "one",
      status: "ready",
    });
    expect(isWorkerEvent(event)).toBe(true);
    expect(isWorkerEvent(null)).toBe(false);
    expect(isWorkerEvent({ type: "state" })).toBe(false);
  });
});
