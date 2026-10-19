import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { districtInventory, renderDistrictMap } from "../src/district-map.mjs";

const listings = JSON.parse(fs.readFileSync("src/data/listings.json"));
const config = JSON.parse(fs.readFileSync("src/data/district-map.json"));

test("district counts use one available listing per district and match rendered data", () => {
  const districts = districtInventory(listings);
  assert.equal(districts.length, 14);
  const home = fs.readFileSync("dist/index.html", "utf8");
  const data = JSON.parse(home.match(/data-district-data>(.*?)<\/script>/su)[1]);
  for (const d of districts) assert.equal(data[d.key].count, d.listingIds.length, d.name);
  assert.ok(!JSON.stringify(config).includes("countInMockup"));
  assert.equal(districts.flatMap(d => d.listingIds).length, new Set(districts.flatMap(d => d.listingIds)).size);
  assert.ok(!districts.find(d => d.key === "center").listingIds.includes("dom-chistovaya-kamenolomni"));
});

test("several matching address fragments still count a two-house advertisement once", () => {
  const listing = { ...listings[0], id: "two-houses", title: "Два дома на одном участке", location: "shakhty", address: "Центр, рядом с гимназией №10" };
  assert.equal(districtInventory([listing]).find(d => d.key === "center").count, 1);
});

test("sold, unverified and demo listings disappear; empty district copy changes on rebuild", () => {
  const changed = listings.map(l => ({ ...l, status: "sold" }));
  assert.ok(districtInventory(changed).every(d => d.count === 0));
  const html = renderDistrictMap({ listings: changed, href: value => value });
  const data = JSON.parse(html.match(/data-district-data>(.*?)<\/script>/su)[1]);
  for (const d of config.districts) {
    assert.equal(data[d.key].text, d.textEmpty);
    assert.equal(data[d.key].cta, "Оставить запрос");
    assert.equal(data[d.key].countLabel, "Под запрос");
  }
  assert.ok(districtInventory(listings.map(l => ({ ...l, verified: false }))).every(d => !d.count));
  assert.ok(districtInventory(listings.map(l => ({ ...l, demo: true }))).every(d => !d.count));
});

test("ambiguous district matches stop the build with listing and district names", () => {
  const candidate = { ...listings[0], id: "ambiguous", address: "ХБК, Фрунзе", location: "shakhty" };
  assert.throws(() => districtInventory([candidate]), /ambiguous.*ХБК.*Фрунзе/u);
  assert.throws(() => districtInventory([listings[0], listings[0]]), /повтор объявления/u);
});
