import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "dist");
const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), "site.config.json"), "utf8"));
const basePath = config.mode === "prelaunch" ? (config.previewBasePath || "") : "";
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "127.0.0.1";
const mime = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".xml": "application/xml; charset=utf-8"
};

function resolveRequest(rawUrl) {
  let pathname = decodeURIComponent(new URL(rawUrl, `http://${host}:${port}`).pathname);
  if (basePath && pathname === basePath) pathname = "/";
  else if (basePath && pathname.startsWith(`${basePath}/`)) pathname = pathname.slice(basePath.length);
  if (pathname.endsWith("/")) pathname += "index.html";
  const target = path.resolve(root, `.${pathname}`);
  if (!target.startsWith(`${root}${path.sep}`)) return null;
  return target;
}

const server = http.createServer((request, response) => {
  let target = resolveRequest(request.url || "/");
  let status = 200;
  if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
    target = path.join(root, "404.html");
    status = 404;
  }
  response.writeHead(status, {
    "Content-Type": mime[path.extname(target).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-store"
  });
  if (request.method === "HEAD") response.end();
  else fs.createReadStream(target).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Local URL: http://${host}:${port}${basePath}/`);
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
