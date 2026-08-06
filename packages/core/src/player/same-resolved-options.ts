import type { RenderProfile, ResolvedOptions, ResponsiveRule } from "#core/types/index";

const sameResolution = (
  left: ResolvedOptions["resolution"],
  right: ResolvedOptions["resolution"],
): boolean => {
  if (left === "auto" || right === "auto") {
    return left === right;
  }

  return left.width === right.width && left.height === right.height;
};

const sameRenderProfile = (left: RenderProfile, right: RenderProfile): boolean =>
  left.fps === right.fps &&
  left.frameStep === right.frameStep &&
  left.maxPixelRatio === right.maxPixelRatio &&
  left.maxRenderPixels === right.maxRenderPixels &&
  left.pixelRatio === right.pixelRatio &&
  left.resolutionScale === right.resolutionScale &&
  (left.resolution === undefined || right.resolution === undefined
    ? left.resolution === right.resolution
    : sameResolution(left.resolution, right.resolution));

const sameResponsiveRule = (left: ResponsiveRule, right: ResponsiveRule): boolean =>
  sameRenderProfile(left, right) &&
  left.when.maxCanvasWidth === right.when.maxCanvasWidth &&
  left.when.media === right.when.media &&
  left.when.minCanvasWidth === right.when.minCanvasWidth;

const sameResponsiveRules = (left: ResponsiveRule[], right: ResponsiveRule[]): boolean => {
  if (left.length !== right.length) {
    return false;
  }

  for (let index = 0; index < left.length; index += 1) {
    const leftRule = left[index];
    const rightRule = right[index];

    if (
      leftRule === undefined ||
      rightRule === undefined ||
      !sameResponsiveRule(leftRule, rightRule)
    ) {
      return false;
    }
  }

  return true;
};

const sameAdaptiveQuality = (left: ResolvedOptions, right: ResolvedOptions): boolean =>
  left.adaptiveQuality.enabled === right.adaptiveQuality.enabled &&
  left.adaptiveQuality.allowFpsReduction === right.adaptiveQuality.allowFpsReduction &&
  left.adaptiveQuality.minFps === right.adaptiveQuality.minFps &&
  left.adaptiveQuality.minResolutionScale === right.adaptiveQuality.minResolutionScale &&
  left.adaptiveQuality.step === right.adaptiveQuality.step;

const sameBehavior = (left: ResolvedOptions, right: ResolvedOptions): boolean =>
  left.autoplay === right.autoplay &&
  left.playing === right.playing &&
  left.playOnHover === right.playOnHover &&
  left.visibility === right.visibility;

const samePlayback = (left: ResolvedOptions, right: ResolvedOptions): boolean =>
  left.direction === right.direction &&
  left.fit === right.fit &&
  left.loop === right.loop &&
  left.playbackRate === right.playbackRate &&
  left.posterFrame === right.posterFrame;

export const sameResolvedOptions = (left: ResolvedOptions, right: ResolvedOptions): boolean =>
  sameRenderProfile(left, right) &&
  sameAdaptiveQuality(left, right) &&
  sameBehavior(left, right) &&
  samePlayback(left, right) &&
  sameResponsiveRules(left.responsive, right.responsive);
