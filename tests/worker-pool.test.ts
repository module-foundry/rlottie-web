import { afterEach, describe, expect, it, vi } from "vitest";

import type { WorkerRequest } from "#core/types/index";
import { WorkerPool } from "#core/workers/worker-pool";

const workers: FakeWorker[] = [];

class FakeWorker {
  public readonly messages: unknown[] = [];

  public constructor() {
    workers.push(this);
  }

  public addEventListener(): void {}

  public postMessage(message: unknown): void {
    this.messages.push(message);
  }

  public removeEventListener(): void {}

  public terminate(): void {}
}

describe("WorkerPool source affinity", () => {
  afterEach(() => {
    workers.length = 0;
    vi.unstubAllGlobals();
  });

  it("keeps a small matching source group on one worker", () => {
    vi.stubGlobal("Worker", FakeWorker);

    const pool = new WorkerPool(4);
    const leases = Array.from({ length: 10 }, (_, index) =>
      pool.assign(`player-${String(index)}`, () => undefined, "shared-source"),
    );

    expect(workers).toHaveLength(1);

    for (const lease of leases) {
      lease.destroy();
    }

    pool.destroy();
  });

  it("balances one hundred matching players across four bounded cohorts", () => {
    vi.stubGlobal("Worker", FakeWorker);

    const pool = new WorkerPool(4);
    const leases = Array.from({ length: 100 }, (_, index) => {
      const playerId = `player-${String(index)}`;
      const lease = pool.assign(playerId, () => undefined, "shared-source");
      const message: WorkerRequest = { playerId, type: "pause" };

      lease.post(message);

      return lease;
    });

    expect(workers).toHaveLength(4);
    expect(workers.map(worker => worker.messages.length)).toEqual([25, 25, 25, 25]);

    for (const lease of leases) {
      lease.destroy();
    }

    pool.destroy();
  });
});
