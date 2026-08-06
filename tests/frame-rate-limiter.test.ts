import { describe, expect, it } from "vitest";

import { advanceDeadline, FrameRateLimiter } from "#core/workers/frame-rate-limiter";
import { nextWorkerTickDeadline } from "#core/workers/worker-tick-deadline";

describe("FrameRateLimiter", () => {
  it("preserves a 60 FPS phase across 16 millisecond worker ticks", () => {
    const limiter = new FrameRateLimiter();
    let renderedFrames = 0;

    for (let now = 0; now < 1_000; now += 16) {
      if (limiter.consume(now, 60, true) !== null) {
        renderedFrames += 1;
      }
    }

    expect(renderedFrames).toBe(60);
  });

  it("reports target slots skipped by a late tick without building a backlog", () => {
    const limiter = new FrameRateLimiter();

    expect(limiter.consume(0, 60, true)).toBe(0);
    expect(limiter.consume(51, 60, true)).toBe(2);
    expect(limiter.consume(52, 60, true)).toBeNull();
  });

  it("restarts cadence after a forced render", () => {
    const limiter = new FrameRateLimiter();

    limiter.restart(400, 60);

    expect(limiter.consume(416, 60, true)).toBeNull();
    expect(limiter.consume(417, 60, true)).toBe(0);
  });

  it("preserves a stable phase when cadence restarts", () => {
    const limiter = new FrameRateLimiter(0.25);

    limiter.restart(100, 50);

    expect(limiter.consume(124, 50, true)).toBeNull();
    expect(limiter.consume(125, 50, true)).toBe(0);
  });

  it("leaves a due deadline pending until a new source frame exists", () => {
    const limiter = new FrameRateLimiter();

    limiter.restart(0, 60);

    expect(limiter.consume(17, 60, false)).toBeNull();
    expect(limiter.consume(20, 60, true)).toBe(0);
  });
});

describe("advanceDeadline", () => {
  it("advances from the previous phase instead of the delayed observation time", () => {
    expect(advanceDeadline(16, 33, 16)).toBe(48);
  });
});

describe("nextWorkerTickDeadline", () => {
  it("does not add an idle delay after an over-budget worker sweep", () => {
    expect(nextWorkerTickDeadline(8, 0, 25, 8)).toBe(25);
  });

  it("keeps the compensated phase while worker work is within budget", () => {
    expect(nextWorkerTickDeadline(8, 8, 12, 8)).toBe(16);
  });
});
