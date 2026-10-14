import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { createContext, renderListing, renderCommercialPage } from "../src/templates.mjs";

const data = file => JSON.parse(fs.readFileSync(file, "utf8"));
const html = file => fs.readFileSync(`dist/${file}`, "utf8");
const preservation = data('tests/fixtures/content-preservation.json');
const stable = x => Array.isArray(x) ? x.map(stable) : x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, stable(x[k])])) : x;
const hash = x => createHash('sha256').update(JSON.stringify(stable(x))).digest('hex');
const listings = data("src/data/listings.json");
const site = data("site.config.json");
const construction = data("src/data/construction-projects.json");
const pages = data("src/data/pages.json");

test("existing inventory, protected people and established URLs remain unchanged", () => {
  const originalListings = listings.map(({provenance, verifiedAt, verifiedBy, ...original}) => original);
  assert.equal(hash(originalListings), preservation.listingsHash);
  for (const item of listings) assert.match(html(`listings/${item.id}.html`), /name="robots" content="index,follow"/u);
  assert.equal(hash(data('src/data/team.json')), preservation.teamHash);
  for (const [key, value] of Object.entries(preservation.protectedConfig)) assert.deepEqual(site[key], value, key);
  for (const oldPath of preservation.pagePaths) assert.ok(pages.some(item => item.path === oldPath), oldPath);
  assert.equal(hash(construction.items), preservation.constructionItemsHash);
});

test("new landing pages are reachable, factual and included in the sitemap", () => {
  const sitemap = html("sitemap.xml");
  for (const route of ["kadastrovye-raboty.html", "zhk-aleksandrovskiy-park.html"]) {
    assert.match(html(route), /name="robots" content="index,follow"/u);
    assert.ok(sitemap.includes(`<loc>${site.productionOrigin}/${route}</loc>`));
    assert.ok(html("index.html").includes(`href="/${route}"`));
  }
  assert.match(html("kadastrovye-raboty.html"), /Межевой план/u);
  assert.match(html("team/olga-chernenko.html"), /href="\/kadastrovye-raboty.html"/u);
  assert.match(html("zhk-aleksandrovskiy-park.html"), /агентство недвижимости, а не застройщик/u);
  assert.match(html("zhk-aleksandrovskiy-park.html"), /55652/u);
  assert.match(html("zhk-aleksandrovskiy-park.html"), /55653/u);
  assert.doesNotMatch(html("zhk-aleksandrovskiy-park.html"), /IV кв\.|31\.12\.2026|дома сданы|"@type":"Offer"/u);
  assert.equal(data("src/data/zhk/aleksandrovskiy-park.json").officeSells, true);
});

test("built examples cannot become available listings or offers", () => {
  assert.equal(construction.builtExamples.length, 6);
  assert.equal((html("construction.html").match(/data-built-example=/gu) || []).length, 6);
  for (const item of construction.builtExamples) {
    assert.equal(item.recordType, "built-object");
    assert.equal(item.price, null);
    assert.ok(!listings.some(listing => listing.id === item.id));
    assert.ok(fs.existsSync(item.mainImage.src));
    const page = html(`construction/projects/${item.slug}.html`);
    assert.ok(page.includes(item.location));
    assert.match(page, /не как объект в продаже в Шахтах/u);
    assert.doesNotMatch(page, /"@type":"Offer"|Горячее предложение/u);
  }
});

test("confirmation badge and Offer require both verification date and responsible person", () => {
  assert.equal(listings.filter(item => item.provenance === "market_review").length, 25);
  const ctx = createContext(site, { listings, locations: data("src/data/locations.json"), team: data("src/data/team.json") });
  for (const variant of [{ verifiedAt: null, verifiedBy: null }, { verifiedAt: "2026-10-14", verifiedBy: null }, { verifiedAt: null, verifiedBy: "Офис" }]) {
    assert.doesNotMatch(renderListing(ctx, { ...listings[0], ...variant }), /"@type":"Offer"/u);
  }
  assert.match(renderListing(ctx, { ...listings[0], verifiedAt: "2026-10-14", verifiedBy: "Офис" }), /"@type":"Offer"/u);
  assert.doesNotMatch(html("index.html"), /Подтверждённый объект|Цена и комплектация подтверждены/u);
});

test("only confirmed office details and prices are published", () => {
  const home = html("index.html");
  assert.match(home, /10:00–19:00/u);
  assert.match(home, /5 октября 2026 года/u);
  assert.match(home, /6252687869/u);
  assert.match(home, /data-src="https:\/\/yandex.ru\/maps-reviews-widget\/6252687869\?comments"/u);
  assert.doesNotMatch(home, /<iframe[^>]+\ssrc=/u);
  assert.doesNotMatch(home, /aggregateRating|openingHoursSpecification/u);
  assert.doesNotMatch(html("services.html"), /52\s000/u);
  assert.match(html("services.html"), /20\s000 ₽/u);
  assert.match(site.web3formsAccessKey, /^[a-f0-9-]{36}$/u);
  assert.match(home, /data-lead-form/u);
  assert.equal((html("sitemap.xml").match(/<loc>/gu) || []).length, 183);
});

test('missing form key retains a working direct-contact fallback', () => {
 const ctx = createContext({ ...site, web3formsAccessKey: null }, { locations: data('src/data/locations.json'), team: data('src/data/team.json') });
 const output = renderCommercialPage(ctx, pages.find(page => page.slug === 'kadastrovye-raboty'));
 assert.doesNotMatch(output, /data-lead-form/u);
 assert.match(output, /id="lead-form-section"[\s\S]*mailto:/u);
});
