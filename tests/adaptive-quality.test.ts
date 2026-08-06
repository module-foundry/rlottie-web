import { describe, expect, it } from "vitest";

import { AdaptiveQualityController } from "#core/quality/adaptive-quality-controller";

const options = {
  step: 0.1,
  minFps: 18,
  enabled: true,
  allowFpsReduction: true,
  minResolutionScale: 0.8,
};

describe("AdaptiveQualityController", () => {
  it("degrades after consecutive bad windows and recovers more slowly", () => {
    const controller = new AdaptiveQualityController(options, 30);
    for (let index = 0; index < 3; index += 1)
      controller.sample({ droppedRatio: 0.3, workerUtilization: 1, renderBudgetRatio: 1.2 }, 30);
    expect(controller.state.scale).toBeCloseTo(0.9);
    for (let index = 0; index < 7; index += 1)
      controller.sample({ droppedRatio: 0, renderBudgetRatio: 0.2, workerUtilization: 0.2 }, 30);
    expect(controller.state.scale).toBeCloseTo(0.9);
    controller.sample({ droppedRatio: 0, renderBudgetRatio: 0.2, workerUtilization: 0.2 }, 30);
    expect(controller.state.scale).toBe(1);
  });
});
