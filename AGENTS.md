# Repository rules

These rules apply to the entire repository.

## Design first

- Keep the public contract, resource ownership, success, error, cancellation, and destroy paths
  explicit.
- Record architecture changes in `docs/decisions/` before implementing them.
- Add a reproducible baseline before performance optimization and compare after the change.

## Code quality

- Use strict TypeScript. Avoid `any`, unjustified assertions, and non-null assertions.
- Use arrow-function expressions for every function that is not a class method.
- Use package aliases (`#core/*`, `#react/*`, and `#solid/*`) instead of relative source imports.
- Keep all TypeScript types and interfaces in the package's central `types` module.
- Keep constants before functions and classes. Never leave helpers below a class declaration.
- Keep one class per file and compose large responsibilities from focused collaborators.
- Keep effect hooks after state, ref, memo, callback, and external-store hooks.
- Separate logical control-flow blocks with a blank line.
- Keep modules focused and filenames/directories in kebab-case.
- Document public types and convert failures to stable `RLottieError` codes.
- Prefer composition and explicit ownership over inheritance.
- Do not add a public option when composition can solve the use case.

## Lifecycle and memory

- Every native handle has exactly one owner and an explicit destroy path.
- Pair every allocation, observer, listener, worker, bitmap, object URL, and request with cleanup.
- `destroy()` and `dispose()` must be idempotent; cancellation and errors follow normal cleanup.
- Do not keep unbounded caches or frame queues.
- Treat WASM typed-array views as invalid after resize or memory growth.

## Performance

- Do not add hot-path allocations without a benchmark.
- Transfer large buffers; never clone full RGBA frames without a documented reason.
- Keep at most one active render and one coalesced desired frame per player.
- Drop stale frames instead of building a backlog.
- Framework adapters must not update reactive state every animation frame.

## Definition of done

Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, and the relevant
browser/benchmark checks. ESLint must finish with zero errors and zero warnings.
