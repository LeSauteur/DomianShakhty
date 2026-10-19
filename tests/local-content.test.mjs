import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createContext, renderCommercialPage } from "../src/templates.mjs";

const read = file => fs.readFileSync(file, "utf8");
const json = file => JSON.parse(read(file));
const site = json("site.config.json");
const pages = json("src/data/pages.json");
const complexes = fs.readdirSync("src/data/zhk").filter(file => file.endsWith(".json")).map(file => json(`src/data/zhk/${file}`));
const sitemap = read("dist/sitemap.xml");
const words = text => (text.match(/[\p{L}\p{N}]+(?:[-–][\p{L}\p{N}]+)*/gu) || []).length;
const mainText = page => page.sections.filter(section => section.kind === "editorial").flatMap(section => section.items.flatMap(item => item.paragraphs || [])).join(" ");

test("local hub has six projects, eight distinct buildings, sourced facts and incoming links", () => {
  const hub = read("dist/novostroyki-shakhty.html");
  assert.equal((hub.match(/data-local-complex=/gu) || []).length, 6);
  assert.equal((hub.match(/data-eis-building=/gu) || []).length, 8);
  assert.deepEqual(complexes.flatMap(item => item.buildings.map(building => building.eisId)).sort(), [49133, 49134, 55652, 55653, 57386, 57397, 60159, 66209]);
  for (const item of complexes) {
    for (const fact of [...Object.values(item.facts), ...item.buildings.flatMap(building => Object.values(building.facts))]) {
      assert.ok(fact.sourceUrl?.startsWith("https://"), item.slug);
      assert.match(fact.checkedAt, /^2026-10-(14|19)$/u);
      if (fact.value === null) assert.ok(fact.reason);
    }
  }
  const page = pages.find(item => item.path === "novostroyki-shakhty.html");
  assert.ok(words(mainText(page)) >= 600);
  assert.equal(page.sections.find(section => section.kind === "faq").items.length, 6);
  assert.match(hub, /data-source-cta="newbuilds_shakhty"/u);
  assert.ok(sitemap.includes("/novostroyki-shakhty.html</loc>"));
  for (const route of ["index.html", "apartments.html", "newbuilds.html", "zhk-aleksandrovskiy-park.html", "locations/kamenolomni.html"]) assert.ok(read(`dist/${route}`).includes('href="/novostroyki-shakhty.html"'), route);
  assert.match(read("dist/newbuilds.html"), /<h1>Новостройки Ростова и Ростовской области<\/h1>/u);
});

test("unconfirmed complex pages remain absent from clean output and can be reviewed from data", () => {
  const ctx = createContext(site, { localComplexes: complexes, locations: json("src/data/locations.json"), team: json("src/data/team.json"), listings: json("src/data/listings.json") });
  const drafts = complexes.filter(item => item.slug !== "aleksandrovskiy-park");
  assert.equal(drafts.length, 5);
  for (const item of drafts) {
    assert.equal(item.publish, false);
    assert.equal(item.officeSells, null);
    assert.ok(item.page);
    assert.ok(!fs.existsSync(`dist/${item.page.path}`), item.slug);
    assert.ok(!sitemap.includes(`/${item.page.path}</loc>`));
    assert.ok(words(mainText(item.page)) >= 600, item.slug);
    const faq = item.page.sections.find(section => section.kind === "faq");
    assert.ok(faq.items.length >= 5 && faq.items.length <= 8);
    const output = renderCommercialPage(ctx, item.page);
    assert.equal((output.match(/<h1>/gu) || []).length, 1);
    assert.ok(output.includes(`href="${site.productionOrigin}/${item.page.path}"`));
    assert.ok(output.includes('href="/novostroyki-shakhty.html"'));
    assert.match(output, /data-lead-form/u);
    assert.doesNotMatch(output, /"@type":"Offer"/u);
  }
});

test("Alexander Park shows a specific listing without resolving conflicting house statuses", () => {
  const alpha = read("dist/zhk-aleksandrovskiy-park.html");
  const record = complexes.find(item => item.slug === "aleksandrovskiy-park");
  assert.equal(record.officeSells, true);
  assert.equal(record.publish, true);
  assert.ok(record.buildings.every(building => building.status === null && building.commissioningDate === null));
  assert.ok(alpha.includes('href="/listings/shk-a13-aleksandrovskiy-park.html"'));
  assert.match(alpha, /Как проходит покупка через агентство/u);
  assert.match(alpha, /Какие документы застройщика запросить/u);
  assert.match(alpha, /Что проверить при приёмке квартиры/u);
  assert.doesNotMatch(alpha, /Разрешение на ввод № 61-59-142-2026|дома сданы/u);
  assert.match(read("dist/locations/kamenolomni.html"), /Крупской 45[\s\S]*сданный дом[\s\S]*66209/u);
});

