import { RLottieError } from "#core/errors/rlottie-error";
import type {
  PlayerEventCallbacks,
  RLottieDiagnostics,
  RLottieListener,
  WorkerEvent,
} from "#core/types/index";

export class PlayerEventController {
  readonly #callbacks: PlayerEventCallbacks;
  #currentFrame = 0;
  #currentTime = 0;
  readonly #diagnosticsListeners = new Set<(value: RLottieDiagnostics) => void>();
  readonly #frameListeners = new Set<RLottieListener>();

  public constructor(callbacks: PlayerEventCallbacks) {
    this.#callbacks = callbacks;
  }

  public clear(): void {
    this.#frameListeners.clear();
    this.#diagnosticsListeners.clear();
  }

  public get currentFrame(): number {
    return this.#currentFrame;
  }

  public get currentTime(): number {
    return this.#currentTime;
  }

  public handle(event: WorkerEvent): void {
    switch (event.type) {
      case "bitmap":
        this.#callbacks.onBitmap(event.bitmap);
        break;
      case "diagnostics":
        this.#handleDiagnostics(event.diagnostics);
        break;
      case "error":
        this.#callbacks.onError(
          new RLottieError(
            event.code === "WASM_INIT_FAILED" ? "WASM_INIT_FAILED" : "RENDER_FAILED",
            event.message,
          ),
        );
        break;
      case "state":
        this.#handleState(event.currentFrame, event.currentTime);
        this.#callbacks.onStatus(event.status);
        break;
      case "created":
        break;
    }
  }

  public resetPosition(): void {
    this.#currentFrame = 0;
    this.#currentTime = 0;
  }

  public setCurrentTime(time: number): void {
    this.#currentTime = time;
  }

  public subscribeDiagnostics(listener: (value: RLottieDiagnostics) => void): () => void {
    this.#diagnosticsListeners.add(listener);

    return () => this.#diagnosticsListeners.delete(listener);
  }

  public subscribeFrame(listener: RLottieListener): () => void {
    this.#frameListeners.add(listener);

    return () => this.#frameListeners.delete(listener);
  }

  #handleDiagnostics(diagnostics: RLottieDiagnostics): void {
    for (const listener of this.#diagnosticsListeners) {
      listener(diagnostics);
    }

    this.#callbacks.onDiagnostics(diagnostics);
  }

  #handleState(frame: number, time: number): void {
    const frameChanged = frame !== this.#currentFrame;

    this.#currentFrame = frame;
    this.#currentTime = time;

    if (frameChanged) {
      for (const listener of this.#frameListeners) {
        listener();
      }
    }
  }
}
