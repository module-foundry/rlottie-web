import { afterEach, describe, expect, it, vi } from "vitest";

import type { LoadedSource } from "#core/types/index";
import { SourceDeliveryQueue } from "#core/sources/source-delivery-queue";

const loaded: LoadedSource = {
  bytes: 2,
  json: "{}",
  metadata: { width: 1, height: 1, duration: 1, frameRate: 1, totalFrames: 1 },
};

describe("SourceDeliveryQueue", () => {
  afterEach(() => vi.useRealTimers());

  it("delivers at most four consumers per event-loop task", async () => {
    vi.useFakeTimers();

    const queue = new SourceDeliveryQueue();
    const delivered: number[] = [];

    for (let consumer = 0; consumer < 5; consumer += 1) {
      void queue.deliver(loaded, new AbortController().signal).then(() => {
        delivered.push(consumer);
      });
    }

    await vi.advanceTimersToNextTimerAsync();
    expect(delivered).toHaveLength(4);

    await vi.advanceTimersToNextTimerAsync();
    expect(delivered).toHaveLength(5);
  });

  it("rejects a consumer aborted before its delivery task", async () => {
    vi.useFakeTimers();

    const queue = new SourceDeliveryQueue();
    const controller = new AbortController();
    const delivery = queue.deliver(loaded, controller.signal);
    const rejection = expect(delivery).rejects.toMatchObject({ code: "SOURCE_ABORTED" });

    controller.abort();
    await vi.advanceTimersToNextTimerAsync();
    await rejection;
  });
});
