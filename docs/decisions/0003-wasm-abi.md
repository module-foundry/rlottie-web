# ADR 0003: Baseline Embind migration and stable engine adapter

Status: accepted for the vertical slice.

The supplied baseline exports `RlottieWasm.load`, `frames`, `render`, and dynamic-property methods.
It does not expose intrinsic metadata, so the adapter validates and reads `w`, `h`, `fr`, `ip`, and
`op` from JSON before creating the native handle. Only the worker engine adapter sees Embind. A
future reproducible C ABI adds metadata and stable native error codes without changing the public
player API.

The reproducible path pins Samsung RLottie commit `2365f5671b67791fc179818fd11b180d79aec612` and
Emscripten `6.0.5`. CMake disables threads, filesystem-dependent features, examples, tests, and
cache, and enables LTO/memory growth.

Baseline SHA-256:

- `rlottie-wasm.js`: `a4a259207fc8ca728555735bf90989932f14c0df769934e6ab490c665412b013`
- `rlottie-wasm.wasm`: `a0e014f4bac6410a5b378c58884ce54d4af7be779044c3eff0ccf2221baaeb98`
