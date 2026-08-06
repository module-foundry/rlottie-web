import { describe, expect, it } from "vitest";

import { WorkerSourceCache } from "#core/workers/worker-source-cache";

describe("WorkerSourceCache", () => {
  it("resolves a keyed source after its JSON payload is omitted", () => {
    const cache = new WorkerSourceCache(100);

    expect(cache.resolve("source-1", "source json", 11)).toBe("source json");
    expect(cache.resolve("source-1", undefined, 11)).toBe("source json");
  });

  it("evicts least recently used JSON within its byte budget", () => {
    const cache = new WorkerSourceCache(10);

    cache.resolve("source-1", "first", 6);
    cache.resolve("source-2", "second", 6);

    expect(() => cache.resolve("source-1", undefined, 6)).toThrow(
      "Worker source cache entry is missing: source-1",
    );
    expect(cache.resolve("source-2", undefined, 6)).toBe("second");
  });

  it("requires JSON for unkeyed payloads", () => {
    const cache = new WorkerSourceCache();

    expect(() => cache.resolve(undefined, undefined, 0)).toThrow(
      "Unkeyed worker source payload is missing JSON",
    );
  });
});
