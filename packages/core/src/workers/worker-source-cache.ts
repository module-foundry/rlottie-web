import { DEFAULT_CACHE_BUDGET_BYTES } from "#core/constants/index";
import type { WorkerSourceCacheEntry } from "#core/types/index";

export class WorkerSourceCache {
  readonly #budget: number;
  #bytes = 0;
  readonly #entries = new Map<string, WorkerSourceCacheEntry>();

  public constructor(budget = DEFAULT_CACHE_BUDGET_BYTES) {
    this.#budget = budget;
  }

  public resolve(key: string | undefined, json: string | undefined, bytes: number): string {
    if (key === undefined) {
      if (json === undefined) {
        throw new Error("Unkeyed worker source payload is missing JSON");
      }

      return json;
    }

    const cached = this.#entries.get(key);

    if (cached !== undefined) {
      this.#entries.delete(key);
      this.#entries.set(key, cached);

      return cached.json;
    }

    if (json === undefined) {
      throw new Error(`Worker source cache entry is missing: ${key}`);
    }

    if (bytes <= this.#budget) {
      this.#entries.set(key, { json, bytes });
      this.#bytes += bytes;
      this.#trim();
    }

    return json;
  }

  #trim(): void {
    while (this.#bytes > this.#budget) {
      const oldestKey = this.#entries.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      const oldest = this.#entries.get(oldestKey);

      this.#entries.delete(oldestKey);
      this.#bytes -= oldest?.bytes ?? 0;
    }
  }
}
