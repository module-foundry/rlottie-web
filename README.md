# @module-foundry/rlottie-web

Worker-first Samsung RLottie playback for the browser, with framework-agnostic, React, and SolidJS
entry points.

```sh
pnpm add @module-foundry/rlottie-web
```

```tsx
import { Format, Type } from "@module-foundry/rlottie-web";
import { useRLottie } from "@module-foundry/rlottie-web/reactjs";

const lottie = useRLottie({
  source: { format: Format.URL, type: Type.TGS, url: "/loader.tgs" },
});

return <canvas ref={lottie.canvasRef} />;
```

```tsx
import { Format, Type } from "@module-foundry/rlottie-web";
import { createRLottie } from "@module-foundry/rlottie-web/solidjs";

const lottie = createRLottie({
  source: { format: Format.URL, type: Type.JSON, url: "/loader.json" },
});

return <canvas ref={lottie.canvasRef} />;
```

Core usage and all source/options recipes are in [docs/usage.md](docs/usage.md). Imports are
SSR-safe; browser resources are acquired only after a canvas is bound. The preferred runtime needs
Dedicated Worker and OffscreenCanvas support. React and Solid are optional peer dependencies.

## Local playgrounds

Run both framework examples from the repository root:

```sh
pnpm dev
```

React is served at `http://localhost:3000`; SolidJS is served at `http://localhost:3001`. The
command builds the package first and keeps both development servers in the same terminal.

Defaults: `autoplay: true`, `loop: true`, `fps: 24`, `frameStep: 1`, `fit: "contain"`,
`resolution: "auto"`, `pixelRatio: "device"`, `maxPixelRatio: 2`, and adaptive quality disabled.

| Option            | Default   | Purpose                                             |
| ----------------- | --------- | --------------------------------------------------- |
| `fps`             | `24`      | Caps render attempts; `"source"` follows source FPS |
| `frameStep`       | `1`       | Quantizes source frames without changing duration   |
| `resolution`      | `"auto"`  | Follows CSS size; fixed dimensions are opt-in       |
| `resolutionScale` | `1`       | Scales internal raster resolution                   |
| `visibility`      | `"pause"` | Pauses, catches up, or ignores visibility           |
| `adaptiveQuality` | `false`   | Opt-in bounded resolution/FPS degradation           |
