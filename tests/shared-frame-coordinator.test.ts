import { afterEach, describe, expect, it, vi } from "vitest";

import type { SessionRenderPlan, SharedFrameSession } from "#core/types/index";
import { groupRenderPlans, SharedFrameCoordinator } from "#core/workers/shared-frame-coordinator";

class FakeOffscreenCanvas {
  public height: number;
  public width: number;

  public constructor(width: number, height: number) {
    this.height = height;
    this.width = width;
  }

  public getContext() {
    return {
      putImageData: vi.fn(),
    };
  }
}

class FakeImageData {
  public readonly data: Uint8ClampedArray;

  public constructor(data: Uint8ClampedArray) {
    this.data = data;
  }
}

const createPlan = (
  playerId: string,
  width: number,
  height: number,
  overrides: Partial<SessionRenderPlan> = {},
): SessionRenderPlan => ({
  playerId,
  frame: 12,
  shape: "preserve-aspect",
  rect: { x: 0, y: 0, width, height },
  groupKey: "shared-source\u0000preserve-aspect\u000012",
  ...overrides,
});

describe("shared frame plans", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("reduces ten matching sessions to one largest raster group", () => {
    const plans = Array.from({ length: 10 }, (_, index) =>
      createPlan(`player-${String(index)}`, 64 + index * 16, 64 + index * 16),
    );

    expect(groupRenderPlans(plans)).toEqual([
      expect.objectContaining({ plans, width: 208, height: 208 }),
    ]);
  });

  it("keeps different frames and raster shape modes separate", () => {
    const groups = groupRenderPlans([
      createPlan("player-1", 64, 64),
      createPlan("player-2", 128, 128, {
        frame: 13,
        groupKey: "shared-source\u0000preserve-aspect\u000013",
      }),
      createPlan("player-3", 100, 50, {
        shape: "fill",
        groupKey: "shared-source\u0000fill\u000012",
      }),
    ]);

    expect(groups).toHaveLength(3);
  });

  it("uses both maximum dimensions for fill output", () => {
    const groups = groupRenderPlans([
      createPlan("player-1", 200, 50, {
        shape: "fill",
        groupKey: "shared-source\u0000fill\u000012",
      }),
      createPlan("player-2", 50, 200, {
        shape: "fill",
        groupKey: "shared-source\u0000fill\u000012",
      }),
    ]);

    expect(groups[0]).toEqual(expect.objectContaining({ width: 200, height: 200 }));
  });

  it("rasterizes a matching group once and presents every session", () => {
    vi.stubGlobal("OffscreenCanvas", FakeOffscreenCanvas);
    vi.stubGlobal("ImageData", FakeImageData);

    const plans = [createPlan("player-1", 64, 64), createPlan("player-2", 128, 128)];
    const renderNative = vi.fn(() => new Uint8Array(128 * 128 * 4));
    const presentShared = vi.fn();
    const sessions = new Map<string, SharedFrameSession>();

    for (const plan of plans) {
      sessions.set(plan.playerId, {
        renderNative,
        presentShared,
        recordRender: vi.fn(),
        renderPlanned: vi.fn(),
      });
    }

    const coordinator = new SharedFrameCoordinator();

    coordinator.render(plans, sessions);

    expect(renderNative).toHaveBeenCalledOnce();
    expect(renderNative).toHaveBeenCalledWith(12, 128, 128);
    expect(presentShared).toHaveBeenCalledTimes(2);

    coordinator.destroy();
  });
});
