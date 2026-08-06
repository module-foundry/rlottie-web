import type { RLottieQualitySnapshot } from "#core/types/index";

export const sameQualitySnapshot = (
  left: RLottieQualitySnapshot,
  right: RLottieQualitySnapshot,
): boolean =>
  left.reason === right.reason &&
  left.effectiveFrameStep === right.effectiveFrameStep &&
  left.adaptiveResolutionScale === right.adaptiveResolutionScale &&
  left.effectiveResolutionScale === right.effectiveResolutionScale &&
  left.effectiveFps === right.effectiveFps &&
  left.resolution.width === right.resolution.width &&
  left.resolution.height === right.resolution.height;
