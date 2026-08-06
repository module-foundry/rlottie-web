# Publishing

Releases use the root package version as the single source of truth. CI installs with a frozen
lockfile, runs `pnpm verify`, verifies the packed file list, and publishes with npm trusted
publishing/provenance. The tarball contains `dist`, README, licenses, and notices; it excludes
vendor sources, playgrounds, benchmarks, and temporary Emscripten output.
