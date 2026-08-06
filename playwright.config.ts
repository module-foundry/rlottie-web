import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "tests/browser",
  use: { headless: true, browserName: "chromium" },
  webServer: {
    port: 4173,
    reuseExistingServer: true,
    command: "node tests/browser/server.mjs",
  },
});
