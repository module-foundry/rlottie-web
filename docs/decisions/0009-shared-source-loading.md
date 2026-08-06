# ADR 0009: Bounded shared default source loading

## Status

Accepted.

## Context

Every player constructed its own `SourceLoader`. The React stress playground creates 51 players for
the same JSON URL, so the initial page load issued 51 fetches and repeated UTF-8 decoding,
`JSON.parse`, metadata extraction, and cache storage on the main thread. A reproducible pre-change
baseline with 51 default loaders and one URL records 51 fetches.

React development Strict Mode can mount, immediately clean up, and mount again. When the final
consumer aborted a pending source request, the loader aborted the shared operation immediately. The
remount could therefore miss the pending operation and start another fetch and decode pass.

## Decision

- Players without an injected source loader use one realm-wide default `SourceLoader` registered by
  a versioned global symbol. Explicitly injected loaders remain isolated and retain their existing
  ownership semantics.
- The shared loader keeps the existing byte-bounded LRU cache and source-size limit. It stores only
  immutable JSON strings and metadata; player and native animation lifetimes remain independent.
- When the last consumer leaves an unsettled URL load, cancellation is deferred to the next timer
  task. A new consumer in the same lifecycle turn cancels that pending abort and reuses the work.
- Every deferred abort timer is cleared when work settles or a new consumer arrives. A genuinely
  abandoned request is still aborted and removed normally.
- A keyed source payload is cloned from the main thread to each worker connection once. The
  connection replaces later matching create/reload payloads with a key-only reference. Each worker
  owns a byte-bounded JSON cache, and every session still constructs and destroys its own native
  animation handle.
- Unknown or evicted worker source keys fail with a stable render error. Unkeyed local sources keep
  sending their JSON explicitly and are never cached implicitly.
- A shared loader delivers completed sources to at most four consumers per event-loop task. This
  prevents one resolved source Promise from waking dozens of players in a single microtask
  checkpoint and monopolizing the main thread with layout, canvas transfer, and worker posts.
  Aborted consumers are rejected before delivery, and the queue owns at most one timer.

## Consequences

Identical URL sources fetch, decode, and parse once per realm instead of once per player. This moves
the expensive native animation construction and rasterization to the existing worker pool while
substantially reducing first-render main-thread work. Large JSON strings are cloned at most once per
assigned worker rather than once per player. The default main-thread and worker caches remain
bounded, and custom loaders can still be supplied for isolation, tests, or different cache policies.
