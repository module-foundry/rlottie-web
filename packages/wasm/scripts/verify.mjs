import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const expected = new Map([
  ["rlottie-wasm.js", "a4a259207fc8ca728555735bf90989932f14c0df769934e6ab490c665412b013"],
  ["rlottie-wasm.wasm", "a0e014f4bac6410a5b378c58884ce54d4af7be779044c3eff0ccf2221baaeb98"],
]);
const expectedCommit = (
  await readFile(new URL("../UPSTREAM_COMMIT", import.meta.url), "utf8")
).trim();
const vendorCommit = (
  await readFile(new URL("../vendor/rlottie/.rlottie-web-commit", import.meta.url), "utf8")
).trim();
if (vendorCommit !== expectedCommit)
  throw new Error(`Vendor commit mismatch: expected ${expectedCommit}, found ${vendorCommit}`);

const verifyArtifact = async ([name, digest]) => {
  const bytes = await readFile(new URL(`../artifacts/${name}`, import.meta.url));
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== digest) throw new Error(`${name} hash mismatch: ${actual}`);
  if (name.endsWith(".wasm")) await WebAssembly.compile(bytes);
};

await Promise.all([...expected].map(verifyArtifact));
console.log("Verified vendor pin, baseline hashes, and WebAssembly structure");
