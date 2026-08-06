# ADR 0002: Shared bounded dedicated-worker pool

Status: accepted.

Use a lazily created, globally registered pool of dedicated workers. A worker hosts several sessions
and one scheduler; players keep affinity. This keeps isolation and avoids one worker or one
animation-frame callback per player. The pool is capped at `min(max(hardwareConcurrency - 1, 1), 4)`
unless explicitly configured.
