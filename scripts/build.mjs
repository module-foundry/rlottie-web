import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { build } from "esbuild";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
await rm(dist, { force: true, recursive: true });
await mkdir(new URL("core/", dist), { recursive: true });
await mkdir(new URL("react/", dist), { recursive: true });
await mkdir(new URL("solid/", dist), { recursive: true });

const tsc = fileURLToPath(new URL("node_modules/@typescript/native/bin/tsc", root));

for (const project of [
  "packages/core/tsconfig.json",
  "packages/react/tsconfig.json",
  "packages/solid/tsconfig.json",
]) {
  execFileSync(process.execPath, [tsc, "-p", project], {
    stdio: "inherit",
    cwd: fileURLToPath(root),
  });
}

const common = {
  bundle: true,
  format: "esm",
  sourcemap: true,
  logLevel: "info",
  target: "es2022",
};

await Promise.all([
  build({
    ...common,
    platform: "browser",
    outfile: "dist/core/index.js",
    entryPoints: ["packages/core/src/index.ts"],
  }),
  build({
    ...common,
    platform: "browser",
    outfile: "dist/core/worker-runtime.js",
    entryPoints: ["packages/core/src/workers/worker-runtime.ts"],
  }),
  build({
    ...common,
    platform: "browser",
    outfile: "dist/react/index.js",
    entryPoints: ["packages/react/src/index.ts"],
    external: ["react", "@module-foundry/rlottie-web"],
  }),
  build({
    ...common,
    platform: "browser",
    outfile: "dist/solid/index.js",
    entryPoints: ["packages/solid/src/index.ts"],
    external: ["solid-js", "@module-foundry/rlottie-web"],
  }),
]);

const glue = await readFile(new URL("packages/wasm/artifacts/rlottie-wasm.js", root), "utf8");
const moduleExports = `\nexport default Module;\nexport const ready = new Promise((resolve, reject) => {\n  if (Module.RlottieWasm) { resolve(Module); return; }\n  const previous = Module.onRuntimeInitialized;\n  Module.onRuntimeInitialized = () => { previous?.(); resolve(Module); };\n  Module.onAbort = (reason) => reject(new Error(String(reason)));\n});\n`;
await writeFile(new URL("core/rlottie-wasm.js", dist), glue + moduleExports);
await writeFile(
  new URL("core/rlottie-wasm.wasm", dist),
  await readFile(new URL("packages/wasm/artifacts/rlottie-wasm.wasm", root)),
);
