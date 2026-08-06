# Architecture

The public `RLottiePlayer` owns a canvas binding, source task, responsive observers, low-frequency
store, and one lease in the shared worker pool. Framework adapters only bind lifecycle and expose
the store; they do not know about WASM or scheduling.

The pool is registered under a versioned `Symbol.for` key and creates dedicated workers lazily.
Players keep worker affinity. Each worker owns one WASM module, a scheduler, and multiple animation
sessions. A session has at most one render in progress and one coalesced desired frame.

The preferred path transfers the visible canvas to a worker. The worker renders into RLottie's
reusable buffer and presents it with `OffscreenCanvasRenderingContext2D.putImageData`. When direct
transfer is unavailable, the worker renders to an internal offscreen canvas and transfers an
`ImageBitmap` for presentation. No framework state is published per frame.

## Lifecycle paths

- Success: validate/decode source, acquire worker, create native animation, apply surface/profile,
  render poster or start the time-based scheduler, and publish metadata/state.
- Error: reject the active request with an `RLottieError`, destroy any partially created worker
  record/native handle, and publish `error` only if the request is still current.
- Cancellation: abort fetch/decode, increment the load generation, and tell the worker to discard
  the old session before another source is installed.
- Destroy: abort source work, disconnect all observers/listeners, destroy the worker record and
  native handle, release the pool lease, close the current bitmap, and publish `destroyed` once.

See [ADR 0002](decisions/0002-worker-model.md) for the worker model and
[memory-management.md](memory-management.md) for ownership details.

TypeScript 7 performs project typechecking and declaration emit. Until its compiler API is stable,
type-aware ESLint uses the official `@typescript/typescript6` compatibility package side by side.
