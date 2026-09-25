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
  renderNewbuild,
  renderNewbuilds,
  renderConstruction,
  renderConstructionProject,
  renderListing,
  renderLocation,
  renderLocationsIndex,
  renderPerson,
  renderTeam,
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
if (site.web3formsAccessKey === "test-only-placeholder") throw new Error("Test-only Web3Forms key cannot be published");
if (site.metrikaId != null && !/^\d+$/u.test(String(site.metrikaId))) throw new Error("metrikaId must be a numeric counter ID");
if (site.ga4Id != null && !/^G-[A-Z0-9]+$/u.test(site.ga4Id)) throw new Error("ga4Id must be a GA4 Measurement ID");
if (process.env.DOMIAN_BROWSER_TEST_FIXTURE === "1") {
  site.web3formsAccessKey = "test-only-placeholder";
  site.googleVerification = { meta: "test-google", file: "googlefixture.html", content: "google-site-verification: googlefixture.html" };
  site.yandexVerification = { meta: "test-yandex", file: "yandexfixture.html", content: "test-yandex" };
}
const productionUrl = new URL(site.productionOrigin);
if (productionUrl.protocol !== "https:" || productionUrl.search || productionUrl.hash || site.productionOrigin.endsWith("/")) throw new Error("productionOrigin must be an HTTPS URL without query, hash or trailing slash");
const locations = readJson("src/data/locations.json");
const locationContent = readJson("src/data/location-content.json");
const guides = readJson("src/data/guides.json");
const pages = readJson("src/data/pages.json");
const listings = readJson("src/data/listings.json");
const projects = readJson("src/data/projects.json");
const builders = readJson("src/data/builders.json");
const team = readJson("src/data/team.json");
const showcase = readJson("src/data/showcase.json");
const newbuilds = readJson("src/data/newbuilds.json");
const constructionProjects = readJson("src/data/construction-projects.json");
const ctx = createContext(site, { locations, locationContent, guides, pages, listings, projects, builders, team, showcase, newbuilds, constructionProjects });
const outputs = [];

function publish(relativePath, html) {
  write(relativePath, html);
  outputs.push(relativePath.replaceAll("\\", "/"));
}

safeResetDist();
fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
fs.copyFileSync(path.join(root, "favicon.ico"), path.join(dist, "favicon.ico"));
write("manifest.webmanifest", `${JSON.stringify({ name: site.displayName, short_name: site.brand, start_url: `${ctx.base}/`, display: "browser", background_color: "#f7f9f7", theme_color: "#29383a", icons: [{ src: `${ctx.base}/assets/icons/apple-touch-icon.png`, sizes: "180x180", type: "image/png" }] }, null, 2)}\n`);

publish("index.html", renderHome(ctx, guides));
for (const page of pages.filter((item) => item.path !== "construction.html")) publish(page.path, renderCommercialPage(ctx, page));
publish("newbuilds.html", renderNewbuilds(ctx));
for (const item of newbuilds.items) publish(`newbuilds/${item.slug}.html`, renderNewbuild(ctx, item));
publish("construction.html", renderConstruction(ctx));
for (const item of constructionProjects.items) publish(`construction/projects/${item.slug}.html`, renderConstructionProject(ctx, item));
for (const listing of listings.filter((item) => item.verified === true)) publish(`listings/${listing.id}.html`, renderListing(ctx, listing));
publish("locations/index.html", renderLocationsIndex(ctx));
for (const location of locations) publish(`locations/${location.slug}.html`, renderLocation(ctx, location));
publish("guides/index.html", renderGuidesIndex(ctx, guides));
for (const guide of guides) publish(`guides/${guide.slug}.html`, renderGuide(ctx, guide));
publish("team/index.html", renderTeam(ctx));
for (const person of team.filter((item) => item.verified === true)) publish(`team/${person.slug || person.id}.html`, renderPerson(ctx, person));
publish("contacts.html", renderContacts(ctx));
publish("details.html", renderDetails(ctx));
publish("privacy.html", renderPrivacy(ctx));
publish("thanks.html", renderThanks(ctx));
publish("404.html", render404(ctx));

const runtimeConfig = {
  basePath: ctx.base,
  analyticsTestMode: process.env.DOMIAN_BROWSER_TEST_FIXTURE === "1",
  metrikaId: site.metrikaId,
  ga4Id: site.ga4Id,
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
writeJson("assets/data/showcase.json", showcase);

write(".nojekyll", "");
{
  const origin = site.productionOrigin;
  const urls = outputs
    .filter((file) => !["404.html", "thanks.html"].includes(file))
    .map((file) => file === "index.html" ? `${origin}/` : (file.endsWith("/index.html") ? `${origin}/${file.slice(0, -"index.html".length)}` : `${origin}/${file}`));
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc></url>`).join("\n")}\n</urlset>\n`);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  for (const provider of ["google", "yandex"]) {
    const verification = site[`${provider}Verification`];
    if (!verification?.file && !verification?.content) continue;
    if (!verification?.file || !verification?.content || !new RegExp(`^${provider}[a-z0-9_-]*\\.html$`, "iu").test(verification.file)) throw new Error(`Invalid ${provider} verification file`);
    write(verification.file, verification.content);
  }
}

console.log(`Built ${outputs.length} HTML pages in ${path.relative(root, dist)}.`);
