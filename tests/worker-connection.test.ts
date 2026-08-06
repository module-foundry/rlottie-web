import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkerRequest } from "#core/types/index";
import { WorkerConnection } from "#core/workers/worker-connection";

const posted: unknown[] = [];

class FakeWorker {
  public addEventListener(): void {}

  public postMessage(message: unknown): void {
    posted.push(message);
  }

  public removeEventListener(): void {}

  public terminate(): void {}
}

const createRequest = (playerId: string): WorkerRequest => ({
  playerId,
  width: 64,
  height: 64,
  workerId: 0,
  requestId: 1,
  posterFrame: 0,
  renderPhase: 0,
  type: "create",
  sourceBytes: 11,
  json: "shared json",
  sourceKey: "shared-source",
  metadata: { width: 64, height: 64, duration: 1, frameRate: 60, totalFrames: 60 },
  options: {
    fps: 60,
    loop: true,
    direction: 1,
    frameStep: 1,
    fit: "contain",
    playbackRate: 1,
  },
});

describe("WorkerConnection source payloads", () => {
  afterEach(() => {
    posted.length = 0;
    vi.unstubAllGlobals();
  });

  it("posts keyed JSON once and uses references for later sessions", () => {
    vi.stubGlobal("Worker", FakeWorker);

    const connection = new WorkerConnection(7);
    const first = connection.assign("player-1", () => undefined);
    const second = connection.assign("player-2", () => undefined);

    first.post(createRequest("player-1"));
    second.post(createRequest("player-2"));

    expect(posted).toHaveLength(2);
    expect(posted).toEqual([
      expect.objectContaining({
        workerId: 7,
        json: "shared json",
        sourceKey: "shared-source",
      }),
      expect.objectContaining({
        workerId: 7,
        json: undefined,
        sourceKey: "shared-source",
      }),
    ]);

    const renderPhases = posted.flatMap(message =>
      typeof message === "object" &&
      message !== null &&
      "renderPhase" in message &&
      typeof message.renderPhase === "number"
        ? [message.renderPhase]
        : [],
    );

    expect(renderPhases).toHaveLength(2);
    expect(renderPhases[0]).not.toBe(renderPhases[1]);

    connection.destroy();
  });
});
