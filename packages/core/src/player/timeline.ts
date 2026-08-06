import type { RLottieMetadata, RLottieSeekTarget } from "#core/types/index";
import { clamp } from "#core/utils/clamp";

export const quantizeFrame = (frame: number, frameStep: number, exact = false): number => {
  if (exact) {
    return Math.floor(frame);
  }

  return Math.floor(frame / frameStep) * frameStep;
};

export const frameAtTime = (
  timeSeconds: number,
  metadata: RLottieMetadata,
  direction: 1 | -1,
  frameStep: number,
): number => {
  const rawFrame = Math.min(metadata.totalFrames - 1, Math.floor(timeSeconds * metadata.frameRate));
  const directedFrame = direction === 1 ? rawFrame : metadata.totalFrames - 1 - rawFrame;

  return Math.max(0, quantizeFrame(directedFrame, frameStep));
};

export const seekToTime = (target: RLottieSeekTarget, metadata: RLottieMetadata): number => {
  if ("time" in target) {
    return clamp(target.time, 0, metadata.duration);
  }

  if ("progress" in target) {
    return clamp(target.progress, 0, 1) * metadata.duration;
  }

  return clamp(target.frame, 0, metadata.totalFrames - 1) / metadata.frameRate;
};