test("center landing distinguishes apartments, a nearby house and reference street orientation", () => {
  const page = pages.find(item => item.path === "kvartiry-v-centre-shakhty.html");
  const output = read(`dist/${page.path}`);
  assert.ok(words(mainText(page)) >= 600);
  assert.equal(page.sections.find(section => section.kind === "faq").items.length, 6);
  const selections = page.sections.filter(section => section.kind === "listing-selection");
  assert.deepEqual(selections[0].ids, ["shk-a05-center-renovated-1k", "shk-a12-center-designer-3k"]);
  assert.deepEqual(selections[1].ids, ["shk-h08-two-houses-center"]);
  assert.match(output, /data-source-cta="center_apartments"/u);
  assert.match(output, /Это предложение двух домов с участком, не квартира/u);
  assert.match(output, /Источник носит справочный характер/u);
  assert.ok(page.sections[0].facts.centerStreetReference.sourceUrl.startsWith("https://"));
  for (const id of selections.flatMap(section => section.ids)) assert.ok(output.includes(`/listings/${id}.html`));
  assert.ok(!output.includes("/listings/dom-chistovaya-kamenolomni.html"));
  assert.ok(sitemap.includes(`/${page.path}</loc>`));
  assert.ok(read("dist/apartments.html").includes(`href="/${page.path}"`));
  assert.ok(output.includes('href="/apartments.html"'));
});

test("expanded buyer blocks retain honest geography, sourced conditions and inventory area examples", () => {
  const homes = read("dist/houses.html");
  const lands = read("dist/lands.html");
  const location = read("dist/locations/kamenolomni.html");
  assert.match(homes, /нет домов, явно обозначенных Майским/u);
  assert.match(homes, /сквер ДК имени М\. П\. Чиха/u);
  assert.ok(!fs.existsSync("dist/doma-mayskiy-shakhty.html"));
  for (const id of ["house-gas-check", "house-financing"]) assert.ok(homes.includes(`id="${id}"`));
  const finance = homes.match(/<section[^>]+id="house-financing"[\s\S]*?<\/section>/u)?.[0];
  assert.match(finance, /sfr\.gov\.ru/u);
  assert.match(finance, /19 октября 2026/u);
  assert.doesNotMatch(finance, /\d\s*%|\d\s*млн/u);
  for (const id of ["izhs-plots", "snt-plots", "land-boundaries"]) assert.ok(lands.includes(`id="${id}"`));
  assert.ok(lands.includes('href="/listings/shk-l01-snt-plot.html"'));
  assert.ok(lands.includes('href="/kadastrovye-raboty.html"'));
  assert.match(location, /Покупка дома в Каменоломнях: два разных сценария/u);
  assert.ok(location.includes('href="/listings/shk-h07-two-houses-kamenolomni.html"'));
  const section = pages.find(item => item.slug === "apartments").sections.find(item => item.id === "apartment-rooms");
  assert.equal(section.items.length, 3);
  assert.deepEqual(section.facts.map(fact => fact.value), [{ rooms: 1, min: 32, max: 37 }, { rooms: 2, min: 42, max: 46 }, { rooms: 3, min: 58, max: 72 }]);
  for (const fact of section.facts) {
    assert.equal(fact.method, "inventory_examples_not_market_average");
    assert.ok(fact.sourceIds.length > 0);
  }
});

test("three buyer guides have original substance, editorial authorship, FAQs and dated official sources", () => {
  const slugs = ["podrabotannye-territorii-shahty", "mezhevanie-pered-pokupkoy", "proverka-doma-s-gazom"];
  const allGuides = json("src/data/guides.json");
  for (const slug of slugs) {
    const guide = allGuides.find(item => item.slug === slug);
    assert.ok(words(guide.sections.flatMap(section => section.paragraphs).join(" ")) >= 600, slug);
    assert.equal(guide.author, "Редакция офиса");
    assert.equal(guide.reviewedBy, null);
    assert.equal(guide.updatedAt, "2026-10-19");
    assert.ok(guide.faq.length >= 5 && guide.faq.length <= 8);
    assert.ok(guide.sources.length >= 2);
    for (const source of guide.sources) {
      assert.equal(source.checkedAt, "2026-10-19");
      assert.match(new URL(source.url).hostname, /^(?:www\.)?(?:gursh\.ru|rosreestr\.tatarstan\.ru|rostovoblgaz\.ru)$/u);
    }
    const output = read(`dist/guides/${slug}.html`);
    assert.match(output, /Автор: Редакция офиса/u);
    assert.match(output, /id="guide-faq"/u);
    assert.match(output, /"@type":"Article"/u);
    assert.ok(sitemap.includes(`/guides/${slug}.html</loc>`));
    for (const landing of ["houses.html", "lands.html", "kadastrovye-raboty.html"]) {
      assert.ok(read(`dist/${landing}`).includes(`href="/guides/${slug}.html"`));
      assert.ok(output.includes(`href="/${landing}"`));
    }
  }
});
