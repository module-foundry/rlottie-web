import { RLottieError } from "#core/errors/rlottie-error";
import type {
  PendingRequest,
  WorkerBridgeCallbacks,
  WorkerEvent,
  WorkerLease,
  WorkerLoadPayload,
  WorkerRequest,
} from "#core/types/index";
import { acquireWorkerLease } from "#core/workers/acquire-worker-lease";

export class WorkerBridge {
  readonly #callbacks: WorkerBridgeCallbacks;
  #destroyed = false;
  #lease: WorkerLease | undefined;
  readonly #pendingRequests = new Map<number, PendingRequest>();
  readonly #playerId: string;
  #requestId = 0;
  readonly #takeOffscreenCanvas: () => OffscreenCanvas | undefined;
  #workerCreated = false;

  public constructor(
    playerId: string,
    takeOffscreenCanvas: () => OffscreenCanvas | undefined,
    callbacks: WorkerBridgeCallbacks,
  ) {
    this.#playerId = playerId;
    this.#takeOffscreenCanvas = takeOffscreenCanvas;
    this.#callbacks = callbacks;
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#lease?.destroy();
    this.#lease = undefined;

    const error = new RLottieError("PLAYER_DESTROYED", "Player was destroyed");

    for (const pending of this.#pendingRequests.values()) {
      pending.reject(error);
    }

    this.#pendingRequests.clear();
  }

  public async load(payload: WorkerLoadPayload): Promise<void> {
    this.#ensureLease(payload.sourceKey);

    const requestId = this.#requestId + 1;
    const created = new Promise<void>((resolve, reject) => {
      this.#pendingRequests.set(requestId, { reject, resolve });
    });

    this.#requestId = requestId;

    if (this.#workerCreated) {
      this.#lease?.post({
        requestId,
        type: "reload",
        json: payload.json,
        options: payload.options,
        playerId: this.#playerId,
        metadata: payload.metadata,
        posterFrame: payload.posterFrame,
        sourceBytes: payload.sourceBytes,
        ...(payload.sourceKey === undefined ? {} : { sourceKey: payload.sourceKey }),
      });
    } else {
      const canvas = this.#takeOffscreenCanvas();
      const transfer = canvas === undefined ? [] : [canvas];

      this.#lease?.post(
        {
          ...(canvas === undefined ? {} : { canvas }),
          requestId,
          workerId: 0,
          renderPhase: 0,
          type: "create",
          json: payload.json,
          width: payload.width,
          height: payload.height,
          options: payload.options,
          playerId: this.#playerId,
          metadata: payload.metadata,
          posterFrame: payload.posterFrame,
          sourceBytes: payload.sourceBytes,
          ...(payload.sourceKey === undefined ? {} : { sourceKey: payload.sourceKey }),
        },
        transfer,
      );
    }

    await created;
  }

  public post(message: WorkerRequest): void {
    this.#lease?.post(message);
  }

  #ensureLease(affinityKey?: string): void {
    this.#lease ??= acquireWorkerLease(this.#playerId, this.#onWorkerEvent, affinityKey);
  }

  readonly #onWorkerEvent = (event: WorkerEvent): void => {
    if (this.#destroyed) {
      if (event.type === "bitmap") {
        event.bitmap.close();
      }

      return;
    }

    if (event.type === "created") {
      this.#workerCreated = true;

      const pending = this.#pendingRequests.get(event.requestId);

      this.#pendingRequests.delete(event.requestId);
      pending?.resolve();

      return;
    }

    if (event.type === "error" && event.requestId !== undefined) {
      const error = new RLottieError(
        event.code === "WASM_INIT_FAILED" ? "WASM_INIT_FAILED" : "RENDER_FAILED",
        event.message,
      );
      const pending = this.#pendingRequests.get(event.requestId);

      this.#pendingRequests.delete(event.requestId);
      pending?.reject(error);
    }

    this.#callbacks.onEvent(event);
  };
}
