import { describe, expect, it } from "vitest";

import { resolveOptions } from "#core/player/defaults";
import {
  calculateFitRect,
  calculateRenderSize,
  resolveRenderProfile,
} from "#core/sizing/render-size";

describe("sizing", () => {
  it("applies matching responsive rules in order", () => {
    const options = resolveOptions({
      fps: 24,
      responsive: [
        { fps: 20, resolutionScale: 0.8, when: { maxCanvasWidth: 500 } },
        { fps: 30, when: { media: "large" } },
      ],
    });
    const profile = resolveRenderProfile(options, 400, query => query === "large");
    expect(profile.fps).toBe(30);
    expect(profile.resolutionScale).toBe(0.8);
  });

  it("clamps DPR and maximum pixels", () => {
    const profile = resolveRenderProfile(
      resolveOptions({ maxRenderPixels: 10_000 }),
      100,
      () => false,
    );
    expect(calculateRenderSize({ width: 100, height: 100 }, profile, 3)).toEqual({
      width: 100,
      height: 100,
    });
  });

  it("uses the full device DPR by default", () => {
    const profile = resolveRenderProfile(resolveOptions(), 100, () => false);

    expect(calculateRenderSize({ width: 100, height: 100 }, profile, 3)).toEqual({
      width: 300,
      height: 300,
    });
  });

  it("honors an explicit DPR cap", () => {
    const profile = resolveRenderProfile(resolveOptions({ maxPixelRatio: 2 }), 100, () => false);

    expect(calculateRenderSize({ width: 100, height: 100 }, profile, 3)).toEqual({
      width: 200,
      height: 200,
    });
  });

  it("keeps fixed backing resolution independent of CSS size and DPR", () => {
    const profile = resolveRenderProfile(
      resolveOptions({ resolution: { width: 128, height: 128 } }),
      320,
      () => false,
    );

    expect(calculateRenderSize({ width: 320, height: 320 }, profile, 2)).toEqual({
      width: 128,
      height: 128,
    });
  });

  it("preserves aspect ratio for contain and cover", () => {
    expect(
      calculateFitRect({ width: 200, height: 100 }, { width: 100, height: 100 }, "contain"),
    ).toEqual({ x: 0, y: 25, height: 50, width: 100 });
    expect(
      calculateFitRect({ width: 200, height: 100 }, { width: 100, height: 100 }, "cover"),
    ).toEqual({ y: 0, x: -50, width: 200, height: 100 });
  });
});
