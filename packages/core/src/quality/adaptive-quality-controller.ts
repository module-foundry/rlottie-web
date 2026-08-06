import {
  ADAPTIVE_BAD_WINDOW_LIMIT,
  ADAPTIVE_DROPPED_RATIO_LIMIT,
  ADAPTIVE_FPS_STEP,
  ADAPTIVE_GOOD_WINDOW_LIMIT,
  ADAPTIVE_LOAD_RATIO_LIMIT,
} from "#core/constants/index";
import type {
  AdaptiveQualityOptions,
  AdaptiveQualityState,
  QualityTelemetry,
} from "#core/types/index";

export class AdaptiveQualityController {
  #badWindows = 0;
  #goodWindows = 0;
  readonly #options: Required<AdaptiveQualityOptions>;
  #state: AdaptiveQualityState;

  public constructor(options: Required<AdaptiveQualityOptions>, baseFps: number) {
    this.#options = options;
    this.#state = { scale: 1, fps: baseFps, reason: "base" };
  }

  public reset(baseFps: number): void {
    this.#badWindows = 0;
    this.#goodWindows = 0;
    this.#state = { scale: 1, fps: baseFps, reason: "base" };
  }

  public sample(telemetry: QualityTelemetry, baseFps: number): AdaptiveQualityState {
    if (!this.#options.enabled) {
      return this.#state;
    }

    const overloaded = this.#isOverloaded(telemetry);

    this.#badWindows = overloaded ? this.#badWindows + 1 : 0;
    this.#goodWindows = overloaded ? 0 : this.#goodWindows + 1;

    if (this.#badWindows >= ADAPTIVE_BAD_WINDOW_LIMIT) {
      this.#degrade();
    }

    if (this.#goodWindows >= ADAPTIVE_GOOD_WINDOW_LIMIT) {
      this.#recover(baseFps);
    }

    return this.#state;
  }

  public get state(): AdaptiveQualityState {
    return this.#state;
  }

  #degrade(): void {
    this.#badWindows = 0;

    if (this.#state.scale > this.#options.minResolutionScale) {
      this.#state = {
        ...this.#state,
        reason: "adaptive-pressure",
        scale: Math.max(this.#options.minResolutionScale, this.#state.scale - this.#options.step),
      };

      return;
    }

    if (this.#options.allowFpsReduction) {
      this.#state = {
        ...this.#state,
        reason: "adaptive-pressure",
        fps: Math.max(this.#options.minFps, this.#state.fps - ADAPTIVE_FPS_STEP),
      };
    }
  }

  #isOverloaded(telemetry: QualityTelemetry): boolean {
    return (
      telemetry.renderBudgetRatio > ADAPTIVE_LOAD_RATIO_LIMIT ||
      telemetry.workerUtilization > ADAPTIVE_LOAD_RATIO_LIMIT ||
      telemetry.droppedRatio > ADAPTIVE_DROPPED_RATIO_LIMIT
    );
  }

  #recover(baseFps: number): void {
    this.#goodWindows = 0;

    if (this.#state.fps < baseFps) {
      this.#state = {
        ...this.#state,
        reason: "adaptive-recovery",
        fps: Math.min(baseFps, this.#state.fps + ADAPTIVE_FPS_STEP),
      };

      return;
    }

    if (this.#state.scale < 1) {
      this.#state = {
        ...this.#state,
        reason: "adaptive-recovery",
        scale: Math.min(1, this.#state.scale + this.#options.step),
      };

      return;
    }

    this.#state = { scale: 1, fps: baseFps, reason: "base" };
  }
}
