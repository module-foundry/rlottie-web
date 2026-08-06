# ADR 0006: Maintainable source architecture

## Status

Accepted.

## Context

The first implementation concentrated player orchestration, environment ownership, canvas
presentation, worker scheduling, native bindings, and source parsing in a few large modules. The
lint command also accepted warnings, so complexity and magic-number findings did not fail CI.

## Decision

- Internal source imports use the `#core/*`, `#react/*`, and `#solid/*` package aliases.
- Types live in a central `types` module and numeric source discriminants are public enums.
- Constants live in a central constants module and precede executable declarations.
- Every class has its own file. Orchestrators delegate environment, presentation, native, and worker
  responsibilities to focused collaborators.
- Free functions are arrow expressions.
- ESLint warnings fail the build. Source complexity, magic numbers, imports, logical spacing, and
  hook ordering are enforced rather than documented as preferences.

## Consequences

The package gains more small modules, but ownership boundaries and cleanup paths become explicit.
Changing a source parser, renderer, hook, or worker component no longer requires editing a single
monolithic file.
