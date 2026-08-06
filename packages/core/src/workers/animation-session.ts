import { MILLISECONDS_PER_SECOND } from "#core/constants/index";
import { frameAtTime } from "#core/player/timeline";
import { calculateFitRect } from "#core/sizing/render-size";
import type {
  CreateWorkerRequest,
  FitMode,
  NativeAnimation,
  NativeFactory,
  ReloadWorkerRequest,
  RenderPath,
  RLottieMetadata,
  RLottieStatus,
  WorkerEvent,
  WorkerPlaybackOptions,
} from "#core/types/index";
import { FrameRateLimiter } from "#core/workers/frame-rate-limiter";
import { RenderSurface } from "#core/workers/render-surface";
import { SessionTelemetry } from "#core/workers/session-telemetry";

export class AnimationSession {
  #baseTime = 0;
  #desiredPlaying = false;
  #destroyed = false;
  #fit: FitMode;
  #gateRender = true;
  #gateTimeline = true;
  #lastFrame = -1;
  readonly #limiter: FrameRateLimiter;
  #metadata: RLottieMetadata;
  #native: NativeAnimation;
  #options: WorkerPlaybackOptions;
  #startedAt = performance.now();
  #status: RLottieStatus = "ready";
  readonly #surface: RenderSurface;
  readonly #telemetry: SessionTelemetry;

