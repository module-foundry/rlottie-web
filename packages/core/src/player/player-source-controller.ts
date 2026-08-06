import { asRLottieError } from "#core/errors/as-rlottie-error";
import { RLottieError } from "#core/errors/rlottie-error";
import type {
  LottieSource,
  PlayerSourceCallbacks,
  RLottieMetadata,
  SourceLoaderContract,
} from "#core/types/index";

export class PlayerSourceController {
  #abortController: AbortController | undefined;
  readonly #callbacks: PlayerSourceCallbacks;
  #destroyed = false;
  #generation = 0;
  readonly #loader: SourceLoaderContract;

  public constructor(loader: SourceLoaderContract, callbacks: PlayerSourceCallbacks) {
    this.#loader = loader;
    this.#callbacks = callbacks;
  }

  public destroy(): void {
    if (this.#destroyed) {
      return;
    }

    this.#destroyed = true;
    this.#generation += 1;
    this.#abortController?.abort();
    this.#abortController = undefined;
  }

  public async load(source: LottieSource): Promise<RLottieMetadata> {
    const generation = this.#generation + 1;
    const abortController = new AbortController();

    this.#generation = generation;
    this.#abortController?.abort();
    this.#abortController = abortController;
    this.#callbacks.onStatus("loading", null);

    try {
      const loaded = await this.#loader.load(source, abortController.signal);

      this.#assertCurrent(generation);
      await this.#callbacks.onLoaded(loaded);
      this.#assertCurrent(generation);

      return loaded.metadata;
    } catch (error) {
      if (generation !== this.#generation || this.#destroyed) {
        throw error;
      }

      const failure = asRLottieError(error, "RLOTTIE_PARSE_FAILED", "Unable to load animation");

      this.#callbacks.onStatus("error", failure);

      throw failure;
    } finally {
      if (this.#abortController === abortController) {
        this.#abortController = undefined;
      }
    }
  }

  #assertCurrent(generation: number): void {
    if (generation !== this.#generation || this.#destroyed) {
      throw new RLottieError("SOURCE_ABORTED", "A newer source replaced this load");
    }
  }
}
