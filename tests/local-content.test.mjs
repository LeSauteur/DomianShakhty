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
