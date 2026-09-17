import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const repo = path.resolve(".");
const dist = path.join(repo, "dist");
const readJson = (file) => JSON.parse(fs.readFileSync(path.join(repo, file), "utf8"));
const readDist = (file) => fs.readFileSync(path.join(dist, file), "utf8");
const newbuilds = readJson("src/data/newbuilds.json");
const construction = readJson("src/data/construction-projects.json");
const manifest = readJson("src/data/catalog-import-manifest.json");

function mediaFor(items, keys) {
  return items.flatMap((item) => keys.flatMap((key) => {
    const value = item[key];
    return Array.isArray(value) ? value : value ? [value] : [];
  }));
}

function countBy(items, selector) {
  return items.reduce((counts, item) => {
    const key = selector(item);
    counts[key] = (counts[key] || 0) + 1;
    return counts;
  }, {});
}

test("import manifest and catalog counts remain exact", () => {
  assert.equal(newbuilds.items.length, 78);
  assert.equal(construction.items.length, 26);
  assert.equal(manifest.newbuilds.sourceCount, 78);
  assert.equal(manifest.newbuilds.importedCount, 78);
  assert.equal(manifest.construction.sourceCount, 26);
  assert.equal(manifest.construction.importedCount, 26);
  assert.equal(new Set(newbuilds.items.map((item) => item.slug)).size, 78);
  assert.equal(new Set(construction.items.map((item) => item.slug)).size, 26);
});

test("newbuild truthfulness states and prices are preserved", () => {
  const completeness = countBy(newbuilds.items, (item) => item.completeness.state);
  assert.deepEqual(completeness, { complete: 20, needs_review: 53, partial: 5 });
  assert.equal(newbuilds.items.filter((item) => item.price.verified === true).length, 14);
  assert.equal(newbuilds.items.filter((item) => item.price.verified === false).length, 64);
  for (const item of newbuilds.items) {
    if (!item.price.verified) {
      assert.equal(item.price.type, "on_request", item.slug);
      assert.equal(item.price.value, null, item.slug);
    }
    assert.ok(item.city || item.completeness.state === "needs_review", `${item.slug}: missing geography must remain visible as incomplete`);
  }
});

test("construction projects remain separate from secondary inventory", () => {
  const statuses = countBy(construction.items, (item) => item.priceStatus);
  assert.deepEqual(statuses, { request: 3, "dated-confirmed": 4, "partner-outdated": 15, individual: 4 });
  assert.deepEqual(countBy(construction.items, (item) => item.builder), {
    "ДоманСтрой": 7,
    "Союз Застройщиков": 15,
    "Эквита": 4
  });
  const serialized = JSON.stringify({ newbuilds, construction });
  for (const forbidden of ["output/apartments", "output/houses/house_", "secondary-apartment", "secondary-house", "owner-listing"]) {
    assert.doesNotMatch(serialized, new RegExp(forbidden, "u"));
  }
  const existingListings = readJson("src/data/listings.json");
  assert.deepEqual(existingListings.map(({ id, price, verified }) => ({ id, price, verified })), [{ id: "dom-chistovaya-kamenolomni", price: 5670000, verified: true }]);
});

test("all imported responsive media is local WebP and exists", () => {
  const media = [
    ...mediaFor(newbuilds.items, ["cover", "images", "floorplans"]),
    ...mediaFor(construction.items, ["mainImage", "gallery", "floorPlans"])
  ];
  assert.ok(media.length >= 208);
  for (const image of media) {
    assert.match(image.src, /^assets\/images\/(?:newbuilds|construction-projects)\/.+\.webp$/u);
    assert.ok(fs.existsSync(path.join(repo, image.src)), image.src);
    assert.ok(Number(image.width) > 0 && Number(image.height) > 0, image.src);
    for (const variant of image.srcset || []) {
      assert.match(variant.src, /\.webp$/u);
      assert.ok(fs.existsSync(path.join(repo, variant.src)), variant.src);
      assert.ok(Number(variant.width) > 0, variant.src);
    }
  }
  const generatedFiles = ["assets/images/newbuilds", "assets/images/construction-projects"]
    .flatMap((directory) => fs.readdirSync(path.join(repo, directory), { recursive: true }).filter((file) => file.endsWith(".webp")));
  assert.equal(generatedFiles.length, manifest.media.generatedResponsiveWebpFiles);
  assert.equal(generatedFiles.length, 459);
  assert.ok(generatedFiles.every((file) => !file.endsWith("-480.webp")));
});

test("catalog and detail pages are generated with production SEO", () => {
  assert.equal((readDist("newbuilds.html").match(/data-product-card/gu) || []).length, 78);
  assert.equal((readDist("construction.html").match(/data-product-card/gu) || []).length, 26);
  for (const item of newbuilds.items) {
    const file = `newbuilds/${item.slug}.html`;
    assert.ok(fs.existsSync(path.join(dist, file)), file);
    const html = readDist(file);
    assert.match(html, /name="robots" content="index,follow"/u);
    assert.match(html, /rel="canonical" href="https:\/\/xn--80aakqtid1b0a2a0b\.xn--p1ai\/newbuilds\//u);
    assert.match(html, /"@type":"Service"/u);
    assert.doesNotMatch(html, /"@type":"(?:Product|Offer)"/u);
  }
  for (const item of construction.items) {
    const file = `construction/projects/${item.slug}.html`;
    assert.ok(fs.existsSync(path.join(dist, file)), file);
    const html = readDist(file);
    assert.match(html, /name="robots" content="index,follow"/u);
    assert.match(html, /rel="canonical" href="https:\/\/xn--80aakqtid1b0a2a0b\.xn--p1ai\/construction\/projects\//u);
    assert.match(html, /"@type":"Service"/u);
    assert.doesNotMatch(html, /"@type":"(?:Product|Offer)"/u);
  }
});

test("homepage features only complete newbuilds and never promotes archived construction prices", () => {
  const home = readDist("index.html");
  const newbuildSlugs = [...home.matchAll(/data-home-newbuild="([^"]+)"/gu)].map((match) => match[1]);
  const constructionSlugs = [...home.matchAll(/data-home-construction="([^"]+)"/gu)].map((match) => match[1]);
  assert.equal(newbuildSlugs.length, 6);
  assert.equal(constructionSlugs.length, 6);
  for (const slug of newbuildSlugs) {
    const item = newbuilds.items.find((candidate) => candidate.slug === slug);
    assert.equal(item?.completeness.state, "complete", slug);
    assert.match(home, new RegExp(`href="/newbuilds/${slug}\\.html"`, "u"));
  }
  const constructionSection = home.match(/data-home-section="construction"[\s\S]*?<\/section>/u)?.[0] || "";
  assert.doesNotMatch(constructionSection, /Архивный ориентир|2023/u);
  for (const slug of constructionSlugs) {
    assert.match(home, new RegExp(`href="/construction/projects/${slug}\\.html"`, "u"));
    const item = construction.items.find((candidate) => candidate.slug === slug);
    if (item?.priceStatus !== "dated-confirmed") {
      const card = constructionSection.match(new RegExp(`data-home-construction="${slug}"[\\s\\S]*?<\\/article>`, "u"))?.[0] || "";
      assert.match(card, /Стоимость по расчёту/u, slug);
      if (Number.isFinite(item?.price)) assert.doesNotMatch(card, new RegExp(String(item.price), "u"), slug);
    }
  }
  assert.match(home, /Смотреть все 78 новостроек/u);
  assert.match(home, /Все 26 проектов/u);
});
