import type { RLottieQualitySnapshot } from "@module-foundry/rlottie-web";

const DEFAULT_FRAME_RATE = 24;

export const INITIAL_QUALITY: RLottieQualitySnapshot = {
  reason: "base",
  effectiveFrameStep: 1,
  adaptiveResolutionScale: 1,
  effectiveResolutionScale: 1,
  effectiveFps: DEFAULT_FRAME_RATE,
  resolution: { width: 0, height: 0 },
};
