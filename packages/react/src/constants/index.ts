import type { RLottieSnapshot } from "@module-foundry/rlottie-web";

const DEFAULT_FRAME_RATE = 24;

export const SERVER_SNAPSHOT: RLottieSnapshot = {
  error: null,
  metadata: null,
  status: "idle",
  quality: {
    reason: "base",
    effectiveFrameStep: 1,
    adaptiveResolutionScale: 1,
    effectiveResolutionScale: 1,
    effectiveFps: DEFAULT_FRAME_RATE,
    resolution: { width: 0, height: 0 },
  },
};
