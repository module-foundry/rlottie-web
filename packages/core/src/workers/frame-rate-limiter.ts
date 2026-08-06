import { MILLISECONDS_PER_SECOND } from "#core/constants/index";
import type { RLottieMetadata, WorkerPlaybackOptions } from "#core/types/index";
import { countSkippedSourceFrames } from "#core/workers/skipped-source-frames";

export const advanceDeadline = (deadline: number, now: number, interval: number): number => {
  if (!Number.isFinite(deadline)) {
    return now + interval;
  }

  if (deadline > now) {
    return deadline;
  }

  return deadline + (Math.floor((now - deadline) / interval) + 1) * interval;
};

export class FrameRateLimiter {
  #nextRenderAt = Number.NEGATIVE_INFINITY;
  readonly #phase: number;

  public constructor(phase = 0) {
    this.#phase = phase;
  }

  public consume(now: number, fps: number, frameAvailable: boolean): number | null {
    if (!frameAvailable || now < this.#nextRenderAt) {
      return null;
    }

    const interval = MILLISECONDS_PER_SECOND / Math.max(1, fps);
    const droppedFrames = Number.isFinite(this.#nextRenderAt)
      ? Math.floor((now - this.#nextRenderAt) / interval)
      : 0;

    this.#nextRenderAt = advanceDeadline(this.#nextRenderAt, now, interval);

    return droppedFrames;
  }

  public consumeFrame(
    now: number,
    options: WorkerPlaybackOptions,
    metadata: RLottieMetadata,
    previousFrame: number,
    desiredFrame: number,
  ): number | null {
    const droppedFrames = this.consume(now, options.fps, desiredFrame !== previousFrame);

    return droppedFrames === null
      ? null
      : Math.min(
          droppedFrames,
          countSkippedSourceFrames(
            previousFrame,
            desiredFrame,
            metadata.totalFrames,
            options.direction,
            options.frameStep,
          ),
        );
  }

  public reset(): void {
    this.#nextRenderAt = Number.NEGATIVE_INFINITY;
  }

  public restart(now: number, fps: number): void {
    const interval = MILLISECONDS_PER_SECOND / Math.max(1, fps);

    this.#nextRenderAt = now + interval * (1 + this.#phase);
  }
}
