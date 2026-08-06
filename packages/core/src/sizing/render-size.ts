import { RLottieError } from "#core/errors/rlottie-error";
import type {
  FitMode,
  Rect,
  RenderProfile,
  ResolvedOptions,
  ResolvedRenderProfile,
  ResponsiveRule,
  Size,
} from "#core/types/index";

const pickProfile = (options: ResolvedOptions): ResolvedRenderProfile => ({
  fps: options.fps,
  frameStep: options.frameStep,
  pixelRatio: options.pixelRatio,
  resolution: options.resolution,
  maxPixelRatio: options.maxPixelRatio,
  maxRenderPixels: options.maxRenderPixels,
  resolutionScale: options.resolutionScale,
});

const matchesRule = (
  rule: ResponsiveRule,
  width: number,
  mediaMatches: (query: string) => boolean,
): boolean => {
  const { when } = rule;

  if (when.minCanvasWidth !== undefined && width < when.minCanvasWidth) {
    return false;
  }

  if (when.maxCanvasWidth !== undefined && width > when.maxCanvasWidth) {
    return false;
  }

  return when.media === undefined || mediaMatches(when.media);
};

const mergeProfile = (
  base: ResolvedRenderProfile,
  override: RenderProfile,
): ResolvedRenderProfile => ({
  fps: override.fps ?? base.fps,
  frameStep: override.frameStep ?? base.frameStep,
  pixelRatio: override.pixelRatio ?? base.pixelRatio,
  resolution: override.resolution ?? base.resolution,
  maxPixelRatio: override.maxPixelRatio ?? base.maxPixelRatio,
  maxRenderPixels: override.maxRenderPixels ?? base.maxRenderPixels,
  resolutionScale: override.resolutionScale ?? base.resolutionScale,
});

export const resolveRenderProfile = (
  options: ResolvedOptions,
  canvasWidth: number,
  mediaMatches: (query: string) => boolean,
): ResolvedRenderProfile => {
  let profile = pickProfile(options);

  for (const rule of options.responsive) {
    if (matchesRule(rule, canvasWidth, mediaMatches)) {
      profile = mergeProfile(profile, rule);
    }
  }

  return profile;
};

export const calculateRenderSize = (
  css: Size,
  profile: ResolvedRenderProfile,
  devicePixelRatio: number,
  adaptiveScale = 1,
): Size => {
  if (css.width <= 0 || css.height <= 0) {
    return { width: 0, height: 0 };
  }

  const base = profile.resolution === "auto" ? css : profile.resolution;
  const requestedPixelRatio =
    profile.pixelRatio === "device" ? devicePixelRatio : profile.pixelRatio;
  const pixelRatio = Math.min(profile.maxPixelRatio, requestedPixelRatio);
  const pixelRatioFactor = profile.resolution === "auto" ? pixelRatio : 1;
  const renderScale = pixelRatioFactor * profile.resolutionScale * adaptiveScale;
  let width = Math.max(1, Math.round(base.width * renderScale));
  let height = Math.max(1, Math.round(base.height * renderScale));
  const pixels = width * height;

  if (!Number.isSafeInteger(pixels)) {
    throw new RLottieError("RENDER_SIZE_EXCEEDED", "Render dimensions overflow");
  }

  if (pixels > profile.maxRenderPixels) {
    const limitScale = Math.sqrt(profile.maxRenderPixels / pixels);

    width = Math.max(1, Math.floor(width * limitScale));
    height = Math.max(1, Math.floor(height * limitScale));
  }

  return { width, height };
};

export const calculateFitRect = (intrinsic: Size, surface: Size, fit: FitMode): Rect => {
  if (fit === "fill") {
    return { ...surface, x: 0, y: 0 };
  }

  const scale =
    fit === "contain"
      ? Math.min(surface.width / intrinsic.width, surface.height / intrinsic.height)
      : Math.max(surface.width / intrinsic.width, surface.height / intrinsic.height);
  const width = Math.max(1, Math.round(intrinsic.width * scale));
  const height = Math.max(1, Math.round(intrinsic.height * scale));

  return {
    width,
    height,
    x: Math.round((surface.width - width) / 2),
    y: Math.round((surface.height - height) / 2),
  };
};
