import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "dist");
const config = JSON.parse(fs.readFileSync(path.resolve("site.config.json"), "utf8"));
const htmlFiles = [];

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else if (entry.name.endsWith(".html")) htmlFiles.push(target);
  }
}

function matches(html, expression) {
  return Array.from(html.matchAll(expression));
}

function text(value) {
  return value.replace(/<[^>]*>/gu, " ").replace(/\s+/gu, " ").trim();
}

function resolveInternal(href, file) {
  const withoutHash = href.split("#")[0].split("?")[0];
  if (!withoutHash || /^(?:mailto:|tel:|https?:)/iu.test(withoutHash)) return null;
  const base = config.mode === "prelaunch" ? (config.previewBasePath || "") : "";
  let relative = withoutHash;
  const rootRelative = relative.startsWith("/");
  if (base && relative === `${base}/`) relative = "/";
  else if (base && relative.startsWith(`${base}/`)) relative = relative.slice(base.length);
  if (relative.startsWith("/")) relative = relative.slice(1);
  const resolved = relative
    ? path.resolve(root, relative.endsWith("/") ? path.join(relative, "index.html") : relative)
    : (rootRelative ? path.resolve(root, "index.html") : path.resolve(path.dirname(file), "index.html"));
  return resolved;
}

if (!fs.existsSync(root)) throw new Error("dist is missing; run npm run build first");
visit(root);
const failures = [];
const titles = new Map();
const descriptions = new Map();

for (const file of htmlFiles) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const html = fs.readFileSync(file, "utf8");
  const h1 = matches(html, /<h1\b[^>]*>([\s\S]*?)<\/h1>/giu);
  const title = html.match(/<title>([\s\S]*?)<\/title>/iu)?.[1]?.trim();
  const description = html.match(/<meta\s+name="description"\s+content="([^"]+)"/iu)?.[1]?.trim();
  const robots = html.match(/<meta\s+name="robots"\s+content="([^"]+)"/iu)?.[1] || "";
  const canonicals = matches(html, /<link\s+rel="canonical"\s+href="([^"]+)"/giu);
  const jsonLd = matches(html, /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/giu);

  if (h1.length !== 1) failures.push(`${relative}: expected exactly one H1, got ${h1.length}`);
  if (!title || text(title).length < 20 || text(title).length > 90) failures.push(`${relative}: title length is outside 20–90`);
  if (!description || text(description).length < 70 || text(description).length > 220) failures.push(`${relative}: description length is outside 70–220`);
  if (!jsonLd.length) failures.push(`${relative}: JSON-LD is missing`);
  for (const block of jsonLd) {
    try { JSON.parse(block[1]); } catch { failures.push(`${relative}: invalid JSON-LD`); }
  }

  if (config.mode === "prelaunch") {
    if (robots.toLowerCase() !== "noindex,nofollow") failures.push(`${relative}: prelaunch robots must be noindex,nofollow`);
    if (canonicals.length) failures.push(`${relative}: prelaunch page must not expose a canonical`);
    if (/property="og:(?:url|image)"/iu.test(html)) failures.push(`${relative}: prelaunch page must not expose og:url or og:image`);
  } else if (relative !== "404.html" && relative !== "thanks.html") {
    if (robots.toLowerCase() !== "index,follow") failures.push(`${relative}: production robots must be index,follow`);
    if (canonicals.length !== 1) failures.push(`${relative}: production page needs one canonical`);
  }

  if (title) {
    if (titles.has(title)) failures.push(`${relative}: duplicate title also used by ${titles.get(title)}`);
    else titles.set(title, relative);
  }
  if (description) {
    if (descriptions.has(description)) failures.push(`${relative}: duplicate description also used by ${descriptions.get(description)}`);
    else descriptions.set(description, relative);
  }

  for (const link of matches(html, /<a\b[^>]*\shref="([^"]+)"/giu)) {
    const href = link[1];
    if (/index\.html(?:[#?]|$)/iu.test(href)) failures.push(`${relative}: internal link exposes index.html: ${href}`);
    const target = resolveInternal(href, file);
    if (target && !fs.existsSync(target)) failures.push(`${relative}: broken internal link ${href}`);
  }
}

const robotsText = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
if (config.mode === "prelaunch" && !/Disallow:\s*\//iu.test(robotsText)) failures.push("robots.txt: prelaunch must disallow all crawling");
if (config.mode === "prelaunch" && fs.existsSync(path.join(root, "sitemap.xml"))) failures.push("prelaunch must not publish sitemap.xml");

if (failures.length) {
  console.error(`SEO audit failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${htmlFiles.length} pages, unique metadata, valid links and ${config.mode} indexation rules.`);