  public constructor(
    request: CreateWorkerRequest,
    factory: NativeFactory,
    post: (event: WorkerEvent, transfer?: Transferable[]) => void,
    json: string,
  ) {
    this.#metadata = request.metadata;
    this.#fit = request.options.fit;
    this.#limiter = new FrameRateLimiter(request.renderPhase);
    this.#options = request.options;
    this.#native = factory.create(json);
    this.#surface = new RenderSurface(
      request.playerId,
      request.canvas,
      request.width,
      request.height,
      post,
    );
    this.#telemetry = new SessionTelemetry(
      request.playerId,
      request.workerId,
      () => this.#surface.renderPath,
      post,
    );
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#surface.destroy();
    this.#native.delete();
  }

  public pause(): void {
    if (this.#destroyed) {
      return;
    }

    this.#syncTime(performance.now());
    this.#desiredPlaying = false;
    this.#status = "paused";
    this.#emitState();
  }

  public play(): void {
    if (this.#destroyed) {
      return;
    }

    if (this.#status === "completed") {
      this.#baseTime = 0;
    }

    this.#startedAt = performance.now();
    this.#desiredPlaying = true;
    this.#status = "playing";
    this.#emitState();
  }

  public reload(request: ReloadWorkerRequest, factory: NativeFactory, json: string): void {
    if (this.#destroyed) {
      return;
    }

    const next = factory.create(json);

    this.#native.delete();
    this.#native = next;
    this.#metadata = request.metadata;
    this.#options = request.options;
    this.#fit = request.options.fit;
    this.#baseTime = 0;
    this.#desiredPlaying = false;
    this.#lastFrame = -1;
    this.#status = "ready";
    this.renderExact(request.posterFrame);
  }

  public renderExact(frame: number): void {
    if (this.#destroyed || !this.#gateRender) {
      return;
    }

    const exactFrame = Math.min(this.#metadata.totalFrames - 1, Math.max(0, Math.floor(frame)));

    const now = performance.now();

    if (this.#render(exactFrame)) {
      this.#limiter.restart(now, this.#options.fps);
    }
  }

  public get renderPath(): RenderPath {
    return this.#surface.renderPath;
  }

  public resize(width: number, height: number, fit: FitMode): void {
    if (this.#destroyed) {
      return;
    }

    this.#fit = fit;

    if (this.#surface.resize(width, height)) {
      this.#lastFrame = -1;
    }

    this.tick(performance.now(), true);
  }

  public seek(time: number): void {
    if (this.#destroyed) {
      return;
    }

    this.#baseTime = Math.min(this.#metadata.duration, Math.max(0, time));
    this.#startedAt = performance.now();

    const sourceFrame = Math.min(
      this.#metadata.totalFrames - 1,
      Math.floor(this.#baseTime * this.#metadata.frameRate),
    );
    const directedFrame =
      this.#options.direction === 1 ? sourceFrame : this.#metadata.totalFrames - 1 - sourceFrame;

    this.renderExact(directedFrame);
    this.#emitState();
  }

  public setGate(timeline: boolean, render: boolean): void {
    if (this.#destroyed) {
      return;
    }

    if (this.#gateTimeline === timeline && this.#gateRender === render) {
      return;
    }

    const now = performance.now();

    this.#syncTime(now);
    this.#gateTimeline = timeline;
    this.#gateRender = render;
    this.#startedAt = now;

    if (render) {
      this.#lastFrame = -1;
      this.#limiter.restart(now, this.#options.fps);
    }
  }

  public stop(): void {
    if (this.#destroyed) {
      return;
    }

    this.#desiredPlaying = false;
    this.#baseTime = 0;
    this.#status = "stopped";
    this.renderExact(this.#options.direction === 1 ? 0 : this.#metadata.totalFrames - 1);
    this.#emitState();
  }

  public tick(now: number, force = false): void {
    if (this.#destroyed) {
      return;
    }

    const time = this.#currentTime(now);
    const { direction, frameStep } = this.#options;
    const desiredFrame = frameAtTime(time, this.#metadata, direction, frameStep);

    if (this.#gateRender && force) {
      if (this.#render(desiredFrame)) {
        this.#limiter.restart(now, this.#options.fps);
      }
    } else if (this.#gateRender) {
      const droppedFrames = this.#limiter.consumeFrame(
        now,
        this.#options,
        this.#metadata,
        this.#lastFrame,
        desiredFrame,
      );

      if (droppedFrames !== null) {
        this.#telemetry.recordDroppedFrames(droppedFrames);
        this.#render(desiredFrame);
      }
    }

    this.#telemetry.emitIfDue(now, time, this.#status, this.#lastFrame);
  }

  public update(options: WorkerPlaybackOptions): void {
    if (this.#destroyed) {
      return;
    }

    const now = performance.now();

    this.#syncTime(now);
    this.#options = options;
    this.#fit = options.fit;
    this.#lastFrame = -1;
    this.#limiter.restart(now, options.fps);
  }

  #complete(): void {
    this.#baseTime = this.#metadata.duration;
    this.#desiredPlaying = false;

    if (this.#status === "completed") {
      return;
    }

    this.#status = "completed";
    this.renderExact(this.#options.direction === 1 ? this.#metadata.totalFrames - 1 : 0);
    this.#emitState();
  }

  #currentTime(now: number): number {
    if (!this.#desiredPlaying || !this.#gateTimeline) {
      return this.#baseTime;
    }

    const elapsed =
      ((now - this.#startedAt) / MILLISECONDS_PER_SECOND) * this.#options.playbackRate;
    const absoluteTime = this.#baseTime + elapsed;
    const { duration } = this.#metadata;

    if (this.#options.loop === true) {
      return absoluteTime % duration;
    }

    const loops = this.#options.loop === false ? 1 : this.#options.loop;

    if (absoluteTime < duration * loops) {
      return absoluteTime % duration;
    }

    this.#complete();

    return duration;
  }

  #emitState(): void {
    this.#telemetry.emitState(this.#baseTime, this.#status, this.#lastFrame);
  }

  #render(frame: number): boolean {
    if (this.#surface.width === 0 || this.#surface.height === 0) {
      return false;
    }

    const started = performance.now();
    const rect = calculateFitRect(this.#metadata, this.#surface, this.#fit);
    const pixels = this.#native.render(frame, rect.width, rect.height);

    this.#surface.present(pixels, rect);
    this.#telemetry.recordRender(performance.now() - started);
    this.#lastFrame = frame;

    return true;
  }

  #syncTime(now: number): void {
    if (this.#desiredPlaying && this.#gateTimeline) {
      this.#baseTime = this.#currentTime(now);
    }

    this.#startedAt = now;
  }
}
