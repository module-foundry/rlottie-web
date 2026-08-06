# ADR 0007: Parallel framework playground development

## Status

Accepted.

## Context

The React and SolidJS playground workspace packages had no runnable entry points. Manual adapter
verification required a repeatable command, fixed addresses, and the same built worker and WASM
assets that consumers receive.

## Decision

- `pnpm dev` builds the distributable package once and then starts both framework playgrounds in
  parallel.
- React uses port `3000`; SolidJS uses port `3001`. Both servers use strict ports so a conflict
  fails visibly.
- Each playground imports the public package entry points rather than internal source modules.
- Vite is a development-only server and is not part of the published package.

## Consequences

One terminal owns both server processes and propagates shutdown to them without relying on a
machine-global process runner. Library source changes require restarting `pnpm dev` to refresh
`dist`; playground-only changes continue to use Vite's development reload.
