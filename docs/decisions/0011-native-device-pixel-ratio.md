# ADR 0011: Use the full device pixel ratio by default

## Status

Accepted.

## Context

Automatic resolution follows the canvas CSS size and multiplies it by `window.devicePixelRatio`. The
previous default capped that multiplier at 2, so a 100×100 CSS-pixel canvas on a DPR 3 phone
received a 200×200 backing buffer and the browser upscaled it to 300×300 physical pixels. The
reproducible pre-change `sizing` unit scenario records that result.

Reading `window` while resolving options would break the package's SSR-safe module and adapter
contract. Large render surfaces also remain bounded independently by `maxRenderPixels`.

## Decision

- Automatic resolution uses the complete device pixel ratio by default.
- The resolved default cap is represented by the largest safe integer, so the actual ratio remains
  supplied by the browser-only resize path and no browser global is read during option resolution.
- An explicit numeric `maxPixelRatio` continues to cap the device ratio.
- Fixed `resolution` remains independent of CSS size and device pixel ratio.

## Consequences

DPR 3 devices receive a backing buffer with three physical pixels per CSS pixel unless the
`maxRenderPixels` limit applies. Compared with the former DPR 2 default, a same-sized RGBA surface
can use 2.25 times as many pixels and bytes. Consumers that prefer the earlier memory and
render-cost tradeoff can set `maxPixelRatio: 2`.
