import { bench, describe } from "vitest";

import type { SessionRenderPlan } from "#core/types/index";
import { groupRenderPlans } from "#core/workers/shared-frame-coordinator";

const plans: SessionRenderPlan[] = Array.from({ length: 10 }, (_, index) => {
  const size = 64 + index * 16;

  return {
    frame: 12,
    shape: "preserve-aspect",
    playerId: `player-${String(index)}`,
    rect: { x: 0, y: 0, width: size, height: size },
    groupKey: "shared-source\u0000preserve-aspect\u000012",
  };
});
const cohortPlans: SessionRenderPlan[] = Array.from({ length: 25 }, (_, index) => ({
  frame: 12,
  shape: "preserve-aspect",
  playerId: `cohort-player-${String(index)}`,
  rect: { x: 0, y: 0, width: 128, height: 128 },
  groupKey: "shared-source\u0000preserve-aspect\u000012",
}));

describe("shared frame planning hot path", () => {
  bench("group ten synchronized render plans", () => {
    groupRenderPlans(plans);
  });

  bench("group one twenty-five-player cohort", () => {
    groupRenderPlans(cohortPlans);
  });
});
