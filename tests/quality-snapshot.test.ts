import { describe, expect, it } from "vitest";

import { sameQualitySnapshot } from "#core/player/same-quality-snapshot";
import type { RLottieQualitySnapshot } from "#core/types/index";

const QUALITY: RLottieQualitySnapshot = {
  reason: "base",
  effectiveFps: 30,
  effectiveFrameStep: 1,
  adaptiveResolutionScale: 1,
  effectiveResolutionScale: 1,
  resolution: { width: 256, height: 256 },
};

describe("sameQualitySnapshot", () => {
  it("treats equivalent freshly allocated snapshots as equal", () => {
    expect(
      sameQualitySnapshot(QUALITY, {
        ...QUALITY,
        resolution: { ...QUALITY.resolution },
      }),
    ).toBe(true);
  });

  it("detects an effective quality change", () => {
    expect(sameQualitySnapshot(QUALITY, { ...QUALITY, effectiveFps: 24 })).toBe(false);
  });
});
