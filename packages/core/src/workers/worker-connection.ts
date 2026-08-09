import { DEFAULT_CACHE_BUDGET_BYTES } from "#core/constants/index";
import { RLottieError } from "#core/errors/rlottie-error";
import type { WorkerEvent, WorkerLease, WorkerRequest } from "#core/types/index";
import { isWorkerEvent } from "#core/workers/protocol";

const RENDER_PHASE_INCREMENT = 0.618_033_988_749_894_9;

export class WorkerConnection {
  public readonly id: number;
  readonly #callbacks = new Map<string, (event: WorkerEvent) => void>();
  #destroyed = false;
  #nextRenderPhase = 0;
  #sourceBytes = 0;
  readonly #sources = new Map<string, number>();

  readonly #worker: Worker;

  public constructor(id: number) {
    this.id = id;
    this.#worker = new Worker(new URL("./worker-runtime.js", import.meta.url), {
      type: "module",
      name: `rlottie-${String(id)}`,
    });
    this.#worker.addEventListener("message", this.#onMessage);
    this.#worker.addEventListener("error", this.#onError);
  }

  public assign(
    playerId: string,
    callback: (event: WorkerEvent) => void,
    sharedRenderPhase?: number,
  ): WorkerLease {
    this.#callbacks.set(playerId, callback);
    this.#nextRenderPhase = (this.#nextRenderPhase + RENDER_PHASE_INCREMENT) % 1;

    let destroyed = false;
    const renderPhase = sharedRenderPhase ?? this.#nextRenderPhase;

    return {
      destroy: () => {
        if (destroyed) {
          return;
        }

        destroyed = true;
        this.#callbacks.delete(playerId);

        if (!this.#destroyed) {
          this.#worker.postMessage({ playerId, type: "destroy" });
        }
      },
      post: (message, transfer = []) => {
        if (this.#destroyed) {
          throw new RLottieError("PLAYER_DESTROYED", "Worker connection is destroyed");
        }

        const outgoing = this.#prepareOutgoing(message, renderPhase);

        this.#worker.postMessage(outgoing, transfer);

        if (
          (message.type === "create" || message.type === "reload") &&
          message.sourceKey !== undefined &&
          message.json !== undefined &&
          message.sourceBytes <= DEFAULT_CACHE_BUDGET_BYTES &&
          !this.#sources.has(message.sourceKey)
        ) {
          this.#rememberSource(message.sourceKey, message.sourceBytes);
        }
      },
    };
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#worker.removeEventListener("message", this.#onMessage);
    this.#worker.removeEventListener("error", this.#onError);
    this.#callbacks.clear();
    this.#nextRenderPhase = 0;
    this.#sources.clear();
    this.#sourceBytes = 0;
    this.#worker.terminate();
  }

  public get playerCount(): number {
    return this.#callbacks.size;
  }

  readonly #onError = (event: ErrorEvent): void => {
    for (const [playerId, callback] of this.#callbacks) {
      callback({
        playerId,
        type: "error",
        code: "WASM_INIT_FAILED",
        message: event.message || "RLottie worker failed",
      });
    }
  };

  readonly #onMessage = (event: MessageEvent<unknown>): void => {
    if (!isWorkerEvent(event.data)) {
      return;
    }

    this.#callbacks.get(event.data.playerId)?.(event.data);
  };

  #prepareOutgoing(message: WorkerRequest, renderPhase: number): WorkerRequest {
    const outgoing =
      message.type === "create" ? { ...message, renderPhase, workerId: this.id } : message;

    if (
      (outgoing.type !== "create" && outgoing.type !== "reload") ||
      outgoing.sourceKey === undefined ||
      !this.#sources.has(outgoing.sourceKey)
    ) {
      return outgoing;
    }

    const bytes = this.#sources.get(outgoing.sourceKey) ?? 0;

    this.#sources.delete(outgoing.sourceKey);
    this.#sources.set(outgoing.sourceKey, bytes);

    return { ...outgoing, json: undefined };
  }

  #rememberSource(key: string, bytes: number): void {
    this.#sources.set(key, bytes);
    this.#sourceBytes += bytes;

    while (this.#sourceBytes > DEFAULT_CACHE_BUDGET_BYTES) {
      const oldestKey = this.#sources.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      const oldestBytes = this.#sources.get(oldestKey) ?? 0;

      this.#sources.delete(oldestKey);
      this.#sourceBytes -= oldestBytes;
    }
  }
}
