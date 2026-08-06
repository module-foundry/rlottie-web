import { describe, expect, it } from "vitest";

import { resolveOptions } from "#core/player/defaults";
import { sameResolvedOptions } from "#core/player/same-resolved-options";

describe("sameResolvedOptions", () => {
  it("treats equivalent nested option values as unchanged", () => {
    const left = resolveOptions({
      resolution: { width: 256, height: 256 },
      adaptiveQuality: { minFps: 12, enabled: true },
      responsive: [{ resolutionScale: 0.75, when: { minCanvasWidth: 320 } }],
    });
    const right = resolveOptions({
      resolution: { width: 256, height: 256 },
      adaptiveQuality: { minFps: 12, enabled: true },
      responsive: [{ resolutionScale: 0.75, when: { minCanvasWidth: 320 } }],
    });

    expect(sameResolvedOptions(left, right)).toBe(true);
  });

  it("detects a nested responsive option change", () => {
    const left = resolveOptions({ responsive: [{ when: { minCanvasWidth: 320 } }] });
    const right = resolveOptions({ responsive: [{ when: { minCanvasWidth: 640 } }] });

    expect(sameResolvedOptions(left, right)).toBe(false);
  });
});
