import { describe, expect, it } from "vitest";

import { frameAtTime, quantizeFrame, seekToTime } from "#core/player/timeline";

const metadata = { height: 64, width: 128, duration: 2, frameRate: 30, totalFrames: 60 };

describe("timeline", () => {
  it("quantizes without changing timeline duration", () => {
    expect(quantizeFrame(17, 3)).toBe(15);
    expect(frameAtTime(0.59, metadata, 1, 2)).toBe(16);
    expect(frameAtTime(0.59, metadata, -1, 2)).toBe(42);
  });

  it("keeps exact seek targets", () => {
    expect(seekToTime({ progress: 0.5 }, metadata)).toBe(1);
    expect(seekToTime({ frame: 15 }, metadata)).toBe(0.5);
    expect(seekToTime({ time: 99 }, metadata)).toBe(2);
  });
});
