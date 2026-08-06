# Usage

Install `@module-foundry/rlottie-web`, render a canvas, and pass an explicitly formatted source.
`Format` identifies whether the source is local or remote, while `Type` selects JSON or TGS
decoding. Both enums are exported and keep stable numeric values.

```ts
import { Format, RLottiePlayer, Type } from "@module-foundry/rlottie-web";

const player = new RLottiePlayer(document.querySelector("canvas"), {
  autoplay: false,
  resolution: "auto",
});

await player.load({ format: Format.URL, type: Type.TGS, url: "/loader.tgs" });
player.play();
```

Local JSON accepts a string or object. Local TGS accepts `ArrayBuffer`, `Uint8Array`, `Blob`, or
`File`. `fps` limits render attempts without changing duration; `frameStep` selects source frames
`0, N, 2N, ...`. Fixed backing resolution is opt-in with `{ width, height }`.

`RLottiePlayer.subscribeDiagnostics()` reports one-second worker windows. `renderedFps` is the
completed RLottie render rate and must be measured separately from browser `requestAnimationFrame`
frequency. `renderedFrames`, `droppedFrames`, and `renderAverageMs` describe the same window.
React's `useRLottie` and Solid's `createRLottie` expose the same imperative subscription without
publishing frame-level reactive state.

Default players share a realm-wide, byte-bounded source cache. Concurrent players using the same URL
reuse one fetch, decode, and metadata parse while keeping independent native animation instances and
destroy paths. Pass `dependencies.sourceLoader` to `RLottiePlayer` when loader isolation is
required.

React imports from `@module-foundry/rlottie-web/reactjs`; Solid imports from
`@module-foundry/rlottie-web/solidjs`. Both adapters are SSR-safe and do not create browser
resources during module evaluation.

WASM and worker assets must be served beside `dist/core/index.js`. Ensure the server sends `.wasm`
as `application/wasm` and permits the animation URL through CORS.
