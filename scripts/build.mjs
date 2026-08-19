import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  createContext,
  render404,
  renderCommercialPage,
  renderContacts,
  renderDetails,
  renderGuide,
  renderGuidesIndex,
  renderHome,
  renderLocation,
  renderLocationsIndex,
  renderPerson,
  renderPrivacy,
  renderThanks
} from "../src/templates.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
}

function safeResetDist() {
  if (path.dirname(dist) !== root || path.basename(dist) !== "dist") {
    throw new Error(`Unsafe output path: ${dist}`);
  }
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
}

function write(relativePath, content) {
  const target = path.join(dist, relativePath);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content, "utf8");
}

function writeJson(relativePath, value) {
  write(relativePath, `${JSON.stringify(value, null, 2)}\n`);
}

const site = readJson("site.config.json");
if (site.mode === "production" && !site.web3formsAccessKey) {
  throw new Error("web3formsAccessKey is required in production mode; keep PRELAUNCH until the form provider is approved and tested");
}
const locations = readJson("src/data/locations.json");
const guides = readJson("src/data/guides.json");
const pages = readJson("src/data/pages.json");
const listings = readJson("src/data/listings.json");
const projects = readJson("src/data/projects.json");
const builders = readJson("src/data/builders.json");
const team = readJson("src/data/team.json");
const ctx = createContext(site, { locations, guides, pages, listings, projects, builders, team });
const outputs = [];

function publish(relativePath, html) {
  write(relativePath, html);
  outputs.push(relativePath.replaceAll("\\", "/"));
}

safeResetDist();
fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });

publish("index.html", renderHome(ctx, guides));
for (const page of pages) publish(page.path, renderCommercialPage(ctx, page));
publish("locations/index.html", renderLocationsIndex(ctx));
for (const location of locations) publish(`locations/${location.slug}.html`, renderLocation(ctx, location));
publish("guides/index.html", renderGuidesIndex(ctx, guides));
for (const guide of guides) publish(`guides/${guide.slug}.html`, renderGuide(ctx, guide));
publish("team/maria-voronina.html", renderPerson(ctx));
publish("contacts.html", renderContacts(ctx));
publish("details.html", renderDetails(ctx));
publish("privacy.html", renderPrivacy(ctx));
publish("thanks.html", renderThanks(ctx));
publish("404.html", render404(ctx));

const runtimeConfig = {
  mode: site.mode,
  basePath: ctx.base,
  metrikaId: site.metrikaId,
  web3formsAccessKey: site.web3formsAccessKey,
  endpoint: "https://api.web3forms.com/submit",
  redirectUrl: ctx.href("thanks.html"),
  requestTimeoutMs: site.requestTimeoutMs,
  phoneHref: site.phoneHref,
  phoneLabel: site.phone,
  email: site.email
};
write("assets/js/site-config.js", `(function(){"use strict";window.DOMIAN_SITE_CONFIG=Object.freeze(${JSON.stringify(runtimeConfig)});}());\n`);

writeJson("assets/data/listings.json", listings.filter((item) => item.verified === true));
writeJson("assets/data/projects.json", projects.filter((item) => item.verified === true));
writeJson("assets/data/builders.json", builders.filter((item) => item.verified === true));
writeJson("assets/data/locations.json", locations);
writeJson("assets/data/team.json", team.filter((item) => item.verified === true));

write(".nojekyll", "");
if (site.mode === "prelaunch") {
  write("robots.txt", "User-agent: *\nDisallow: /\n");
} else {
  if (!site.productionOrigin) throw new Error("productionOrigin is required in production mode");
  const origin = site.productionOrigin.replace(/\/$/u, "");
  const urls = outputs
    .filter((file) => !["404.html", "thanks.html"].includes(file))
    .map((file) => file === "index.html" ? `${origin}/` : (file.endsWith("/index.html") ? `${origin}/${file.slice(0, -"index.html".length)}` : `${origin}/${file}`));
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  if (site.googleVerification) write(site.googleVerification.file, site.googleVerification.content);
  if (site.yandexVerification) write(site.yandexVerification.file, site.yandexVerification.content);
}

console.log(`Built ${outputs.length} HTML pages in ${path.relative(root, dist)} (${site.mode}).`);
