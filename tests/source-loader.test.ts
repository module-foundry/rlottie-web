import { gzipSync } from "fflate";
import { afterEach, describe, expect, it, vi } from "vitest";

import { Format, Type } from "#core/types/index";
import type { RLottieError } from "#core/errors/rlottie-error";
import { getDefaultSourceLoader } from "#core/sources/default-source-loader";
import { SourceLoader } from "#core/sources/source-loader";

const animation = {
  h: 64,
  ip: 0,
  fr: 30,
  op: 60,
  w: 128,
  assets: [],
  layers: [],
  v: "5.7.4",
};

afterEach(() => vi.unstubAllGlobals());

describe("SourceLoader", () => {
  it("loads local JSON and extracts metadata", async () => {
    const loaded = await new SourceLoader().load(
      { json: animation, type: Type.JSON, format: Format.Local },
      new AbortController().signal,
    );
    expect(loaded.metadata).toEqual({
      height: 64,
      width: 128,
      duration: 2,
      frameRate: 30,
      totalFrames: 60,
    });
  });

  it("decodes TGS only when gzip magic bytes are present", async () => {
    const binary = gzipSync(new TextEncoder().encode(JSON.stringify(animation)));
    const loaded = await new SourceLoader().load(
      { binary, type: Type.TGS, format: Format.Local },
      new AbortController().signal,
    );
    expect(loaded.metadata.totalFrames).toBe(60);
  });

  it("uses stable errors for invalid gzip and JSON", async () => {
    await expect(
      new SourceLoader().load(
        { type: Type.TGS, format: Format.Local, binary: new Uint8Array([1, 2, 3]) },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_INVALID_GZIP" } satisfies Partial<RLottieError>);
    await expect(
      new SourceLoader().load(
        { json: "{", type: Type.JSON, format: Format.Local },
        new AbortController().signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_INVALID_JSON" } satisfies Partial<RLottieError>);
  });

  it("rejects an already aborted request", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(
      new SourceLoader().load(
        { json: animation, type: Type.JSON, format: Format.Local },
        controller.signal,
      ),
    ).rejects.toMatchObject({ code: "SOURCE_ABORTED" } satisfies Partial<RLottieError>);
  });

  it("deduplicates URL fetches without letting one consumer abort another", async () => {
    let calls = 0;
    vi.stubGlobal("fetch", async () => {
      calls += 1;
      await Promise.resolve();
      return new Response(JSON.stringify(animation));
    });
    const loader = new SourceLoader();
    const first = new AbortController();
    const second = new AbortController();
    const source = {
      type: Type.JSON,
      format: Format.URL,
      url: "https://example.test/animation.json",
    } as const;
    const firstLoad = loader.load(source, first.signal);
    const secondLoad = loader.load(source, second.signal);
    first.abort();
    await expect(firstLoad).rejects.toMatchObject({ code: "SOURCE_ABORTED" });
    await expect(secondLoad).resolves.toMatchObject({ metadata: { width: 128 } });
    expect(calls).toBe(1);
  });
});

describe("shared source loading", () => {
  it("reuses pending work when a Strict Mode remount follows cancellation", async () => {
    let calls = 0;

    vi.stubGlobal("fetch", async () => {
      calls += 1;
      await new Promise(resolve => {
        setTimeout(resolve, 10);
      });

      return new Response(JSON.stringify(animation));
    });

    const loader = new SourceLoader();
    const first = new AbortController();
    const source = {
      type: Type.JSON,
      format: Format.URL,
      url: "https://example.test/strict-mode.json",
    } as const;
    const firstLoad = loader.load(source, first.signal);

    first.abort();
    await expect(firstLoad).rejects.toMatchObject({ code: "SOURCE_ABORTED" });

    await expect(loader.load(source, new AbortController().signal)).resolves.toMatchObject({
      metadata: { width: 128 },
    });
    expect(calls).toBe(1);
  });

  it("shares the bounded default loader across players", async () => {
    let calls = 0;

    vi.stubGlobal("fetch", () => {
      calls += 1;

      return Promise.resolve(new Response(JSON.stringify(animation)));
    });

    const source = {
      type: Type.JSON,
      format: Format.URL,
      url: "https://example.test/default-loader.json",
    } as const;
    const loads = Array.from({ length: 51 }, () =>
      getDefaultSourceLoader().load(source, new AbortController().signal),
    );

    await expect(Promise.all(loads)).resolves.toHaveLength(51);
    expect(calls).toBe(1);
  });
});
