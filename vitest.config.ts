import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/**/*.test.ts"],
    coverage: { provider: "v8", reporter: ["text", "html"] },
  },
  resolve: {
    alias: {
      "#core": fileURLToPath(new URL("./packages/core/src", import.meta.url)),
      "#react": fileURLToPath(new URL("./packages/react/src", import.meta.url)),
      "#solid": fileURLToPath(new URL("./packages/solid/src", import.meta.url)),
      "@module-foundry/rlottie-web": fileURLToPath(
        new URL("./packages/core/src/index.ts", import.meta.url),
      ),
    },
  },
});
