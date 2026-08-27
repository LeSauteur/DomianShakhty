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
  assert.deepEqual(new Set(showcase.map((item) => item.category)), new Set(["apartment-secondary", "apartment-newbuild", "new-house", "secondary-house", "builder-house", "land", "commercial", "garage-parking"]));
  for (const item of showcase) {
    for (const forbidden of ["price", "address", "area", "rooms", "floors", "landArea", "verified"]) {
      assert.equal(Object.hasOwn(item, forbidden), false, `${item.id} must not contain ${forbidden}`);
    }
    assert.equal(item.status, "Направление подбора · не объект продажи");
  }
  assert.deepEqual(JSON.parse(read("assets/data/showcase.json")), showcase);
  assert.doesNotMatch(read("index.html"), /data-showcase-card|data-showcase-filters/u);
  assert.doesNotMatch(read("index.html"), /"@type":"(?:Product|Offer)"/u);
});

test("territories use the owner-approved order everywhere", () => {
  const expected = ["Шахты", "Каменоломни", "Новошахтинск", "Аюта", "Красный Сулин"];
  const locations = JSON.parse(fs.readFileSync("src/data/locations.json", "utf8"));
  assert.deepEqual(config.serviceAreas, expected);
  assert.deepEqual(locations.map((item) => item.name), expected);
  const home = read("index.html");
  const positions = expected.map((name) => home.indexOf(`<strong>${name}</strong>`));
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
  const contacts = read("contacts.html");
  assert.match(contacts, /<picture><source type="image\/webp" srcset="[^"]+360w,[^"]+640w,[^"]+960w"/u);
  assert.match(contacts, /<img[^>]+width="640" height="800"[^>]+alt="Мария Воронина/u);
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

test("all core property directions have useful public pages and navigation entry points", () => {
  const required = [
    "apartments.html", "secondary-apartments.html", "new-build-apartments.html",
    "houses.html", "construction.html", "secondary-houses.html", "builder-houses.html",
    "lands.html", "commercial.html", "garages-parking.html"
  ];
  required.forEach((file) => assert.ok(fs.existsSync(path.join(root, file)), `${file} must exist`));
  const home = read("index.html");
  for (const label of ["Квартиры", "Дома", "Участки", "Коммерческая недвижимость", "Гаражи и парковка"]) {
    assert.match(home, new RegExp(`mobile-drawer__group[\\s\\S]*${label}`, "u"));
  }
  assert.match(home, /<h1>Недвижимость в Шахтах/u);
  assert.match(home, /Вторичный рынок и новостройки/u);
  assert.ok(home.indexOf("Квартиры") < home.indexOf("Новые готовые дома"), "apartments must be visible before the new-home feature");
});

test("homepage uses the editorial composition with verified hot offers", () => {
  const home = read("index.html");
  assert.equal((home.match(/<section\b/gu) || []).length, 9);
  assert.equal((home.match(/class="home-property-card"/gu) || []).length, 6);
  assert.match(home, /<h1>Недвижимость в Шахтах — спокойно и по делу<\/h1>/u);
  assert.match(home, /Подобрать недвижимость/u);
  assert.match(home, /Продать объект/u);
  assert.match(home, /Оценить стоимость/u);
  assert.match(home, /class="new-homes-feature"/u);
  assert.match(home, /id="hot-offers"/u);
  assert.match(home, /Горячее предложение/u);
  assert.match(home, /5[\s\u00a0]670[\s\u00a0]000 ₽/u);
  assert.match(home, /data-home-request-builder/u);
  assert.match(home, /data-lead-compact/u);
  assert.match(home, /hero-modern-city-living-mobile-600\.webp/u);
  assert.match(home, /fetchpriority="high"/u);
  assert.doesNotMatch(home, /apartment-building-(?:640|960)\.webp/u);
  const officeSection = home.match(/<section class="section owner-section home-office"[\s\S]*?<\/section>/u)?.[0] || "";
  assert.match(officeSection, /class="owner-portrait"/u);
  assert.match(officeSection, /maria-voronina-960\.webp/u);
  assert.doesNotMatch(officeSection, /assets\/images\/office\/office-interior/u);
  const order = ["property", "request", "seller", "locations", "expertise", "office", "lead"].map((name) => home.indexOf(`data-home-section="${name}"`));
  assert.ok(order.every((position) => position >= 0));
  assert.deepEqual(order, order.slice().sort((a, b) => a - b));
});

test("legacy panel facade is removed from every affected public page", () => {
  const affected = ["apartments.html", "commercial.html", "mortgage.html", "locations/index.html"];
  for (const file of affected) {
    const html = read(file);
    assert.doesNotMatch(html, /apartment-building-(?:640|960)\.webp/u, file);
    assert.match(html, /modern-apartment-house-(?:640|960)\.webp/u, file);
  }
  assert.equal(fs.existsSync(path.join(root, "assets/images/editorial/apartment-building-640.webp")), false);
  assert.equal(fs.existsSync(path.join(root, "assets/images/editorial/apartment-building-960.webp")), false);
});

test("secondary apartment imagery includes a sharp desktop source", () => {
  const html = read("secondary-apartments.html");
  assert.match(html, /secondary-apartment-interior-640\.webp 640w,[^"]+secondary-apartment-interior-960\.webp 960w,[^"]+secondary-apartment-interior-1440\.webp 1440w/u);
  assert.match(html, /<img[^>]+secondary-apartment-interior-1440\.webp[^>]+width="1440" height="1080"/u);
  for (const width of [640, 960, 1440]) {
    assert.ok(fs.existsSync(path.join(root, `assets/images/editorial/secondary-apartment-interior-${width}.webp`)));
    assert.equal(fs.existsSync(path.join(root, `assets/images/editorial/apartment-interior-${width}.webp`)), false);
  }
});

test("direction pages remain honest and their forms carry structured context", () => {
  const pages = JSON.parse(fs.readFileSync("src/data/pages.json", "utf8"));
  for (const page of pages) {
    const html = read(page.path);
    assert.doesNotMatch(html, /"@type":"(?:Product|Offer|AggregateRating|Review)"/u, page.path);
    assert.match(html, /name="goal"/u, page.path);
    assert.match(html, /name="property_type"/u, page.path);
    assert.match(html, /name="territory"/u, page.path);
    assert.match(html, /data-source-cta=/u, page.path);
    if (page.form?.goal) assert.match(html, new RegExp(`<option value="${page.form.goal}" selected>`, "u"), page.path);
    if (page.form?.propertyType) assert.match(html, new RegExp(`<option value="${page.form.propertyType}" selected>`, "u"), page.path);
  }
  for (const file of ["commercial.html", "garages-parking.html"]) {
    assert.match(read(file), /Направление подбора · не объект продажи/u);
    assert.doesNotMatch(read(file), /class="listing-card/u);
    assert.match(read(file), /class="catalog-honesty"/u);
  }
});

test("unconfirmed authorship and construction-company claims are absent", () => {
  const publicSource = `${fs.readFileSync("src/templates.mjs", "utf8")}\n${fs.readFileSync("src/data/pages.json", "utf8")}`;
  assert.doesNotMatch(publicSource, /Редактор:\s*Мария Воронина/u);
  assert.doesNotMatch(publicSource, /editor:\s*\{[^}]*Мария/u);
  assert.doesNotMatch(publicSource, /(?:мы|офис|агентство)\s+(?:сами\s+)?строим\s+дома/iu);
  for (const guide of fs.readdirSync(path.join(root, "guides")).filter((name) => name.endsWith(".html"))) {
    const html = read(`guides/${guide}`);
    assert.doesNotMatch(html, /Редактор:\s*Мария Воронина/u);
    if (guide !== "index.html") {
      assert.match(html, /Подготовлено на основе открытых источников/u);
      assert.match(html, /Информационный материал · условия рынка могут меняться/u);
    }
  }
});

test("listing schema expands types without breaking legacy values", () => {
  const schema = JSON.parse(fs.readFileSync("src/data/listing.schema.json", "utf8"));
  const types = schema.properties.type.enum;
  for (const legacy of ["new-house", "resale-house", "apartment", "land", "project"]) assert.ok(types.includes(legacy));
  for (const added of ["apartment-secondary", "apartment-newbuild", "house-new", "house-secondary", "house-builder", "commercial", "garage", "parking-space"]) assert.ok(types.includes(added));
  const listings = JSON.parse(fs.readFileSync("src/data/listings.json", "utf8"));
  assert.equal(listings.length, 1);
  assert.equal(listings[0].verified, true);
  assert.equal(listings[0].price, 5670000);
  assert.equal(listings[0].location, "kamenolomni");
  assert.ok(fs.existsSync(path.join(root, listings[0].image.src)));
  assert.deepEqual(JSON.parse(fs.readFileSync("src/data/projects.json", "utf8")), []);
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
