import { describe, expect, it } from "vitest";

import { canTransition } from "#core/player/state-machine";

describe("state machine", () => {
  it("allows reload after an error and makes destroyed terminal", () => {
    expect(canTransition("error", "loading")).toBe(true);
    expect(canTransition("destroyed", "loading")).toBe(false);
  });
});
