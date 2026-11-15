// Serves _site/ locally, for checking the built site before publishing.
// Usage: npm run preview            -> http://localhost:8000/
//        PREVIEW_BASE=/repo npm run preview  -> http://localhost:8000/repo/
// The base prefix mimics a project site at USER.github.io/REPO/.
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "_site");
const PORT = Number(process.env.PORT || 8000);
const BASE = (process.env.PREVIEW_BASE || "").replace(/\/$/, "");
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".txt": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (BASE && pathname.startsWith(BASE)) pathname = pathname.slice(BASE.length) || "/";
  else if (BASE) {
    res.writeHead(404).end("Not found (try " + BASE + "/)");
    return;
  }
  let file = path.join(ROOT, pathname);
  try {
    if ((await stat(file)).isDirectory()) file = path.join(file, "index.html");
    const body = await readFile(file);
    res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }).end("Not found");
  }
}).listen(PORT, () => {
  console.log(`Preview at http://localhost:${PORT}${BASE}/  (Ctrl+C to stop)`);
});
