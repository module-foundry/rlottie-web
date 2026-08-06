import { MILLISECONDS_PER_SECOND } from "#core/constants/index";
import type { RenderPath, RLottieDiagnostics, RLottieStatus, WorkerEvent } from "#core/types/index";

export class SessionTelemetry {
  #droppedFrames = 0;
  readonly #getRenderPath: () => RenderPath;
  #lastTelemetryAt: number;
  readonly #playerId: string;
  readonly #post: (event: WorkerEvent) => void;
  #renderDurationTotal = 0;
  #renderedFrames = 0;
  readonly #workerId: number;

  public constructor(
    playerId: string,
    workerId: number,
    getRenderPath: () => RenderPath,
    post: (event: WorkerEvent) => void,
    now = performance.now(),
  ) {
    this.#playerId = playerId;
    this.#workerId = workerId;
    this.#getRenderPath = getRenderPath;
    this.#post = post;
    this.#lastTelemetryAt = now;
  }

  public emitIfDue(now: number, time: number, status: RLottieStatus, currentFrame: number): void {
    if (now - this.#lastTelemetryAt < MILLISECONDS_PER_SECOND) {
      return;
    }

    const elapsed = now - this.#lastTelemetryAt;
    const diagnostics: RLottieDiagnostics = {
      queueDepth: 0,
      workerId: this.#workerId,
      renderPath: this.#getRenderPath(),
      droppedFrames: this.#droppedFrames,
      renderedFrames: this.#renderedFrames,
      renderedFps: (this.#renderedFrames * MILLISECONDS_PER_SECOND) / elapsed,
      renderAverageMs:
        this.#renderedFrames === 0 ? 0 : this.#renderDurationTotal / this.#renderedFrames,
    };

    this.#post({ diagnostics, type: "diagnostics", playerId: this.#playerId });
    this.emitState(time, status, currentFrame);
    this.#lastTelemetryAt = now;
    this.#droppedFrames = 0;
    this.#renderDurationTotal = 0;
    this.#renderedFrames = 0;
  }

  public emitState(time: number, status: RLottieStatus, currentFrame: number): void {
    this.#post({
      status,
      type: "state",
      currentTime: time,
      playerId: this.#playerId,
      currentFrame: Math.max(0, currentFrame),
    });
  }

  public recordDroppedFrames(count: number): void {
    this.#droppedFrames += count;
  }

  public recordRender(duration: number): void {
    this.#renderDurationTotal += duration;
    this.#renderedFrames += 1;
  }
}
