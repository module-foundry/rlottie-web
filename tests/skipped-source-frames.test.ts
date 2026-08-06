import { describe, expect, it } from "vitest";

import { countSkippedSourceFrames } from "#core/workers/skipped-source-frames";

describe("countSkippedSourceFrames", () => {
  it("counts forward source frames skipped between renders", () => {
    expect(countSkippedSourceFrames(10, 11, 60, 1, 1)).toBe(0);
    expect(countSkippedSourceFrames(10, 13, 60, 1, 1)).toBe(2);
    expect(countSkippedSourceFrames(59, 1, 60, 1, 1)).toBe(1);
  });

  it("respects reverse playback and intentional frame steps", () => {
    expect(countSkippedSourceFrames(10, 9, 60, -1, 1)).toBe(0);
    expect(countSkippedSourceFrames(10, 7, 60, -1, 1)).toBe(2);
    expect(countSkippedSourceFrames(10, 6, 60, -1, 2)).toBe(1);
  });

  it("does not count the first rendered frame as dropped", () => {
    expect(countSkippedSourceFrames(-1, 20, 60, 1, 1)).toBe(0);
  });
});
