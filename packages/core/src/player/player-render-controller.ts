import { DEFAULT_FRAME_RATE, MILLISECONDS_PER_SECOND } from "#core/constants/index";
import { AdaptiveQualityController } from "#core/quality/adaptive-quality-controller";
import { calculateRenderSize, resolveRenderProfile } from "#core/sizing/render-size";
import type {
  PlayerRenderCallbacks,
  RLottieDiagnostics,
  Size,
  WorkerPlaybackOptions,
} from "#core/types/index";

export class PlayerRenderController {
  #adaptive: AdaptiveQualityController;
  readonly #callbacks: PlayerRenderCallbacks;
  readonly #canvas: HTMLCanvasElement;

  public constructor(canvas: HTMLCanvasElement, callbacks: PlayerRenderCallbacks) {
    this.#canvas = canvas;
    this.#callbacks = callbacks;

    const options = callbacks.getOptions();
    const initialFps = options.fps === "source" ? DEFAULT_FRAME_RATE : options.fps;

    this.#adaptive = new AdaptiveQualityController(options.adaptiveQuality, initialFps);
  }

  public get baseFps(): number {
    const options = this.#callbacks.getOptions();

    return options.fps === "source"
      ? (this.#callbacks.getMetadata()?.frameRate ?? DEFAULT_FRAME_RATE)
      : options.fps;
  }

  public reset(): void {
    const options = this.#callbacks.getOptions();

    this.#adaptive = new AdaptiveQualityController(options.adaptiveQuality, this.baseFps);
  }

  public resetQuality(): void {
    this.#adaptive.reset(this.baseFps);
  }

  public resize(): Size {
    const options = this.#callbacks.getOptions();
    const rectangle = this.#canvas.getBoundingClientRect();
    const profile = resolveRenderProfile(
      options,
      rectangle.width,
      query => window.matchMedia(query).matches,
    );
    const adaptive = this.#adaptive.state;
    const size = calculateRenderSize(
      { width: rectangle.width, height: rectangle.height },
      profile,
      window.devicePixelRatio || 1,
      adaptive.scale,
    );

    this.#callbacks.post({
      type: "resize",
      fit: options.fit,
      width: size.width,
      height: size.height,
      playerId: this.#callbacks.playerId,
    });
    this.#callbacks.publishQuality({
      resolution: size,
      reason: adaptive.reason,
      effectiveFps: adaptive.fps,
      effectiveFrameStep: profile.frameStep,
      adaptiveResolutionScale: adaptive.scale,
      effectiveResolutionScale: profile.resolutionScale * adaptive.scale,
    });

    return size;
  }

  public sample(diagnostics: RLottieDiagnostics): boolean {
    const budget = MILLISECONDS_PER_SECOND / this.baseFps;
    const previous = this.#adaptive.state;
    const attemptedFrames = diagnostics.renderedFrames + diagnostics.droppedFrames;
    const next = this.#adaptive.sample(
      {
        renderBudgetRatio: diagnostics.renderAverageMs / budget,
        workerUtilization: diagnostics.renderAverageMs / budget,
        droppedRatio: attemptedFrames === 0 ? 0 : diagnostics.droppedFrames / attemptedFrames,
      },
      this.baseFps,
    );

    return next !== previous;
  }

  public workerOptions(): WorkerPlaybackOptions {
    const options = this.#callbacks.getOptions();
    const quality = this.#adaptive.state;

    return {
      fit: options.fit,
      fps: quality.fps,
      loop: options.loop,
      direction: options.direction,
      frameStep: options.frameStep,
      playbackRate: options.playbackRate,
    };
  }
}
