import { MILLISECONDS_PER_SECOND } from "#core/constants/index";
import { frameAtTime } from "#core/player/timeline";
import type {
  CreateWorkerRequest,
  FitMode,
  NativeAnimationLease,
  ReloadWorkerRequest,
  RenderPath,
  RLottieMetadata,
  RLottieStatus,
  SessionRenderPlan,
  WorkerEvent,
  WorkerPlaybackOptions,
} from "#core/types/index";
import { AnimationRenderer } from "#core/workers/animation-renderer";
import { FrameRateLimiter } from "#core/workers/frame-rate-limiter";

export class AnimationSession {
  #baseTime = 0;
  #desiredPlaying = false;
  #destroyed = false;
  #gateRender = true;
  #gateTimeline = true;
  readonly #limiter: FrameRateLimiter;
  #metadata: RLottieMetadata;
  #options: WorkerPlaybackOptions;
  readonly #renderer: AnimationRenderer;
  #startedAt = performance.now();
  #status: RLottieStatus = "ready";

  public constructor(
    request: CreateWorkerRequest,
    nativeLease: NativeAnimationLease,
    post: (event: WorkerEvent, transfer?: Transferable[]) => void,
  ) {
    this.#metadata = request.metadata;
    this.#limiter = new FrameRateLimiter(request.renderPhase);
    this.#options = request.options;
    this.#renderer = new AnimationRenderer(request, nativeLease, post);
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#renderer.destroy();
  }

  public finishTick(now: number): void {
    const time = this.#currentTime(now);

    this.#renderer.emitTelemetry(now, time, this.#status);
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

  public planTick(now: number, force = false): SessionRenderPlan | null {
    if (this.#destroyed) {
      return null;
    }

    const time = this.#currentTime(now);
    const { direction, frameStep } = this.#options;
    const desiredFrame = frameAtTime(time, this.#metadata, direction, frameStep);

    if (this.#gateRender && force) {
      this.#limiter.restart(now, this.#options.fps);
    } else if (this.#gateRender) {
      const droppedFrames = this.#limiter.consumeFrame(
        now,
        this.#options,
        this.#metadata,
        this.#renderer.lastFrame,
        desiredFrame,
      );

      if (droppedFrames !== null) {
        this.#renderer.recordDroppedFrames(droppedFrames);
      } else {
        return null;
      }
    } else {
      return null;
    }

    return this.#renderer.plan(desiredFrame);
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

  public presentShared(plan: SessionRenderPlan, frame: OffscreenCanvas): void {
    this.#renderer.presentShared(plan, frame);
  }

  public recordRender(duration: number): void {
    this.#renderer.recordRender(duration);
  }

  public reload(request: ReloadWorkerRequest, nativeLease: NativeAnimationLease): void {
    if (this.#destroyed) {
      return;
    }

    this.#renderer.reload(request, nativeLease);
    this.#metadata = request.metadata;
    this.#options = request.options;
    this.#baseTime = 0;
    this.#desiredPlaying = false;
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

  public renderNative(frame: number, width: number, height: number): Uint8Array {
    return this.#renderer.renderNative(frame, width, height);
  }

  public get renderPath(): RenderPath {
    return this.#renderer.renderPath;
  }

  public renderPlanned(plan: SessionRenderPlan): void {
    this.#render(plan.frame);
  }

  public resize(width: number, height: number, fit: FitMode): void {
    if (this.#destroyed) {
      return;
    }

    this.#renderer.resize(width, height, fit);

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
      this.#renderer.update(this.#options.fit);
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
    const plan = this.planTick(now, force);

    if (plan !== null) {
      this.renderPlanned(plan);
    }

    this.finishTick(now);
  }

  public update(options: WorkerPlaybackOptions): void {
    if (this.#destroyed) {
      return;
    }

    const now = performance.now();

    this.#syncTime(now);
    this.#options = options;
    this.#renderer.update(options.fit);
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
    this.#renderer.emitState(this.#baseTime, this.#status);
  }

  #render(frame: number): boolean {
    return this.#renderer.render(frame);
  }

  #syncTime(now: number): void {
    if (this.#desiredPlaying && this.#gateTimeline) {
      this.#baseTime = this.#currentTime(now);
    }

    this.#startedAt = now;
  }
}
