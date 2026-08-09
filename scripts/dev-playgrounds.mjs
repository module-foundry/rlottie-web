import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

const HOST = "0.0.0.0";
const ROOT = new URL("../", import.meta.url);
const VITE = fileURLToPath(new URL("node_modules/vite/bin/vite.js", ROOT));
const SERVERS = [
  { port: 3000, name: "React", path: "playgrounds/react/" },
  { port: 3001, name: "SolidJS", path: "playgrounds/solid/" },
];
const children = SERVERS.map(server => {
  console.log(`${server.name} playground: http://${HOST}:${server.port}`);

  return spawn(
    process.execPath,
    [VITE, "--host", HOST, "--port", String(server.port), "--strictPort"],
    {
      stdio: "inherit",
      cwd: fileURLToPath(new URL(server.path, ROOT)),
    },
  );
});

let stopping = false;

const stop = exitCode => {
  if (stopping) {
    return;
  }

  stopping = true;
  process.exitCode = exitCode;

  for (const child of children) {
    child.kill();
  }
};

for (const child of children) {
  child.once("error", error => {
    console.error(error);
    stop(1);
  });
  child.once("exit", code => {
    if (!stopping) {
      stop(code === null || code === 0 ? 1 : code);
    }
  });
}

process.once("SIGINT", () => {
  stop(0);
});
process.once("SIGTERM", () => {
  stop(0);
});

await Promise.all(children.map(child => once(child, "exit")));
