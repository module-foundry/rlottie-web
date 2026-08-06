import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkerTaskScheduler } from "#core/workers/worker-task-scheduler";

describe("WorkerTaskScheduler", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("runs overdue work through a task without a timer", async () => {
    vi.useFakeTimers();

    const scheduler = new WorkerTaskScheduler();
    const callback = vi.fn();

    await new Promise<void>(resolve => {
      scheduler.schedule(() => {
        callback();
        resolve();
      }, 0);
    });

    expect(callback).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);

    scheduler.cancel();
  });

  it("cancels a future deadline", () => {
    vi.useFakeTimers();

    const scheduler = new WorkerTaskScheduler();
    const callback = vi.fn();

    scheduler.schedule(callback, 10);
    scheduler.cancel();
    vi.advanceTimersByTime(10);

    expect(callback).not.toHaveBeenCalled();
  });
});
