import { execSync } from "node:child_process";

const output = execSync("npm pack --dry-run --json", {
  encoding: "utf8",
});
const result = JSON.parse(output)[0];
const files = new Set(result.files.map(entry => entry.path));
const required = [
  "dist/core/index.js",
  "dist/core/index.d.ts",
  "dist/core/worker-runtime.js",
  "dist/core/rlottie-wasm.js",
  "dist/core/rlottie-wasm.wasm",
  "dist/react/index.js",
  "dist/react/index.d.ts",
  "dist/solid/index.js",
  "dist/solid/index.d.ts",
];

for (const path of required) {
  if (!files.has(path)) throw new Error(`Packed artifact is missing ${path}`);
}
for (const entry of files) {
  if (/^(?:temp|playgrounds|benchmarks|packages\/wasm\/vendor)\//u.test(entry))
    throw new Error(`Packed artifact contains forbidden path ${entry}`);
}
console.log(`Verified ${files.size} packed files`);
