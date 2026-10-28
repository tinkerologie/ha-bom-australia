/**
 * Static server for the browser tests: the committed bundle at /bom_australia/
 * (as Home Assistant serves it) and the harness page at /.
 */
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const here = fileURLToPath(new URL(".", import.meta.url));
const bundle = join(here, "..", "..", "..", "custom_components", "bom_australia", "frontend");
const port = Number(process.env.PORT ?? 4179);
const TYPES = { ".js": "text/javascript", ".html": "text/html", ".json": "application/json", ".css": "text/css" };

function resolve(url) {
  const path = decodeURIComponent(new URL(url, "http://x").pathname);
  if (path === "/") return join(here, "harness.html");
  const [root, rest] = path.startsWith("/bom_australia/")
    ? [bundle, path.slice("/bom_australia/".length)]
    : [here, path.slice(1)];
  const file = normalize(join(root, rest));
  return file.startsWith(root) ? file : undefined;
}

createServer((req, res) => {
  const file = resolve(req.url ?? "/");
  if (!file || !existsSync(file) || !statSync(file).isFile()) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { "content-type": TYPES[extname(file)] ?? "application/octet-stream", "cache-control": "no-store" });
  createReadStream(file).pipe(res);
}).listen(port, "127.0.0.1", () => console.log(`browser test server on http://127.0.0.1:${port}`));
