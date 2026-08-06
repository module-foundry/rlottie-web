import { execFileSync, spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const expectedVersion = (await readFile(resolve(packageRoot, "EMSCRIPTEN_VERSION"), "utf8")).trim();
const expectedCommit = (await readFile(resolve(packageRoot, "UPSTREAM_COMMIT"), "utf8")).trim();
const probe = spawnSync("emcc", ["--version"], {
  encoding: "utf8",
  shell: process.platform === "win32",
});
if (probe.status !== 0)
  throw new Error(`Emscripten ${expectedVersion} is required. Activate emsdk before wasm:build.`);
if (!probe.stdout.includes(expectedVersion))
  throw new Error(`Expected Emscripten ${expectedVersion}, got: ${probe.stdout}`);

const vendor = resolve(packageRoot, "vendor/rlottie");
const vendorCommit = (
  await readFile(resolve(vendor, ".rlottie-web-commit"), "utf8").catch(() => "")
).trim();
if (vendorCommit !== expectedCommit)
  throw new Error(
    `Vendor RLottie must be commit ${expectedCommit}; found ${vendorCommit || "none"}`,
  );

const buildDirectory = resolve(packageRoot, "../../build-wasm");
execFileSync("emcmake", ["cmake", "-S", packageRoot, "-B", buildDirectory, "-G", "Ninja"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
execFileSync("cmake", ["--build", buildDirectory, "--config", "Release"], {
  stdio: "inherit",
  shell: process.platform === "win32",
});
