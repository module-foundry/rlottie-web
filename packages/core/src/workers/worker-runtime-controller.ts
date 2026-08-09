import { WORKER_TICK_INTERVAL_MS } from "#core/constants/index";
import { loadNativeFactory } from "#core/native/native-factory";
import type { SessionRenderPlan, WorkerEvent, WorkerRequest } from "#core/types/index";
import { AnimationSession } from "#core/workers/animation-session";
import { SharedFrameCoordinator } from "#core/workers/shared-frame-coordinator";
import { WorkerAnimationRegistry } from "#core/workers/worker-animation-registry";
import { WorkerSourceCache } from "#core/workers/worker-source-cache";
import { WorkerTaskScheduler } from "#core/workers/worker-task-scheduler";
import { nextWorkerTickDeadline } from "#core/workers/worker-tick-deadline";

export class WorkerRuntimeController {
  readonly #animations = new WorkerAnimationRegistry();
  readonly #cancelledCreates = new Set<string>();
  #nextTickAt = Number.NEGATIVE_INFINITY;
  readonly #post: (event: WorkerEvent, transfer?: Transferable[]) => void;
  readonly #scheduler = new WorkerTaskScheduler();
  readonly #sessions = new Map<string, AnimationSession>();
  #sharedFrames: SharedFrameCoordinator | undefined;
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

    const nativeLease = this.#animations.acquire(message.sourceKey, json, factory);
    let session: AnimationSession;

    try {
      session = new AnimationSession(message, nativeLease, this.#post);
    } catch (error) {
      nativeLease.destroy();

      throw error;
    }

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

    const nativeLease = this.#animations.acquire(message.sourceKey, json, factory);

    try {
      session.reload(message, nativeLease);
    } catch (error) {
      nativeLease.destroy();

      throw error;
    }

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
    this.#animations.clear();
    this.#sharedFrames?.destroy();
    this.#sharedFrames = undefined;
    this.#nextTickAt = Number.NEGATIVE_INFINITY;
  }

  readonly #tick = (): void => {
    const now = performance.now();

    if (this.#sessions.size < 2) {
      for (const session of this.#sessions.values()) {
        session.tick(now);
      }
    } else {
      const plans: SessionRenderPlan[] = [];

      for (const session of this.#sessions.values()) {
        const plan = session.planTick(now);

        if (plan !== null) {
          plans.push(plan);
        }
      }

      this.#sharedFrames ??= new SharedFrameCoordinator();
      this.#sharedFrames.render(plans, this.#sessions);

      for (const session of this.#sessions.values()) {
        session.finishTick(now);
      }
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
