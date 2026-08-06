import { createAbortError } from "#core/sources/source-errors";
import type { LoadedSource, SourceDeliveryEntry } from "#core/types/index";

const SOURCE_DELIVERY_BATCH_SIZE = 4;

export class SourceDeliveryQueue {
  readonly #entries: SourceDeliveryEntry[] = [];
  #timer: ReturnType<typeof setTimeout> | undefined;

  public deliver(loaded: LoadedSource, signal: AbortSignal): Promise<LoadedSource> {
    if (signal.aborted) {
      return Promise.reject(createAbortError(signal.reason));
    }

    return new Promise((resolve, reject) => {
      this.#entries.push({ loaded, reject, signal, resolve });
      this.#schedule();
    });
  }

  readonly #drain = (): void => {
    this.#timer = undefined;

    const entries = this.#entries.splice(0, SOURCE_DELIVERY_BATCH_SIZE);

    for (const entry of entries) {
      if (entry.signal.aborted) {
        entry.reject(createAbortError(entry.signal.reason));
      } else {
        entry.resolve(entry.loaded);
      }
    }

    this.#schedule();
  };

  #schedule(): void {
    if (this.#timer !== undefined || this.#entries.length === 0) {
      return;
    }

    this.#timer = setTimeout(this.#drain, 0);
  }
}
