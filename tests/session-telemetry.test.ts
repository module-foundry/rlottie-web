import { describe, expect, it } from "vitest";

import type { WorkerEvent } from "#core/types/index";
import { SessionTelemetry } from "#core/workers/session-telemetry";

describe("SessionTelemetry", () => {
  it("reports and resets one-second render windows", () => {
    const events: WorkerEvent[] = [];
    const telemetry = new SessionTelemetry(
      "player-1",
      2,
      () => "offscreen-direct",
      event => events.push(event),
      0,
    );

    telemetry.recordRender(4);
    telemetry.recordRender(6);
    telemetry.recordDroppedFrames(1);
    telemetry.emitIfDue(1_000, 1, "playing", 60);
    telemetry.emitIfDue(2_000, 2, "playing", 120);

    const diagnostics = events.filter(
      (event): event is Extract<WorkerEvent, { type: "diagnostics" }> =>
        event.type === "diagnostics",
    );

    expect(diagnostics.map(event => event.diagnostics)).toEqual([
      {
        workerId: 2,
        queueDepth: 0,
        renderedFps: 2,
        droppedFrames: 1,
        renderedFrames: 2,
        renderAverageMs: 5,
        renderPath: "offscreen-direct",
      },
      {
        workerId: 2,
        queueDepth: 0,
        renderedFps: 0,
        droppedFrames: 0,
        renderedFrames: 0,
        renderAverageMs: 0,
        renderPath: "offscreen-direct",
      },
    ]);
  });
});
