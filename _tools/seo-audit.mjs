import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = path.resolve(process.cwd(), "dist");
const config = JSON.parse(fs.readFileSync(path.resolve("site.config.json"), "utf8"));
const base = new URL(config.productionOrigin).pathname.replace(/\/$/u, "");
const htmlFiles = [];
const verificationFiles = new Set([config.googleVerification?.file, config.yandexVerification?.file].filter(Boolean));

function visit(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) visit(target);
    else if (entry.name.endsWith(".html") && !verificationFiles.has(path.relative(root, target).replaceAll("\\", "/"))) htmlFiles.push(target);
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

function resolveAsset(src) {
  const withoutHash = src.split("#")[0].split("?")[0];
  if (!withoutHash || /^(?:data:|https?:)/iu.test(withoutHash)) return null;
  let relative = withoutHash;
  if (base && relative.startsWith(`${base}/`)) relative = relative.slice(base.length);
  relative = relative.replace(/^\/+/, "");
  return path.resolve(root, relative);
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

  const technical = ["404.html", "thanks.html"].includes(relative);
  const route = relative === "index.html" ? "/" : relative.endsWith("/index.html") ? `/${relative.slice(0, -"index.html".length)}` : `/${relative}`;
  const canonical = `${config.productionOrigin}${route}`;
  if (robots.toLowerCase() !== (technical ? "noindex,follow" : "index,follow")) failures.push(`${relative}: incorrect robots directive`);
  if (canonicals.length !== 1 || canonicals[0][1] !== canonical) failures.push(`${relative}: incorrect canonical`);
  if (!html.includes(`<meta property="og:url" content="${canonical}">`)) failures.push(`${relative}: incorrect og:url`);
  if (!html.includes(`<meta property="og:image" content="${config.productionOrigin}/assets/images/og.png">`)) failures.push(`${relative}: incorrect og:image`);
  if (/prelaunch|demo|data:,/iu.test(html)) failures.push(`${relative}: launch placeholder in HTML`);
  if (!html.includes(`${base}/favicon.ico`) || !html.includes(`${base}/manifest.webmanifest`)) failures.push(`${relative}: site icons missing`);

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


  for (const image of matches(html, /<img\b([^>]*)\ssrc="([^"]+)"([^>]*)>/giu)) {
    const attributes = `${image[1]} ${image[3]}`;
    const target = resolveAsset(image[2]);
    if (target && !fs.existsSync(target)) failures.push(`${relative}: missing image ${image[2]}`);
    if (!/\bwidth="\d+"/iu.test(attributes) || !/\bheight="\d+"/iu.test(attributes)) failures.push(`${relative}: image lacks width/height ${image[2]}`);
    if (!/\balt="[^"]+"/iu.test(attributes)) failures.push(`${relative}: image lacks meaningful alt ${image[2]}`);
  }

  for (const source of matches(html, /<source\b[^>]*\ssrcset="([^"]+)"/giu)) {
    for (const candidate of source[1].split(",")) {
      const src = candidate.trim().split(/\s+/u)[0];
      const target = resolveAsset(src);
      if (target && !fs.existsSync(target)) failures.push(`${relative}: missing responsive image ${src}`);
    }
  }
}

const robotsText = fs.readFileSync(path.join(root, "robots.txt"), "utf8");
if (/Disallow:\s*\//iu.test(robotsText) || !robotsText.includes(`Sitemap: ${config.productionOrigin}/sitemap.xml`)) failures.push("robots.txt: invalid production directives");
for (const file of [".nojekyll", "sitemap.xml", "favicon.ico", "manifest.webmanifest", "assets/icons/favicon.svg", "assets/icons/apple-touch-icon.png", "assets/images/og.png", "assets/js/site-config.js", "assets/js/site.js", "assets/js/form-handler.js", "404.html"]) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`missing production file: ${file}`);
}
const sitemap = fs.existsSync(path.join(root, "sitemap.xml")) ? fs.readFileSync(path.join(root, "sitemap.xml"), "utf8") : "";
const actualUrls = matches(sitemap, /<loc>([^<]+)<\/loc>/giu).map((match) => match[1]);
const expectedUrls = htmlFiles.map((file) => path.relative(root, file).replaceAll("\\", "/"))
  .filter((relative) => !["404.html", "thanks.html"].includes(relative))
  .map((relative) => `${config.productionOrigin}${relative === "index.html" ? "/" : relative.endsWith("/index.html") ? `/${relative.slice(0, -"index.html".length)}` : `/${relative}`}`);
if (actualUrls.length !== expectedUrls.length || new Set(actualUrls).size !== expectedUrls.length || expectedUrls.some((url) => !actualUrls.includes(url))) failures.push("sitemap.xml: routes do not match indexable pages");
for (const provider of ["google", "yandex"]) {
  const verification = config[`${provider}Verification`];
  if (verification?.file && (!fs.existsSync(path.join(root, verification.file)) || fs.readFileSync(path.join(root, verification.file), "utf8") !== verification.content)) failures.push(`${provider} verification file missing or changed`);
}

if (failures.length) {
  console.error(`SEO audit failed (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exit(1);
}

console.log(`SEO audit passed: ${htmlFiles.length} pages, unique metadata, valid links/media and production indexation rules.`);
