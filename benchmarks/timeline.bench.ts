import { bench, describe } from "vitest";

import { frameAtTime } from "#core/player/timeline";
import { FrameRateLimiter } from "#core/workers/frame-rate-limiter";

const metadata = { width: 512, duration: 2, height: 512, frameRate: 60, totalFrames: 120 };
const limiter = new FrameRateLimiter();

describe("timeline hot path", () => {
  bench("time to quantized frame", () => {
    frameAtTime(performance.now() % metadata.duration, metadata, 1, 2);
  });

  bench("rate-limit render deadline", () => {
    limiter.consume(performance.now(), metadata.frameRate, true);
  });
});
