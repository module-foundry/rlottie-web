import { describe, expect, it } from "vitest";

describe("framework adapters", () => {
  it("imports React and Solid entry points without browser globals", async () => {
    const browserGlobals = ["window", "document", "Worker"];
    for (const name of browserGlobals) expect(name in globalThis).toBe(false);
    await expect(import("../packages/react/src/index.js")).resolves.toHaveProperty("useRLottie");
    await expect(import("../packages/solid/src/index.js")).resolves.toHaveProperty("createRLottie");
  });
});
