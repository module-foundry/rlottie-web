import { expect, test } from "@playwright/test";

test("loads the real WASM in a worker and advances the OffscreenCanvas animation", async ({
  page,
}) => {
  await page.goto("http://127.0.0.1:4173/");
  await expect(page.locator("body")).toHaveAttribute("data-status", "playing", { timeout: 15_000 });
  await expect(page.locator("body")).toHaveAttribute("data-width", "256");
  await expect(page.locator("body")).not.toHaveAttribute("data-error", /.+/u);
  await expect(page.locator("body")).toHaveAttribute("data-rendered-fps", /.+/u, {
    timeout: 15_000,
  });
  const renderedFps = Number(await page.locator("body").getAttribute("data-rendered-fps"));

  expect(renderedFps).toBeGreaterThan(45);

  const canvas = page.locator("canvas");
  await expect(canvas).toHaveAttribute("width", "128");
  await expect(canvas).toHaveAttribute("height", "64");
  const firstFrame = await canvas.screenshot();

  await page.waitForTimeout(500);

  const laterFrame = await canvas.screenshot();

  expect(laterFrame.equals(firstFrame)).toBe(false);
  await page.locator("#reload").click();
  await expect(page.locator("body")).toHaveAttribute("data-width", "64");
  await expect(page.locator("body")).toHaveAttribute("data-status", "playing");
  await page.locator("#destroy").click();
  await expect(page.locator("body")).toHaveAttribute("data-status", "destroyed");
});
