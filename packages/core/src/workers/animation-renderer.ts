import { calculateFitRect } from "#core/sizing/render-size";
import type {
  CreateWorkerRequest,
  FitMode,
  NativeAnimationLease,
  ReloadWorkerRequest,
  RenderPath,
  RLottieStatus,
  SessionRenderPlan,
  WorkerEvent,
} from "#core/types/index";
import { RenderSurface } from "#core/workers/render-surface";
import { SessionTelemetry } from "#core/workers/session-telemetry";

export class AnimationRenderer {
  #fit: FitMode;
  #lastFrame = -1;
  #metadata: CreateWorkerRequest["metadata"];
  #nativeLease: NativeAnimationLease;
  readonly #playerId: string;
  #sourceKey: string | undefined;
  readonly #surface: RenderSurface;
  readonly #telemetry: SessionTelemetry;

  public constructor(
    request: CreateWorkerRequest,
    nativeLease: NativeAnimationLease,
    post: (event: WorkerEvent, transfer?: Transferable[]) => void,
  ) {
    this.#fit = request.options.fit;
    this.#metadata = request.metadata;
    this.#nativeLease = nativeLease;
    this.#playerId = request.playerId;
    this.#sourceKey = request.sourceKey;
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
    this.#surface.destroy();
    this.#nativeLease.destroy();
  }

  public emitState(time: number, status: RLottieStatus): void {
    this.#telemetry.emitState(time, status, this.#lastFrame);
  }

  public emitTelemetry(now: number, time: number, status: RLottieStatus): void {
    this.#telemetry.emitIfDue(now, time, status, this.#lastFrame);
  }

  public get lastFrame(): number {
    return this.#lastFrame;
  }

  public plan(frame: number): SessionRenderPlan | null {
    if (this.#surface.width === 0 || this.#surface.height === 0) {
      return null;
    }

    const rect = calculateFitRect(this.#metadata, this.#surface, this.#fit);
    const shape = this.#fit === "fill" ? "fill" : "preserve-aspect";
    const sourceIdentity = this.#sourceKey ?? this.#playerId;

    return {
      rect,
      frame,
      shape,
      playerId: this.#playerId,
      groupKey: `${sourceIdentity}\u0000${shape}\u0000${String(frame)}`,
    };
  }

  public presentShared(plan: SessionRenderPlan, frame: OffscreenCanvas): void {
    this.#surface.presentShared(frame, plan.rect);
    this.#lastFrame = plan.frame;
  }

  public recordDroppedFrames(count: number): void {
    this.#telemetry.recordDroppedFrames(count);
  }

  public recordRender(duration: number): void {
    this.#telemetry.recordRender(duration);
  }

  public reload(request: ReloadWorkerRequest, nativeLease: NativeAnimationLease): void {
    this.#nativeLease.destroy();
    this.#nativeLease = nativeLease;
    this.#fit = request.options.fit;
    this.#lastFrame = -1;
    this.#metadata = request.metadata;
    this.#sourceKey = request.sourceKey;
  }

  public render(frame: number): boolean {
    const plan = this.plan(frame);

    if (plan === null) {
      return false;
    }

    const started = performance.now();
    const pixels = this.#nativeLease.animation.render(frame, plan.rect.width, plan.rect.height);

    this.#surface.present(pixels, plan.rect);
    this.#telemetry.recordRender(performance.now() - started);
    this.#lastFrame = frame;

    return true;
  }

  public renderNative(frame: number, width: number, height: number): Uint8Array {
    return this.#nativeLease.animation.render(frame, width, height);
  }

  public get renderPath(): RenderPath {
    return this.#surface.renderPath;
  }

  public resize(width: number, height: number, fit: FitMode): boolean {
    this.#fit = fit;

    if (!this.#surface.resize(width, height)) {
      return false;
    }

    this.#lastFrame = -1;

    return true;
  }

  public update(fit: FitMode): void {
    this.#fit = fit;
    this.#lastFrame = -1;
  }
}
