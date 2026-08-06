import {
  DEFAULT_ADAPTIVE_MIN_FPS,
  DEFAULT_ADAPTIVE_MIN_SCALE,
  DEFAULT_ADAPTIVE_SCALE_STEP,
  DEFAULT_FRAME_RATE,
  DEFAULT_MAX_PIXEL_RATIO,
  DEFAULT_MAX_RENDER_PIXELS,
} from "#core/constants/index";
import type {
  AdaptiveQualityOptions,
  ResolvedBehaviorOptions,
  ResolvedOptions,
  ResolvedPlaybackOptions,
  ResolvedRenderingOptions,
  RLottieOptions,
  RLottieQualitySnapshot,
} from "#core/types/index";
import { assertPositive } from "#core/utils/assert-positive";

const DEFAULT_ADAPTIVE_QUALITY: Required<AdaptiveQualityOptions> = {
  enabled: false,
  allowFpsReduction: false,
  minFps: DEFAULT_ADAPTIVE_MIN_FPS,
  step: DEFAULT_ADAPTIVE_SCALE_STEP,
  minResolutionScale: DEFAULT_ADAPTIVE_MIN_SCALE,
};

export const EMPTY_QUALITY: RLottieQualitySnapshot = {
  reason: "base",
  effectiveFrameStep: 1,
  adaptiveResolutionScale: 1,
  effectiveResolutionScale: 1,
  effectiveFps: DEFAULT_FRAME_RATE,
  resolution: { width: 0, height: 0 },
};

const resolveAdaptiveQuality = (
  adaptiveQuality: RLottieOptions["adaptiveQuality"],
): Required<AdaptiveQualityOptions> => {
  if (typeof adaptiveQuality === "object") {
    return { ...DEFAULT_ADAPTIVE_QUALITY, ...adaptiveQuality };
  }

  return {
    ...DEFAULT_ADAPTIVE_QUALITY,
    enabled: adaptiveQuality ?? false,
  };
};

const resolveBehaviorOptions = (options: RLottieOptions): ResolvedBehaviorOptions => ({
  playing: options.playing,
  autoplay: options.autoplay ?? true,
  responsive: options.responsive ?? [],
  playOnHover: options.playOnHover ?? false,
  visibility: options.visibility ?? "pause",
});

const resolvePlaybackOptions = (options: RLottieOptions): ResolvedPlaybackOptions => ({
  loop: options.loop ?? true,
  fit: options.fit ?? "contain",
  direction: options.direction ?? 1,
  frameStep: options.frameStep ?? 1,
  posterFrame: options.posterFrame ?? 0,
  fps: options.fps ?? DEFAULT_FRAME_RATE,
  playbackRate: options.playbackRate ?? 1,
});

const resolveRenderingOptions = (options: RLottieOptions): ResolvedRenderingOptions => ({
  resolution: options.resolution ?? "auto",
  pixelRatio: options.pixelRatio ?? "device",
  resolutionScale: options.resolutionScale ?? 1,
  maxPixelRatio: options.maxPixelRatio ?? DEFAULT_MAX_PIXEL_RATIO,
  maxRenderPixels: options.maxRenderPixels ?? DEFAULT_MAX_RENDER_PIXELS,
});

export const validateResolvedOptions = (options: ResolvedOptions): void => {
  assertPositive(options.playbackRate, "playbackRate");
  assertPositive(options.resolutionScale, "resolutionScale");
  assertPositive(options.maxPixelRatio, "maxPixelRatio");
  assertPositive(options.maxRenderPixels, "maxRenderPixels");

  if (options.fps !== "source") {
    assertPositive(options.fps, "fps");
  }

  if (!Number.isInteger(options.frameStep) || options.frameStep < 1) {
    throw new RangeError("frameStep must be a positive integer");
  }

  if (typeof options.loop === "number" && (!Number.isInteger(options.loop) || options.loop < 1)) {
    throw new RangeError("loop must be a positive integer");
  }

  if (options.resolution !== "auto") {
    assertPositive(options.resolution.width, "resolution.width");
    assertPositive(options.resolution.height, "resolution.height");
  }

  const adaptive = options.adaptiveQuality;

  if (adaptive.minResolutionScale <= 0 || adaptive.minResolutionScale > 1) {
    throw new RangeError("minResolutionScale must be in (0, 1]");
  }

  if (adaptive.step <= 0 || adaptive.step > 1) {
    throw new RangeError("adaptive quality step must be in (0, 1]");
  }

  assertPositive(adaptive.minFps, "minFps");
};

export const resolveOptions = (options: RLottieOptions = {}): ResolvedOptions => {
  const resolved: ResolvedOptions = {
    ...resolveBehaviorOptions(options),
    ...resolvePlaybackOptions(options),
    ...resolveRenderingOptions(options),
    adaptiveQuality: resolveAdaptiveQuality(options.adaptiveQuality),
  };

  validateResolvedOptions(resolved);

  return resolved;
};
