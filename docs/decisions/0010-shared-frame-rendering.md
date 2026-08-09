# ADR 0010: Shared rasterization for identical animations

## Status

Accepted.

## Context

Each player session currently owns a native animation and rasterizes every due frame independently.
Ten synchronized players showing the same keyed source therefore issue ten RLottie render calls per
source frame, even when nine outputs are only smaller versions of the largest output.

The reproducible pre-change baseline is the `shared-frame-plans` unit scenario: ten due sessions for
one source and frame require ten native renders. The existing timeline benchmark was also recorded
before this change on Node 24.18.0: frame quantization 10,135,262 ops/s and deadline limiting
12,735,534 ops/s. These numbers are informational because the repository requires Node 26.6.0 and
does not yet define a reference-machine threshold.

After the cohort change, the grouping-only benchmark processes ten synchronized plans at 7,667,764
operations per second and one 25-player cohort at 4,314,992 operations per second on the same
machine. The unit scenario reduces matching plans to one native raster group; browser smoke verifies
that 100 differently sized instances load, advance, reload, and destroy through the real
WASM/offscreen path.

Players can have independent playback state, visibility gates, frame-rate limits, seek positions,
fit modes, and render sizes. A shared solution must not turn those controls into group-wide state.
WASM pixel views also become invalid after a later render or memory growth, so they cannot be kept
as a cross-frame cache.

## Decision

- A keyed source (`URL` or explicit `cacheKey`) supplies cohort affinity for the player's first
  load. A cohort accepts at most 24 active sessions before the source opens another cohort on the
  least-loaded worker not already serving that source. After all available workers participate,
  later sessions go to the least-populated cohort. With four workers, 100 synchronized instances
  settle at 25 sessions per worker and require at most four parallel native rasterizations.
- Each worker owns a reference-counted native-animation registry. Keyed sessions acquire one shared
  native handle per source and release it on reload or destroy; the final release destroys the
  handle. Unkeyed sources retain one handle per session. Registry teardown is idempotent and serves
  as a final safety cleanup when a worker becomes idle.
- Every worker tick first asks sessions which frame is due. Only requests with the same source key,
  source frame, and raster shape mode are grouped. Paused, gated, rate-limited, independently
  sought, or otherwise divergent sessions naturally remain independent.
- A group rasterizes once at its largest required resolution. Aspect-preserving `contain` and
  `cover` rectangles use the largest member's rectangle. `fill` uses the maximum width and height.
- The transient WASM view is copied immediately into one reusable worker-owned scratch canvas. Each
  session then draws that canvas into its own fit rectangle. Direct offscreen canvases stay
  worker-owned; bitmap fallback still transfers one bitmap per visible canvas.
- Single-session and unkeyed-source work stays on the existing direct path and does not pay for the
  scratch canvas.
- Each session retains its own timeline, surface, telemetry, and destroy path. Native ownership is
  represented by an idempotent lease from the worker registry. Shared work is coordinated only for a
  single tick; no frame queue or unbounded raster cache is added.
- A first-load affinity is not migrated after a source reload because an already transferred
  `OffscreenCanvas` cannot be transferred to a different worker. Reloaded sessions can still share
  with compatible sessions already assigned to that worker.

## Consequences

Ten synchronized instances of a keyed animation require one native rasterization per due source
frame instead of ten. One hundred instances use up to four worker cohorts rather than pinning all
presentation work to one worker. Canvas scaling and bitmap delivery remain per instance, and the
largest member of each cohort sets raster cost and visual quality. Independent controls remain
correct at the cost of additional rasterizations whenever frames diverge.

The optimization intentionally treats `cacheKey` as an identity contract, matching the existing
source cache behavior. Supplying the same key for different JSON is invalid usage and can display
the cached animation.
