import type { SessionRenderGroup, SessionRenderPlan, SharedFrameSession } from "#core/types/index";
import { SharedFrameSurface } from "#core/workers/shared-frame-surface";

const selectGroupSize = (group: SessionRenderGroup, plan: SessionRenderPlan): void => {
  if (plan.shape === "fill") {
    group.width = Math.max(group.width, plan.rect.width);
    group.height = Math.max(group.height, plan.rect.height);

    return;
  }

  if (plan.rect.width * plan.rect.height > group.width * group.height) {
    group.width = plan.rect.width;
    group.height = plan.rect.height;
  }
};

export const groupRenderPlans = (plans: SessionRenderPlan[]): SessionRenderGroup[] => {
  const byKey = new Map<string, SessionRenderGroup>();

  for (const plan of plans) {
    const existing = byKey.get(plan.groupKey);

    if (existing === undefined) {
      byKey.set(plan.groupKey, {
        plans: [plan],
        width: plan.rect.width,
        height: plan.rect.height,
      });

      continue;
    }

    existing.plans.push(plan);
    selectGroupSize(existing, plan);
  }

  return [...byKey.values()];
};

export class SharedFrameCoordinator {
  readonly #surface = new SharedFrameSurface();

  public destroy(): void {
    this.#surface.destroy();
  }

  public render(
    plans: SessionRenderPlan[],
    sessions: ReadonlyMap<string, SharedFrameSession>,
  ): void {
    for (const group of groupRenderPlans(plans)) {
      const firstPlan = group.plans[0];

      if (firstPlan === undefined) {
        continue;
      }

      const firstSession = sessions.get(firstPlan.playerId);

      if (firstSession === undefined) {
        continue;
      }

      if (group.plans.length === 1) {
        firstSession.renderPlanned(firstPlan);

        continue;
      }

      const started = performance.now();
      const pixels = firstSession.renderNative(firstPlan.frame, group.width, group.height);
      const frame = this.#surface.write(pixels, group.width, group.height);

      for (const plan of group.plans) {
        sessions.get(plan.playerId)?.presentShared(plan, frame);
      }

      const duration = (performance.now() - started) / group.plans.length;

      for (const plan of group.plans) {
        sessions.get(plan.playerId)?.recordRender(duration);
      }
    }
  }
}
