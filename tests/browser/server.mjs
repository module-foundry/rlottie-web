import { createReadStream, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const HTTP_NOT_FOUND = 404;
const SERVER_PORT = 4173;
const mime = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".wasm", "application/wasm"],
]);

const statSafe = path => {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
};

createServer((request, response) => {
  const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
  const requested = pathname === "/" ? "/tests/browser/smoke.html" : pathname;
  const file = normalize(join(root, requested));

  if (!file.startsWith(root) || !statSafe(file)) {
    response.writeHead(HTTP_NOT_FOUND).end("Not found");

    return;
  }

  response.setHeader("Content-Type", mime.get(extname(file)) ?? "application/octet-stream");
  createReadStream(file).pipe(response);
}).listen(SERVER_PORT, "127.0.0.1");
