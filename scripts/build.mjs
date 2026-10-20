import { publicCopy } from "../src/public-copy.mjs";
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { renderLegacyRedirect, validateLegacyRedirects } from "../src/legacy-redirects.mjs";
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
  renderConstructionBuilder,
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
site.assetVersion = createHash("sha256")
  .update(fs.readFileSync(path.join(root, "site.config.json")))
  .update(fs.readFileSync(path.join(root, "assets/css/site.css")))
  .update(fs.readFileSync(path.join(root, "assets/js/site.js")))
  .update(fs.readFileSync(path.join(root, "assets/js/form-handler.js")))
  .update(fs.readFileSync(path.join(root, "assets/js/listing-pump.js")))
  .digest("hex")
  .slice(0, 12);
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
const teamLife = readJson("src/data/team-life.json");
const pricing = readJson("src/data/pricing.json");
const rentalDraft = readJson("src/data/rental-draft.json");
const localZhk = readJson("src/data/zhk/aleksandrovskiy-park.json");
const localComplexes = fs.readdirSync(path.join(root, "src/data/zhk")).filter(file => file.endsWith(".json")).map(file => readJson(`src/data/zhk/${file}`));
const legacyRedirects = readJson("src/data/legacy-construction-urls.json");
const ctx = createContext(site, { locations, locationContent, guides, pages, listings, projects, builders, team, teamLife, pricing, showcase, newbuilds, constructionProjects, localComplexes, rentalDraft });
const outputs = [];

function publish(relativePath, html) {
  write(relativePath, html);
  outputs.push(relativePath.replaceAll("\\", "/"));
}

safeResetDist();
fs.cpSync(path.join(root, "assets"), path.join(dist, "assets"), { recursive: true });
fs.copyFileSync(path.join(root, "favicon.ico"), path.join(dist, "favicon.ico"));
write("manifest.webmanifest", `${JSON.stringify({ name: site.displayName, short_name: site.brand, start_url: `${ctx.base}/`, display: "browser", background_color: "#f7f9f7", theme_color: "#29383a", icons: [192, 512].map(size => ({ src: `${ctx.base}/assets/icons/icon-${size}.png`, sizes: `${size}x${size}`, type: "image/png" })) }, null, 2)}\n`);

publish("index.html", renderHome(ctx, guides));
for (const page of pages.filter((item) => item.path !== "construction.html" && (item.slug !== "zhk-aleksandrovskiy-park" || localZhk.publish === true))) publish(page.path, renderCommercialPage(ctx, page));
for (const complex of localComplexes.filter(item => item.publish === true && item.officeSells === true && item.page)) publish(complex.page.path, renderCommercialPage(ctx, complex.page));
if (rentalDraft.publish === true && rentalDraft.officeRents === true) publish(rentalDraft.page.path, renderCommercialPage(ctx, rentalDraft.page));
publish("newbuilds.html", renderNewbuilds(ctx));
for (const item of newbuilds.items) publish(`newbuilds/${item.slug}.html`, renderNewbuild(ctx, item));
publish("construction.html", renderConstruction(ctx));
publish("construction/builders/postroim-dom.html", renderConstructionBuilder(ctx));
for (const item of [...constructionProjects.items, ...(constructionProjects.builtExamples || [])]) publish(`construction/projects/${item.slug}.html`, renderConstructionProject(ctx, item));
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

// Recreate historical addresses after every clean build, outside the sitemap.
// Only canonical generated pages may be targets, so chains and loops are rejected.
const redirectEntries = validateLegacyRedirects(legacyRedirects.entries, outputs, [
  ...constructionProjects.items,
  ...(constructionProjects.builtExamples || [])
]);
for (const entry of redirectEntries.values()) write(entry.from, renderLegacyRedirect(ctx, entry));

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

writeJson("assets/data/listings.json", listings.filter((item) => item.verified === true).map(item => ({ ...item, description: publicCopy(item.description), features: (item.features || []).map(publicCopy) })));
writeJson("assets/data/projects.json", projects.filter((item) => item.verified === true).map(item => ({ ...item, description: publicCopy(item.description) })));
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
  write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${url}</loc><lastmod>${site.contentUpdatedAt || site.updatedAt}</lastmod></url>`).join("\n")}\n</urlset>\n`);
  write("robots.txt", `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);
  for (const provider of ["google", "yandex"]) {
    const verification = site[`${provider}Verification`];
    if (!verification?.file && !verification?.content) continue;
    if (!verification?.file || !verification?.content || !new RegExp(`^${provider}[a-z0-9_-]*\\.html$`, "iu").test(verification.file)) throw new Error(`Invalid ${provider} verification file`);
    write(verification.file, verification.content);
  }
}

console.log(`Built ${outputs.length} canonical/technical HTML pages and ${redirectEntries.size} legacy redirects in ${path.relative(root, dist)}.`);
