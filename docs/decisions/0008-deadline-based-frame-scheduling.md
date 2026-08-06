# ADR 0008: Deadline-based frame scheduling and measured render FPS

## Status

Accepted.

## Context

The worker scheduler polled every 16 milliseconds and each animation accepted a frame only after
`now - lastRenderAt` reached `1000 / fps`. At a 60 FPS target, the 16 millisecond poll arrived
before the 16.67 millisecond render interval, so the player commonly waited for the following poll
and produced approximately 32 render attempts per second. Scheduling the next poll only after all
sessions had rendered added worker execution time to every interval and caused additional drift.

The React playground displayed browser `requestAnimationFrame` frequency. That number describes UI
and display refresh cadence, not frames completed by RLottie in a worker, so it could show 120 FPS
while animations rendered substantially fewer frames.

The reproducible pre-change baseline for ticks at `0, 16, 32, ...` milliseconds with a 60 FPS target
is 32 accepted renders in one second. The existing timeline benchmark measured approximately 8.5
million `frameAtTime` operations per second on the development machine.

## Decision

- Each animation owns a bounded frame-rate limiter with one next-render deadline. After a late tick,
  the deadline advances from its previous phase and skips elapsed slots instead of resetting to the
  observed tick time. No render queue is introduced.
- The shared worker scheduler uses one compensated monotonic deadline and an 8 millisecond fallback
  polling interval. Rendering work and timer delay do not accumulate into permanent scheduler drift.
- When one shared-worker sweep itself consumes the polling interval, the next sweep is scheduled by
  a `MessageChannel` task. The task boundary is retained without the nested-timer minimum delay;
  future deadlines still use one cancellable timer. The scheduler owns and closes both ports when
  the worker becomes idle, and a later create lazily opens a fresh channel.
- Forced renders, option changes, reloads, and render-gate restoration explicitly restart animation
  cadence. Destroy continues to cancel the single worker timer when its final session is removed.
- Completing a native session create or reload also restarts the one shared worker deadline. A timer
  queued behind a burst of synchronous native initialization is cancelled instead of beginning
  steady-state playback with a stale pre-initialization phase.
- Worker leases receive stable, evenly distributed render phases. Forced renders, updates, and gate
  restoration preserve that phase, so many identical players do not repeatedly become due in one
  synchronized render burst. The initial forced frame remains immediate; the first scheduled frame
  is delayed by one cadence interval plus the lease phase, after which subsequent deadlines retain
  the requested FPS cadence.
- A due render deadline is consumed only when the animation timeline exposes a different source
  frame. Polling shortly before a source-frame boundary leaves the deadline due, so equal source and
  target frame rates cannot alias into a persistent half-rate cadence. Dropped-frame telemetry is
  capped by source frames actually skipped rather than timer slots that contained no new frame.
- Worker diagnostics are one-second window samples. They report completed render FPS, completed
  frames, skipped target slots, and average render duration for that window.
- Framework adapters expose diagnostics subscriptions as imperative subscriptions. They do not add
  frame-level reactive state updates.
- Playground UI FPS and RLottie rendered FPS remain separate readings. Stress-player diagnostics
  feed one aggregate store that publishes to React at most once per second.

## Consequences

A 60 FPS source can reach approximately 60 completed renders per second when rendering stays within
budget, independent of a 60 Hz or 120 Hz page `requestAnimationFrame` reading. Sources with a lower
native frame rate still produce only their available unique frames, and `fps` remains an upper bound
rather than interpolation. Late work is coalesced into the latest desired frame and reported as
dropped target slots instead of creating backlog.
