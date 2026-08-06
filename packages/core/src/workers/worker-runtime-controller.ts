import { WORKER_TICK_INTERVAL_MS } from "#core/constants/index";
import { loadNativeFactory } from "#core/native/native-factory";
import type { WorkerEvent, WorkerRequest } from "#core/types/index";
import { AnimationSession } from "#core/workers/animation-session";
import { WorkerSourceCache } from "#core/workers/worker-source-cache";
import { WorkerTaskScheduler } from "#core/workers/worker-task-scheduler";
import { nextWorkerTickDeadline } from "#core/workers/worker-tick-deadline";

export class WorkerRuntimeController {
  readonly #cancelledCreates = new Set<string>();
  #nextTickAt = Number.NEGATIVE_INFINITY;
  readonly #post: (event: WorkerEvent, transfer?: Transferable[]) => void;
  readonly #scheduler = new WorkerTaskScheduler();
  readonly #sessions = new Map<string, AnimationSession>();
  readonly #sources = new WorkerSourceCache();

  public constructor(post: (event: WorkerEvent, transfer?: Transferable[]) => void) {
    this.#post = post;
  }

  public async dispatch(message: WorkerRequest): Promise<void> {
    try {
      await this.#dispatchSafely(message);
    } catch (error) {
      this.#postError(message, error);
    }
  }

  async #create(message: Extract<WorkerRequest, { type: "create" }>): Promise<void> {
    this.#cancelledCreates.delete(message.playerId);

    const json = this.#sources.resolve(message.sourceKey, message.json, message.sourceBytes);
    const factory = await loadNativeFactory();

    if (this.#cancelledCreates.has(message.playerId)) {
      return;
    }

    this.#sessions.get(message.playerId)?.destroy();

    const session = new AnimationSession(message, factory, this.#post, json);

    this.#sessions.set(message.playerId, session);
    this.#post({
      type: "created",
      playerId: message.playerId,
      requestId: message.requestId,
      renderPath: session.renderPath,
    });
    session.renderExact(message.posterFrame);
    this.#restartTimer();
  }

  #destroy(playerId: string): void {
    this.#cancelledCreates.add(playerId);
    this.#sessions.get(playerId)?.destroy();
    this.#sessions.delete(playerId);
    this.#stopTimerWhenIdle();
  }

  async #dispatchSafely(message: WorkerRequest): Promise<void> {
    if (message.type === "create") {
      await this.#create(message);

      return;
    }

    if (message.type === "reload") {
      await this.#reload(message);

      return;
    }

    if (message.type === "destroy") {
      this.#destroy(message.playerId);

      return;
    }

    const session = this.#sessions.get(message.playerId);

    if (session === undefined) {
      return;
    }

    switch (message.type) {
      case "gate":
        session.setGate(message.timeline, message.render);
        break;
      case "pause":
        session.pause();
        break;
      case "play":
        session.play();
        break;
      case "resize":
        session.resize(message.width, message.height, message.fit);
        break;
      case "seek":
        session.seek(message.time);
        break;
      case "stop":
        session.stop();
        break;
      case "update":
        session.update(message.options);
        break;
    }
  }

  #postError(message: WorkerRequest, error: unknown): void {
    const initializationFailed = message.type === "create" || message.type === "reload";

    this.#post({
      playerId: message.playerId,
      code: initializationFailed ? "WASM_INIT_FAILED" : "RENDER_FAILED",
      message: error instanceof Error ? error.message : "RLottie worker failed",
      ...(initializationFailed ? { requestId: message.requestId } : {}),
      type: "error",
    });
  }

  async #reload(message: Extract<WorkerRequest, { type: "reload" }>): Promise<void> {
    const json = this.#sources.resolve(message.sourceKey, message.json, message.sourceBytes);
    const factory = await loadNativeFactory();
    const session = this.#sessions.get(message.playerId);

    if (session === undefined) {
      throw new Error("Cannot reload a missing worker session");
    }

    session.reload(message, factory, json);
    this.#post({
      type: "created",
      playerId: message.playerId,
      requestId: message.requestId,
      renderPath: session.renderPath,
    });
    this.#restartTimer();
  }

  #restartTimer(): void {
    this.#nextTickAt = performance.now();
    this.#scheduler.schedule(this.#tick, 0);
  }

  #stopTimerWhenIdle(): void {
    if (this.#sessions.size !== 0) {
      return;
    }

    this.#scheduler.cancel();
    this.#nextTickAt = Number.NEGATIVE_INFINITY;
  }

  readonly #tick = (): void => {
    const now = performance.now();

    for (const session of this.#sessions.values()) {
      session.tick(now);
    }

    if (this.#sessions.size > 0) {
      const finishedAt = performance.now();

      this.#nextTickAt = nextWorkerTickDeadline(
        this.#nextTickAt,
        now,
        finishedAt,
        WORKER_TICK_INTERVAL_MS,
      );
      this.#scheduler.schedule(this.#tick, Math.max(0, this.#nextTickAt - finishedAt));
    }
  };
}
