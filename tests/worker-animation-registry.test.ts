import { describe, expect, it, vi } from "vitest";

import type { NativeAnimation, NativeFactory } from "#core/types/index";
import { WorkerAnimationRegistry } from "#core/workers/worker-animation-registry";

const createAnimation = (destroy: () => void): NativeAnimation => ({
  delete: destroy,
  render: vi.fn(() => new Uint8Array()),
});

describe("WorkerAnimationRegistry", () => {
  it("shares one native handle until the final keyed lease is released", () => {
    const destroy = vi.fn();
    const animation = createAnimation(destroy);
    const create = vi.fn(() => animation);
    const factory: NativeFactory = { create };
    const registry = new WorkerAnimationRegistry();
    const first = registry.acquire("shared-source", "json", factory);
    const second = registry.acquire("shared-source", "json", factory);

    expect(first.animation).toBe(animation);
    expect(second.animation).toBe(animation);
    expect(create).toHaveBeenCalledOnce();

    first.destroy();
    first.destroy();
    expect(destroy).not.toHaveBeenCalled();

    second.destroy();
    second.destroy();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("keeps unkeyed native handles isolated", () => {
    const destroyFirst = vi.fn();
    const destroySecond = vi.fn();
    const firstAnimation = createAnimation(destroyFirst);
    const secondAnimation = createAnimation(destroySecond);
    const factory: NativeFactory = {
      create: vi.fn().mockReturnValueOnce(firstAnimation).mockReturnValueOnce(secondAnimation),
    };
    const registry = new WorkerAnimationRegistry();
    const first = registry.acquire(undefined, "json", factory);
    const second = registry.acquire(undefined, "json", factory);

    expect(first.animation).not.toBe(second.animation);

    first.destroy();
    second.destroy();
    expect(destroyFirst).toHaveBeenCalledOnce();
    expect(destroySecond).toHaveBeenCalledOnce();
  });

  it("clears active shared handles once and tolerates later lease cleanup", () => {
    const destroy = vi.fn();
    const animation = createAnimation(destroy);
    const factory: NativeFactory = { create: vi.fn(() => animation) };
    const registry = new WorkerAnimationRegistry();
    const lease = registry.acquire("shared-source", "json", factory);

    registry.clear();
    registry.clear();
    lease.destroy();

    expect(destroy).toHaveBeenCalledOnce();
  });
});
