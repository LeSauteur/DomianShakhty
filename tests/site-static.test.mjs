import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { createContext, renderHome } from "../src/templates.mjs";

const root = path.resolve("dist");
const config = JSON.parse(fs.readFileSync("site.config.json", "utf8"));

function read(file) { return fs.readFileSync(path.join(root, file), "utf8"); }

test("prelaunch publishes the expected safety controls", () => {
  assert.equal(config.mode, "prelaunch");
  assert.match(read("robots.txt"), /Disallow:\s*\//u);
  assert.equal(fs.existsSync(path.join(root, "sitemap.xml")), false);
  assert.match(read("index.html"), /name="robots" content="noindex,nofollow"/u);
  assert.doesNotMatch(read("index.html"), /rel="canonical"/u);
});

test("unverified inventory and builders never enter public feeds", () => {
  for (const file of ["assets/data/listings.json", "assets/data/projects.json", "assets/data/builders.json"]) {
    const items = JSON.parse(read(file));
    assert.ok(Array.isArray(items));
    assert.ok(items.every((item) => item.verified === true));
  }
});

test("showcase stays separate from real inventory and contains no fabricated offer data", () => {
  const showcase = JSON.parse(fs.readFileSync("src/data/showcase.json", "utf8"));
  assert.ok(showcase.length >= 8 && showcase.length <= 12);
  assert.deepEqual(new Set(showcase.map((item) => item.category)), new Set(["new-house", "builder-house", "secondary-house", "apartment", "land", "house-land"]));
  for (const item of showcase) {
    for (const forbidden of ["price", "address", "area", "rooms", "floors", "landArea", "verified"]) {
      assert.equal(Object.hasOwn(item, forbidden), false, `${item.id} must not contain ${forbidden}`);
    }
    assert.match(item.status, /^(?:Витрина готовится|Актуальные варианты — по запросу)$/u);
  }
  assert.deepEqual(JSON.parse(read("assets/data/showcase.json")), showcase);
  assert.doesNotMatch(read("index.html"), /"@type":"(?:Product|Offer)"/u);
});

test("territories use the owner-approved order everywhere", () => {
  const expected = ["Шахты", "Каменоломни", "Новошахтинск", "Аюта", "Красный Сулин"];
  const locations = JSON.parse(fs.readFileSync("src/data/locations.json", "utf8"));
  assert.deepEqual(config.serviceAreas, expected);
  assert.deepEqual(locations.map((item) => item.name), expected);
  const home = read("index.html");
  const positions = expected.map((name) => home.indexOf(`<h3>${name}</h3>`));
  assert.ok(positions.every((position) => position >= 0));
  assert.deepEqual(positions, positions.slice().sort((a, b) => a - b));
});

test("runtime config contains no configured outbound services", () => {
  const source = read("assets/js/site-config.js");
  assert.match(source, /"metrikaId":null/u);
  assert.match(source, /"web3formsAccessKey":null/u);
});

test("confirmed social channels and Maria's responsive portrait are published from central data", () => {
  assert.deepEqual(config.socials, {
    whatsapp: "https://wa.me/message/YL42DCFCGMPQH1",
    telegram: "https://t.me/MariyaVoronina87",
    max: "https://max.ru/u/f9LHodD0cOIKT6pyYpEr_SpFY0ZcDT9BWF4LEwhkoft3td7dLbNOySNW-RA",
    instagram: "https://www.instagram.com/domian_shakhty_mayakovskogo?utm_source=qr&igsi=dTFsYmg4Nm15Y3F0"
  });
  const home = read("index.html");
  for (const [channel, href] of Object.entries(config.socials)) {
    const htmlHref = href.replaceAll("&", "&amp;");
    assert.match(home, new RegExp(`href="${htmlHref.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}"[^>]+data-analytics="${channel}_click"`, "u"));
  }
  assert.match(home, /<picture><source type="image\/webp" srcset="[^"]+360w,[^"]+640w,[^"]+960w"/u);
  assert.match(home, /<img[^>]+width="640" height="800"[^>]+alt="Мария Воронина/u);
  for (const width of [360, 640, 960]) {
    assert.ok(fs.existsSync(path.join(root, `assets/images/maria-voronina-${width}.webp`)));
  }
  assert.ok(fs.existsSync(path.join(root, "assets/images/maria-voronina-original.png")));
  assert.doesNotMatch(home, /qr[-_ ]?code|mariyavoronina87/u);
});

test("legal details are confined to the details page", () => {
  const bankAccount = config.bank.account;
  const pages = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.name.endsWith(".html")) pages.push(target);
    }
  }
  visit(root);
  const containing = pages.filter((file) => fs.readFileSync(file, "utf8").includes(bankAccount));
  assert.deepEqual(containing.map((file) => path.relative(root, file).replaceAll("\\", "/")), ["details.html"]);
});

test("every generated page has exactly one h1", () => {
  const pages = [];
  function visit(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) visit(target);
      else if (entry.name.endsWith(".html")) pages.push(target);
    }
  }
  visit(root);
  for (const file of pages) {
    assert.equal((fs.readFileSync(file, "utf8").match(/<h1\b/giu) || []).length, 1, path.relative(root, file));
  }
});

test("production rendering drops the Pages base and adds canonical entity metadata", () => {
  const readJson = (file) => JSON.parse(fs.readFileSync(file, "utf8"));
  const productionSite = {
    ...config,
    mode: "production",
    productionOrigin: "https://domian-shakhty.example",
    web3formsAccessKey: "test-only-placeholder"
  };
  const data = {
    locations: readJson("src/data/locations.json"),
    guides: readJson("src/data/guides.json"),
    pages: readJson("src/data/pages.json"),
    listings: readJson("src/data/listings.json"),
    projects: readJson("src/data/projects.json"),
    builders: readJson("src/data/builders.json"),
    team: readJson("src/data/team.json"),
    showcase: readJson("src/data/showcase.json")
  };
  const html = renderHome(createContext(productionSite, data), data.guides);
  assert.match(html, /name="robots" content="index,follow"/u);
  assert.match(html, /rel="canonical" href="https:\/\/domian-shakhty\.example\/"/u);
  assert.match(html, /property="og:image" content="https:\/\/domian-shakhty\.example\/assets\/images\/og\.png"/u);
  assert.match(html, /"@id":"https:\/\/domian-shakhty\.example\/#organization"/u);
  assert.doesNotMatch(html, /\/DomianShakhty\//u);
  assert.doesNotMatch(html, /сайт закрыт от индексации/u);
});
