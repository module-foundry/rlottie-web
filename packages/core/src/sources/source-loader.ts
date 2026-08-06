import { DEFAULT_CACHE_BUDGET_BYTES, DEFAULT_SOURCE_LIMIT_BYTES } from "#core/constants/index";
import { RLottieError } from "#core/errors/rlottie-error";
import { decodeTgs, decodeUtf8, readBinary } from "#core/sources/source-binary";
import { SourceDeliveryQueue } from "#core/sources/source-delivery-queue";
import { createAbortError } from "#core/sources/source-errors";
import { parseLottieJson } from "#core/sources/source-json";
import { consumePending } from "#core/sources/source-pending";
import { Format, Type } from "#core/types/index";
import type {
  CacheEntry,
  LoadedSource,
  LottieSource,
  PendingEntry,
  SourceLoaderOptions,
} from "#core/types/index";

export class SourceLoader {
  readonly #cache = new Map<string, CacheEntry>();
  readonly #cacheBudget: number;
  #cacheBytes = 0;
  readonly #deliveries = new SourceDeliveryQueue();
  readonly #pending = new Map<string, PendingEntry>();
  readonly #sourceLimit: number;

  public constructor(options: SourceLoaderOptions = {}) {
    this.#cacheBudget = options.cacheBudget ?? DEFAULT_CACHE_BUDGET_BYTES;
    this.#sourceLimit = options.sourceLimit ?? DEFAULT_SOURCE_LIMIT_BYTES;
  }

  public clear(): void {
    this.#cache.clear();
    this.#cacheBytes = 0;
  }

  public async load(source: LottieSource, signal: AbortSignal): Promise<LoadedSource> {
    if (signal.aborted) {
      throw createAbortError(signal.reason);
    }

    const key = this.#getCacheKey(source);
    const cached = key === undefined ? undefined : this.#cache.get(key);

    if (key !== undefined && cached !== undefined) {
      this.#touchCacheEntry(key, cached);

      return this.#deliveries.deliver(cached, signal);
    }

    const pending = key === undefined ? undefined : this.#pending.get(key);

    if (pending !== undefined) {
      return this.#deliveries.deliver(await consumePending(pending, signal), signal);
    }

    if (key === undefined) {
      return this.#deliveries.deliver(await this.#loadUncached(source, signal), signal);
    }

    return this.#deliveries.deliver(await this.#loadShared(key, source, signal), signal);
  }

  #checkSize(bytes: number): void {
    if (bytes > this.#sourceLimit) {
      throw new RLottieError(
        "SOURCE_TOO_LARGE",
        `Source exceeds the ${String(this.#sourceLimit)} byte limit`,
      );
    }
  }

  async #fetchBytes(
    url: string,
    options: RequestInit | undefined,
    signal: AbortSignal,
  ): Promise<Uint8Array> {
    let response: Response;

    try {
      response = await fetch(url, { ...options, signal });
    } catch (error) {
      if (signal.aborted) {
        throw createAbortError(signal.reason);
      }

      throw new RLottieError("SOURCE_FETCH_FAILED", `Unable to fetch ${url}`, { cause: error });
    }

    if (!response.ok) {
      throw new RLottieError(
        "SOURCE_FETCH_FAILED",
        `Source request failed with HTTP ${String(response.status)}`,
      );
    }

    const contentLength = Number(response.headers.get("content-length"));

    if (Number.isFinite(contentLength)) {
      this.#checkSize(contentLength);
    }

    return new Uint8Array(await response.arrayBuffer());
  }

  #getCacheKey(source: LottieSource): string | undefined {
    if (source.cacheKey !== undefined) {
      return source.cacheKey;
    }

    return source.format === Format.URL ? `${String(source.type)}:${source.url}` : undefined;
  }

  async #loadShared(key: string, source: LottieSource, signal: AbortSignal): Promise<LoadedSource> {
    const controller = new AbortController();
    const entry: PendingEntry = {
      controller,
      consumers: 0,
      settled: false,
      abortTimer: undefined,
      task: this.#loadUncached(source, controller.signal),
    };

    entry.task = entry.task
      .then(loaded => {
        const keyed = { ...loaded, sourceKey: key };

        this.#store(key, keyed);

        return keyed;
      })
      .finally(() => {
        entry.settled = true;

        if (entry.abortTimer !== undefined) {
          clearTimeout(entry.abortTimer);
          entry.abortTimer = undefined;
        }

        if (this.#pending.get(key) === entry) {
          this.#pending.delete(key);
        }
      });
    this.#pending.set(key, entry);

    return consumePending(entry, signal);
  }

  async #loadUncached(source: LottieSource, signal: AbortSignal): Promise<LoadedSource> {
    try {
      if (source.format === Format.Local && source.type === Type.JSON) {
        const json = typeof source.json === "string" ? source.json : JSON.stringify(source.json);

        this.#checkSize(new TextEncoder().encode(json).byteLength);

        return parseLottieJson(json);
      }

      const bytes =
        source.format === Format.URL
          ? await this.#fetchBytes(source.url, source.fetchOptions, signal)
          : await readBinary(source.binary, signal);

      this.#checkSize(bytes.byteLength);

      const json =
        source.type === Type.TGS ? decodeTgs(bytes, this.#sourceLimit) : decodeUtf8(bytes);

      return parseLottieJson(json);
    } catch (error) {
      if (signal.aborted) {
        throw createAbortError(signal.reason);
      }

      if (error instanceof RLottieError) {
        throw error;
      }

      throw new RLottieError("SOURCE_FETCH_FAILED", "Unable to read the Lottie source", {
        cause: error,
      });
    }
  }

  #store(key: string, loaded: LoadedSource): void {
    const { bytes } = loaded;

    if (bytes > this.#cacheBudget) {
      return;
    }

    const previous = this.#cache.get(key);

    if (previous !== undefined) {
      this.#cacheBytes -= previous.bytes;
    }

    this.#cache.delete(key);
    this.#cache.set(key, loaded);
    this.#cacheBytes += bytes;
    this.#trimCache();
  }

  #touchCacheEntry(key: string, entry: CacheEntry): void {
    this.#cache.delete(key);
    this.#cache.set(key, entry);
  }

  #trimCache(): void {
    while (this.#cacheBytes > this.#cacheBudget) {
      const oldestKey = this.#cache.keys().next().value;

      if (oldestKey === undefined) {
        return;
      }

      const oldest = this.#cache.get(oldestKey);

      this.#cache.delete(oldestKey);
      this.#cacheBytes -= oldest?.bytes ?? 0;
    }
  }
}
