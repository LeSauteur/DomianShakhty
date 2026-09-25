import { expect, test } from "@playwright/test";

const localOrigin = `http://127.0.0.1:${process.env.PLAYWRIGHT_PORT || 43173}`;

const representativePages = [
  "",
  "construction.html",
  "construction/projects/dom-pod-klyuch-80m2-tri-spalni.html",
  "apartments.html",
  "newbuilds.html",
  "newbuilds/dvizhenie-61.html",
  "newbuilds/manhetten-2-0-novaya-vysota.html",
  "new-build-apartments.html",
  "commercial.html",
  "garages-parking.html",
  "locations/shakhty.html",
  "locations/kamenolomni.html",
  "locations/novoshakhtinsk.html",
  "locations/ayutinskiy.html",
  "locations/krasnyy-sulin.html",
  "listings/dom-chistovaya-kamenolomni.html",
  "listings/shk-a02-budget-1k.html",
  "listings/shk-a03-hbk-1k.html",
  "listings/shk-a13-aleksandrovskiy-park.html",
  "listings/shk-h03-artem-brick-house.html",
  "listings/shk-l06-regular-city-plot.html",
  "guides/kak-vybrat-dom-ot-zastroyshchika-v-shakhtah.html",
  "team/index.html",
  "team/maria-voronina.html",
  "team/olga-chernenko.html",
  "contacts.html",
  "details.html",
  "privacy.html"
];

for (const pathname of representativePages) {
  test(`${pathname || "home"} renders without client errors`, async ({ page }) => {
    const errors = [];
    const failed = [];
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("requestfailed", (request) => failed.push(`${request.method()} ${request.url()}`));
    const response = await page.goto(pathname, { waitUntil: "load" });
    expect(response?.status()).toBe(200);
    await expect(page.locator("h1")).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index,follow");
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
}

test("new listing hero images load without overflow on desktop and mobile", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const id of ["shk-a02-budget-1k", "shk-a03-hbk-1k", "shk-h03-artem-brick-house", "shk-l06-regular-city-plot"]) {
      await page.goto(`listings/${id}.html`);
      const hero = page.locator(".listing-detail__media img");
      await expect(hero).toBeVisible();
      const state = await hero.evaluate((node) => ({ src: node.currentSrc, width: node.naturalWidth }));
      expect(state.src).toMatch(/\.webp$/u);
      expect(state.width).toBeGreaterThan(0);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll, `${id} at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.client + 1);
    }
  }
});

test("valuation hero text and actions stay inside narrow mobile viewports", async ({ page }) => {
  for (const viewport of [{ width: 320, height: 720 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    await page.goto("valuation.html");
    const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
    for (const selector of [".page-hero h1", ".page-hero .hero-actions", ".page-hero .hero-actions .button"]) {
      for (const box of await page.locator(selector).evaluateAll((nodes) => nodes.map((node) => {
        const rect = node.getBoundingClientRect();
        return { left: rect.left, right: rect.right };
      }))) {
        expect(box.left, `${selector} left at ${viewport.width}px`).toBeGreaterThanOrEqual(0);
        expect(box.right, `${selector} right at ${viewport.width}px`).toBeLessThanOrEqual(clientWidth + 1);
      }
    }
  }
});

test("mobile drawer opens, traps focus and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  const toggle = page.locator("[data-menu-toggle]");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-drawer")).toHaveClass(/is-open/u);
  const propertyGroup = page.locator(".mobile-drawer__group").first();
  await expect(propertyGroup).toContainText("Коммерция");
  await expect(propertyGroup).toContainText("Гаражи и парковка");
  await page.locator(".mobile-drawer__panel a").last().focus();
  await page.keyboard.press("Tab");
  await expect(page.locator(".mobile-drawer__panel a").first()).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("desktop navigation menu exposes aria state, closes with Escape and restores focus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("");
  const menu = page.locator(".category-nav [data-nav-menu]").first();
  const summary = menu.locator("summary");
  await summary.click();
  await expect(menu).toHaveAttribute("open", "");
  await expect(summary).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(menu).not.toHaveAttribute("open", "");
  await expect(summary).toHaveAttribute("aria-expanded", "false");
  await expect(summary).toBeFocused();
});

test("location search persists filters, restores history and carries territory into the form", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("locations/kamenolomni.html");
  await expect(page.locator("[data-local-count]")).toHaveText("1");
  await expect(page.locator('[data-search-scope="local"]')).toBeVisible();
  await page.locator('[data-location-type="apartments"]').click();
  await expect(page).toHaveURL(/type=apartments/u);
  await expect(page.locator("[data-local-count]")).toHaveText("0");
  await page.locator('[data-location-type="houses"]').click();
  await expect(page).toHaveURL(/type=houses/u);
  await expect(page.locator("[data-local-count]")).toHaveText("1");
  await page.goBack();
  await expect(page.locator("[data-local-count]")).toHaveText("0");
  await expect(page.locator('select[name="type"]')).toHaveValue("apartments");
  await page.locator('input[name="priceMin"]').fill("7000000");
  await page.locator('input[name="priceMax"]').fill("5000000");
  await page.locator("[data-location-search-form]").evaluate((form) => form.requestSubmit());
  await expect(page.locator("[data-location-search-status]")).toContainText("не может быть больше");
  await page.locator('input[name="priceMin"]').fill("");
  await page.locator('input[name="priceMax"]').fill("");
  await page.locator('select[name="location"]').selectOption("ayutinskiy");
  await expect(page).toHaveURL(/locations\/ayutinskiy\.html\?type=apartments/u);
  await expect(page.locator("h1")).toHaveText("Недвижимость в Аюте");
  await expect(page.locator('form[data-lead-form] select[name="territory"]')).toHaveValue("Аюта");
  await expect(page.locator('form[data-lead-form] textarea[name="message"]')).toHaveValue(/Территория: Аюта/u);
});

test("location lead context survives reload, follows filters and preserves a manual comment", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("locations/ayutinskiy.html");
  const searchForm = page.locator("[data-location-search-form]");
  const leadForm = page.locator("form[data-lead-form]");
  const comment = leadForm.locator('textarea[name="message"]');

  await page.locator('[data-location-type="houses"]').click();
  await page.reload();
  await page.locator('[data-location-type="apartments"]').click();
  await expect(page).toHaveURL(/type=apartments/u);
  await expect(leadForm.locator('select[name="property_type"]')).toHaveValue("apartment");
  await expect(comment).toHaveValue("Критерии подбора: Территория: Аюта; Тип: квартиры.");

  await page.reload();
  await searchForm.locator('input[name="priceMax"]').fill("5000000");
  await searchForm.evaluate((form) => form.requestSubmit());
  await expect(comment).toHaveValue(/Тип: квартиры; Цена до: 5 000 000 ₽\.$/u);

  await searchForm.locator('button[type="reset"]').click();
  await expect(page).not.toHaveURL(/type=|priceMin=|priceMax=/u);
  await expect(comment).toHaveValue("Критерии подбора: Территория: Аюта; Тип: любая недвижимость.");

  const manualComment = "Синтетический комментарий для браузерного теста.";
  await comment.fill(manualComment);
  await page.locator('[data-location-type="houses"]').click();
  await expect(comment).toHaveValue(manualComment);
  await expect(leadForm.locator('select[name="property_type"]')).toHaveValue("house");
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("domian_lead_context") || "{}").criteria)).toContain("Тип: дома");
  await page.reload();
  await expect(comment).toHaveValue(manualComment);
});

test("navigation switches to the drawer before narrow-desktop overflow", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("");
  await expect(page.locator("[data-menu-toggle]")).toBeVisible();
  await expect(page.locator(".category-nav")).toBeHidden();
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});

test("location pages keep search controls, imagery and content usable across target widths", async ({ page }) => {
  const allPaths = ["locations/shakhty.html", "locations/kamenolomni.html", "locations/novoshakhtinsk.html", "locations/ayutinskiy.html", "locations/krasnyy-sulin.html"];
  const mobilePaths = ["locations/kamenolomni.html", "locations/ayutinskiy.html"];
  for (const viewport of [{ width: 360, height: 800 }, { width: 390, height: 844 }, { width: 1024, height: 900 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const pathname of viewport.width < 600 ? mobilePaths : allPaths) {
      await page.goto(pathname);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll, `${pathname} at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.client + 1);
      await expect(page.locator("[data-location-search-form]")).toBeVisible();
      const formBox = await page.locator("[data-location-search-form]").boundingBox();
      expect(formBox.width, `${pathname} filter width`).toBeLessThanOrEqual(viewport.width);
      const image = page.locator(".page-hero .hero-media img");
      expect(await image.evaluate((node) => ({ currentSrc: node.currentSrc, naturalWidth: node.naturalWidth }))).toEqual(expect.objectContaining({ naturalWidth: expect.any(Number) }));
      expect(await image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
      expect(await page.locator(".location-listing-grid .listing-card").count()).toBeGreaterThan(0);
      await expect(page.locator(".location-article__layout")).toBeVisible();
      await expect(page.locator(".location-guides__grid article")).toHaveCount(3);
      await expect(page.locator(".location-faq__list details")).toHaveCount(6);
    }
  }
});

test("all desktop location searches fit their primary controls inside the first viewport", async ({ page }) => {
  const paths = ["locations/shakhty.html", "locations/kamenolomni.html", "locations/novoshakhtinsk.html", "locations/ayutinskiy.html", "locations/krasnyy-sulin.html"];
  const controlSelectors = ['select[name="location"]', 'select[name="type"]', 'input[name="priceMin"]', 'input[name="priceMax"]', 'button[type="submit"]'];
  for (const viewport of [{ width: 1366, height: 900 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const pathname of paths) {
      await page.goto(pathname);
      const headerBottom = await page.locator("[data-site-header]").evaluate((node) => node.getBoundingClientRect().bottom);
      const h1Top = await page.locator(".page-hero h1").evaluate((node) => node.getBoundingClientRect().top);
      expect(h1Top, `${pathname} h1 below fixed header at ${viewport.width}px`).toBeGreaterThanOrEqual(headerBottom - 1);
      for (const selector of controlSelectors) {
        const box = await page.locator(`[data-location-search-form] ${selector}`).boundingBox();
        expect(box, `${pathname} ${selector}`).not.toBeNull();
        expect(box.y, `${pathname} ${selector} top at ${viewport.width}px`).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height, `${pathname} ${selector} bottom at ${viewport.width}px`).toBeLessThanOrEqual(viewport.height);
      }
    }
  }
});

test("confirmed social links emit allowlisted events without PII", async ({ page }) => {
  const events = [];
  await page.addInitScript(() => {
    window.DOMIAN_ANALYTICS_TEST_HOOK = (name, params) => window.__domianEvents.push({ name, params });
    window.__domianEvents = [];
  });
  await page.goto("contacts.html");
  await page.evaluate(() => {
    document.addEventListener("click", (event) => {
      if (event.target.closest(".social-links--contact a")) event.preventDefault();
    }, true);
  });
  const expected = {
    telegram_click: "https://t.me/MariyaVoronina87",
    max_click: "https://max.ru/u/f9LHodD0cOIKT6pyYpEr_SpFY0ZcDT9BWF4LEwhkoft3td7dLbNOySNW-RA",
    instagram_click: "https://www.instagram.com/domian_shakhty_mayakovskogo?utm_source=qr&igsi=dTFsYmg4Nm15Y3F0"
  };
  for (const [name, href] of Object.entries(expected)) {
    const link = page.locator(`.social-links--contact a[data-analytics="${name}"]`);
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await link.click();
  }
  events.push(...await page.evaluate(() => window.__domianEvents));
  expect(events.map((item) => item.name)).toEqual(Object.keys(expected));
  expect(events.every((item) => JSON.stringify(item.params) === '{"page_type":"contact"}')).toBe(true);
});

test("Maria portrait is responsive, dimensioned and loads on trust pages", async ({ page }) => {
  for (const pathname of ["", "team/maria-voronina.html", "contacts.html"]) {
    await page.goto(pathname);
    const portrait = page.locator('.owner-portrait img[alt*="Мария Воронина"]').first();
    await portrait.scrollIntoViewIfNeeded();
    await expect(portrait).toBeVisible();
    await expect(portrait).toHaveAttribute("width", "640");
    await expect(portrait).toHaveAttribute("height", "800");
    const image = await portrait.evaluate((node) => ({
      naturalWidth: node.naturalWidth,
      currentSrc: node.currentSrc,
      filter: getComputedStyle(node).filter
    }));
    expect(image.naturalWidth).toBeGreaterThan(0);
    expect(image.currentSrc).toMatch(/maria-voronina-(?:360|640|960)\.webp$/u);
    expect(image.filter).toBe("none");
  }
});

test("team cards and Olga portrait fit desktop and mobile without overflow", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("team/index.html");
    const cards = page.locator(".team-card");
    await expect(cards).toHaveCount(2);
    await expect(cards.nth(0)).toHaveAttribute("data-team-member", "maria-voronina");
    await expect(cards.nth(1)).toHaveAttribute("data-team-member", "olga-chernenko");
    const olga = cards.nth(1).locator('img[alt*="Черненко Ольга"]');
    await olga.scrollIntoViewIfNeeded();
    await expect(olga).toBeVisible();
    expect((await olga.evaluate((node) => node.currentSrc))).toMatch(/olga-chernenko-(?:360|640|960)\.webp$/u);
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll, `team at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.client + 1);
  }
});

test("lead form validates locally and handles provider rejection", async ({ page }) => {
  let requests = 0;
  await page.route("https://api.web3forms.com/submit", async (route) => { requests += 1; await route.fulfill({ status: 400, contentType: "application/json", body: '{"success":false}' }); });
  await page.goto("construction.html#lead-form-section");
  const form = page.locator("form[data-lead-form]");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator("[data-form-status]")).toContainText("Проверьте");
  await form.locator('input[name="name"]').fill("Анна");
  await form.locator('input[name="phone"]').fill("8 918 000-00-00");
  await form.locator('input[name="privacy_consent"]').check();
  await form.locator('button[type="submit"]').click();
  await expect(form.locator("[data-form-status]")).toContainText("не подтвердил отправку");
  expect(requests).toBe(1);
});

test("compact home lead redirects only after provider success", async ({ page }) => {
  await page.route("https://api.web3forms.com/submit", async (route) => { await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' }); });
  await page.goto("");
  const form = page.locator("form[data-lead-compact]");
  await form.locator('input[name="phone"]').fill("8 918 000-00-00");
  await form.locator('input[name="privacy_consent"]').check();
  await form.locator('button[type="submit"]').click();
  await expect(page).toHaveURL(/\/thanks\.html$/u);
  await expect(page.locator("[data-thanks-title]")).toHaveText("Спасибо за обращение");
});

test("lead analytics never receives entered personal data", async ({ page }) => {
  await page.route("https://api.web3forms.com/submit", async (route) => { await route.fulfill({ status: 400, contentType: "application/json", body: '{"success":false}' }); });
  await page.addInitScript(() => {
    window.__domianEvents = [];
    window.DOMIAN_ANALYTICS_TEST_HOOK = (name, params) => window.__domianEvents.push({ name, params });
  });
  await page.goto("commercial.html#lead-form-section");
  const form = page.locator("form[data-lead-form]");
  await form.locator('input[name="name"]').fill("Анна Проверка");
  await form.locator('input[name="phone"]').fill("8 918 123-45-67");
  await form.locator('input[name="privacy_consent"]').check();
  await form.locator('button[type="submit"]').click();
  const payload = JSON.stringify(await page.evaluate(() => window.__domianEvents));
  expect(payload).not.toContain("Анна");
  expect(payload).not.toContain("9181234567");
  expect(payload).not.toContain("123-45-67");
});

test("Metrika and GA4 load once after consent and omit personal URL parameters", async ({ page }) => {
  const runtime = { basePath: "", analyticsTestMode: true, metrikaId: "12345678", ga4Id: "G-TEST123456", web3formsAccessKey: null };
  await page.route("**/assets/js/site-config.js", (route) => route.fulfill({ contentType: "text/javascript", body: `window.DOMIAN_SITE_CONFIG=Object.freeze(${JSON.stringify(runtime)});` }));
  await page.route("https://mc.yandex.ru/**", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.route("https://www.googletagmanager.com/**", (route) => route.fulfill({ contentType: "text/javascript", body: "" }));
  await page.goto("");
  await expect(page.locator(".analytics-consent")).toBeVisible();
  expect(await page.locator('script[src*="mc.yandex.ru"], script[src*="googletagmanager.com"]').count()).toBe(0);
  await page.locator("[data-analytics-accept]").click();
  await expect(page.locator(".analytics-consent")).toHaveCount(0);
  expect(await page.locator('script[src*="mc.yandex.ru"]').count()).toBe(1);
  expect(await page.locator('script[src*="googletagmanager.com"]').count()).toBe(1);
  await page.evaluate(() => window.domianTrack("phone_click", { page_type: "home", phone: "+7 918 123-45-67" }));
  const calls = await page.evaluate(() => JSON.stringify({ ym: window.ym.a || [], ga: window.dataLayer || [] }));
  expect(calls).toContain("reachGoal");
  expect(calls).toContain("phone_click");
  expect(calls).toContain("page_view");
  expect(calls).not.toContain("123-45-67");
  await page.goto("commercial.html?phone=79181234567");
  expect(await page.locator('script[src*="mc.yandex.ru"], script[src*="googletagmanager.com"]').count()).toBe(0);
});

test("mortgage calculator uses the visitor's rate", async ({ page }) => {
  await page.goto("mortgage.html");
  await page.locator('input[name="rate"]').fill("20");
  await expect(page.locator("[data-mortgage-result]")).toContainText("₽ / мес.");
});

test("home request builder transfers criteria into the lead form", async ({ page }) => {
  await page.goto("");
  const builder = page.locator("[data-home-request-builder]");
  await builder.locator('select[name="requestType"]').selectOption("apartment");
  await builder.locator('select[name="requestLocation"]').selectOption({ label: "Каменоломни" });
  await builder.locator('select[name="requestBudget"]').selectOption({ label: "4–7 млн ₽" });
  await builder.locator('input[name="requestPhone"]').fill("8 918 123-45-67");
  await builder.getByRole("button", { name: "Получить актуальную подборку" }).click();
  await expect(builder.locator("[data-home-request-status]")).toContainText("Телефон перенесён");
  await expect(page.locator('form[data-lead-compact] input[name="phone"]')).toHaveValue("8 918 123-45-67");
  const context = await page.evaluate(() => JSON.parse(sessionStorage.getItem("domian_lead_context")));
  expect(context.property_type).toBe("apartment");
  expect(context.territory).toBe("Каменоломни");
  expect(context.criteria).toContain("4–7 млн ₽");
});

test("homepage has six equal category cards and a separate new-home feature", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".home-property-card")).toHaveCount(6);
  await expect(page.locator(".new-homes-feature")).toHaveCount(1);
  await expect(page.locator("[data-showcase-card]")).toHaveCount(0);
  const sections = await page.locator("main > section").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("data-home-section") || "hero"));
  expect(sections).toEqual(["hero", "property", "newbuilds", "construction", "hot-offers", "request", "seller", "locations", "expertise", "office", "lead"]);
});

test("homepage catalog showcases stay compact, truthful and link to imported details", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("");
    await expect(page.locator("[data-home-newbuild]")).toHaveCount(6);
    await expect(page.locator("[data-home-construction]")).toHaveCount(6);
    const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(layout.scroll).toBeLessThanOrEqual(layout.client + 1);
    const firstNewbuild = page.locator("[data-home-newbuild]").first();
    await firstNewbuild.scrollIntoViewIfNeeded();
    await expect(firstNewbuild.locator("img")).toBeVisible();
    expect(await firstNewbuild.locator("img").evaluate((image) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(firstNewbuild.locator('.home-catalog-card__cta')).toHaveAttribute("href", /\/newbuilds\/.+\.html$/u);
    const firstConstruction = page.locator("[data-home-construction]").first();
    await firstConstruction.scrollIntoViewIfNeeded();
    await expect(firstConstruction.locator("img")).toBeVisible();
    await expect(firstConstruction.locator('.home-catalog-card__cta')).toHaveAttribute("href", /\/construction\/projects\/.+\.html$/u);
    const cardWidths = await page.locator(".home-catalog-card").evaluateAll((cards) => cards.map((card) => ({ scroll: card.scrollWidth, client: card.clientWidth })));
    expect(cardWidths.every((card) => card.scroll <= card.client + 1)).toBe(true);
  }
});

test("desktop hot offers remain wide and readable", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("");
  const grid = page.locator(".home-hot-offers__grid");
  await grid.scrollIntoViewIfNeeded();
  const layout = await grid.evaluate((node) => {
    const cards = [...node.querySelectorAll(".listing-card--hot")];
    return {
      columns: getComputedStyle(node).gridTemplateColumns.split(" ").length,
      cards: cards.map((card) => {
        const cardRect = card.getBoundingClientRect();
        const mediaRect = card.querySelector(".listing-card__media").getBoundingClientRect();
        const bodyRect = card.querySelector(".listing-card__body").getBoundingClientRect();
        return {
          width: cardRect.width,
          height: cardRect.height,
          mediaWidth: mediaRect.width,
          bodyWidth: bodyRect.width
        };
      })
    };
  });
  expect(layout.columns).toBe(1);
  expect(layout.cards).toHaveLength(3);
  expect(layout.cards.every((card) => card.width > 1000)).toBe(true);
  expect(layout.cards.every((card) => card.height < 650)).toBe(true);
  expect(layout.cards.every((card) => card.mediaWidth > 500 && card.bodyWidth > 360)).toBe(true);
});

test("mobile property cards form a two-column grid without horizontal scrolling", async ({ page }) => {
  await page.setViewportSize({ width: 400, height: 824 });
  await page.goto("");
  const grid = page.locator(".home-property__grid");
  await grid.scrollIntoViewIfNeeded();
  const layout = await grid.evaluate((node) => {
    const gridRect = node.getBoundingClientRect();
    const cards = [...node.querySelectorAll(".home-property-card")].map((card) => card.getBoundingClientRect());
    return {
      display: getComputedStyle(node).display,
      columns: getComputedStyle(node).gridTemplateColumns.split(" ").length,
      scrollWidth: node.scrollWidth,
      clientWidth: node.clientWidth,
      cardsInside: cards.every((rect) => rect.left >= gridRect.left - 1 && rect.right <= gridRect.right + 1)
    };
  });
  expect(layout.display).toBe("grid");
  expect(layout.columns).toBe(2);
  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.cardsInside).toBe(true);
});

test("mobile hero keeps its caption off the photograph", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  await expect(page.locator(".hero-media__caption")).toBeHidden();
  const media = await page.locator(".hero-media").evaluate((node) => ({
    paddingBottom: getComputedStyle(node).paddingBottom,
    overflow: getComputedStyle(node).overflow
  }));
  expect(media.paddingBottom).toBe("8px");
  expect(media.overflow).toBe("visible");
});

test("new-build card uses the generated modern house instead of the panel facade", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("new-build-apartments.html");
  const image = page.locator(".showcase-card img").first();
  await image.scrollIntoViewIfNeeded();
  await expect(image).toHaveAttribute("src", /modern-apartment-house-960\.webp$/u);
  expect(await image.evaluate((node) => node.naturalWidth)).toBeGreaterThan(0);
});

test("territories keep the approved order and short Ayuta label", async ({ page }) => {
  await page.goto("");
  await expect(page.locator(".home-locations__grid strong")).toHaveText(["Шахты", "Каменоломни", "Новошахтинск", "Аюта", "Красный Сулин"]);
});

test("construction catalog exposes only build-to-order projects", async ({ page }) => {
  await page.goto("construction.html");
  await expect(page.locator("[data-product-count]")).toHaveText("26");
  await expect(page.locator("[data-product-card]")).toHaveCount(26);
  await expect(page.locator("[data-product-card]").first()).toContainText("Дом под ключ 80 м² с тремя спальнями");
  await expect(page.locator("main")).not.toContainText("Дом под чистовую отделку в центре Каменоломней");
  await expect(page.locator('select[name="builder"]')).toHaveCount(0);
  await expect(page.locator("main")).not.toContainText(/ДоманСтрой|Эквита|Партнёрская подборка|\bDS-\d|\bEQ-\d/u);
  const media = await page.locator(".product-card__media").first().evaluate((node) => {
    const image = node.querySelector("img");
    const box = image.getBoundingClientRect();
    return { ratio: box.width / box.height, currentSrc: image.currentSrc };
  });
  expect(media.ratio).toBeCloseTo(4 / 3, 2);
  expect(media.currentSrc).toMatch(/-(?:640|960|1440)\.webp$/u);

  const projectCards = page.locator(".construction-product-card");
  await expect(projectCards).toHaveCount(26);
  for (const image of await projectCards.locator("img").all()) {
    await image.scrollIntoViewIfNeeded();
    const state = await image.evaluate((node) => ({ complete: node.complete, naturalWidth: node.naturalWidth, currentSrc: node.currentSrc }));
    expect(state.complete).toBe(true);
    expect(state.naturalWidth).toBeGreaterThan(0);
    expect(state.currentSrc).toMatch(/\.webp$/u);
  }
});

test("catalog detail hero images keep a bounded aspect ratio", async ({ page }) => {
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const pathname of ["construction/projects/dom-pod-klyuch-75m2-dve-spalni.html", "newbuilds/gray.html"]) {
      await page.goto(pathname);
      const media = page.locator(".catalog-detail__media");
      const image = media.locator("img");
      await expect(image).toBeVisible();
      const state = await media.evaluate((node) => {
        const rect = node.getBoundingClientRect();
        const imageNode = node.querySelector("img");
        return { height: rect.height, width: rect.width, complete: imageNode.complete, naturalWidth: imageNode.naturalWidth };
      });
      expect(state.complete, pathname).toBe(true);
      expect(state.naturalWidth, pathname).toBeGreaterThan(0);
      expect(state.height, `${pathname} at ${viewport.width}px`).toBeLessThan(viewport.height * 0.75);
      expect(state.width / state.height, pathname).toBeGreaterThan(1.2);
      const h1 = await page.locator("h1").boundingBox();
      expect(h1.y, `${pathname} title at ${viewport.width}px`).toBeLessThan(viewport.height);
    }
  }
});

test("matched built-house galleries load full-resolution photos without layout overflow", async ({ page }) => {
  const projects = [
    ["dom-pod-klyuch-75m2-dve-spalni", 6],
    ["dom-pod-klyuch-83-8m2-s-terrasoy", 4],
    ["dom-pod-klyuch-105m2-tri-spalni-dva-sanuzla", 9],
    ["dom-pod-klyuch-111-1m2-tri-spalni", 8]
  ];
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const [slug, photoCount] of projects) {
      await page.goto(`construction/projects/${slug}.html`);
      await expect(page.locator(".catalog-gallery h2")).toHaveText("Примеры близкого архитектурного профиля");
      const links = page.locator(".catalog-gallery__photo-link");
      await expect(links).toHaveCount(photoCount);
      await expect(links.first()).toHaveAttribute("target", "_blank");
      for (const image of await page.locator(".catalog-gallery img").all()) {
        await image.scrollIntoViewIfNeeded();
        await image.evaluate((node) => node.complete && node.naturalWidth > 0
          ? true
          : new Promise((resolve) => node.addEventListener("load", resolve, { once: true })));
        const state = await image.evaluate((node) => ({ currentSrc: node.currentSrc, naturalWidth: node.naturalWidth, height: node.getBoundingClientRect().height }));
        expect(state.currentSrc, slug).toMatch(/built-example-\d{2}\.webp$/u);
        expect(state.naturalWidth, slug).toBeGreaterThanOrEqual(720);
        expect(state.height, `${slug} at ${viewport.width}px`).toBeGreaterThanOrEqual(219);
        expect(state.height, `${slug} at ${viewport.width}px`).toBeLessThanOrEqual(441);
      }
      const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(layout.scroll, `${slug} at ${viewport.width}px`).toBeLessThanOrEqual(layout.client + 1);
    }
  }
});

test("core direction pages have no horizontal overflow or overlapping headings", async ({ page }) => {
  const paths = ["apartments.html", "secondary-apartments.html", "new-build-apartments.html", "newbuilds.html", "newbuilds/leventsovka-park.html", "houses.html", "construction.html", "construction/projects/dom-pod-klyuch-80m2-tri-spalni.html", "secondary-houses.html", "builder-houses.html", "lands.html", "commercial.html", "garages-parking.html"];
  for (const viewport of [{ width: 390, height: 844 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const pathname of paths) {
      await page.goto(pathname);
      const layout = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(layout.scroll, `${pathname} at ${viewport.width}px`).toBeLessThanOrEqual(layout.client + 1);
      const h1 = page.locator("h1");
      await expect(h1).toBeVisible();
      const box = await h1.boundingBox();
      expect(box.width, `${pathname} h1 width`).toBeLessThanOrEqual(viewport.width);
    }
  }
});

test("newbuild and construction filters update the catalog without hiding missing-data truth", async ({ page }) => {
  await page.goto("newbuilds.html");
  await expect(page.locator("[data-product-count]")).toHaveText("78");
  await page.locator('select[name="city"]').selectOption({ label: "Аксай" });
  await expect(page.locator("[data-product-count]")).toHaveText("4");
  await page.locator('select[name="completeness"]').selectOption("needs_review");
  const remaining = Number(await page.locator("[data-product-count]").textContent());
  expect(remaining).toBeGreaterThanOrEqual(0);
  for (const card of await page.locator("[data-product-card]:visible").all()) {
    await expect(card).toContainText("Актуализируется");
  }
  await page.locator('button[type="reset"]').click();
  await expect(page.locator("[data-product-count]")).toHaveText("78");

  await page.goto("construction.html");
  await expect(page.locator('select[name="builder"]')).toHaveCount(0);
  await page.locator('select[name="area"]').selectOption("130-9999");
  const largeProjects = Number(await page.locator("[data-product-count]").textContent());
  expect(largeProjects).toBeGreaterThan(0);
  expect(largeProjects).toBeLessThan(26);
  await page.locator('select[name="floors"]').selectOption("2");
  expect(Number(await page.locator("[data-product-count]").textContent())).toBeLessThanOrEqual(largeProjects);
  await expect(page.locator("main")).toContainText(/Предварительный ориентир|Расчёт по запросу|Комплектация/u);
});

test("primary customer journeys fit all requested audit viewports", async ({ page }) => {
  const paths = ["", "apartments.html", "listings/shk-a01-studio-olymp.html", "houses.html", "lands.html", "newbuilds.html", "construction.html", "sell.html", "valuation.html", "services.html", "team/index.html", "contacts.html"];
  const viewports = [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 412, height: 915 },
    { width: 1366, height: 768 },
    { width: 1440, height: 900 }
  ];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    for (const pathname of paths) {
      await page.goto(pathname);
      await expect(page.locator("h1")).toBeVisible();
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll, `${pathname || "home"} at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.client + 1);
    }
  }
});

test("catalog imagery loads responsive WebP at required viewports", async ({ page }) => {
  const paths = ["newbuilds.html", "newbuilds/leventsovka-park.html", "newbuilds/manhetten-2-0-novaya-vysota.html", "construction.html", "construction/projects/dom-pod-klyuch-80m2-tri-spalni.html"];
  for (const viewport of [{ width: 390, height: 844 }, { width: 430, height: 932 }, { width: 768, height: 1024 }, { width: 1366, height: 900 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    for (const pathname of paths) {
      await page.goto(pathname);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
      expect(dimensions.scroll, `${pathname} at ${viewport.width}px`).toBeLessThanOrEqual(dimensions.client + 1);
      const image = page.locator("main img").first();
      const state = await image.evaluate((node) => ({ currentSrc: node.currentSrc, naturalWidth: node.naturalWidth, complete: node.complete }));
      expect(state.complete, pathname).toBe(true);
      expect(state.naturalWidth, pathname).toBeGreaterThan(0);
      expect(state.currentSrc, pathname).toMatch(/\.webp$/u);
    }
  }
});

test("desktop criteria copy stays below its heading without overlap", async ({ page }) => {
  await page.setViewportSize({ width: 1904, height: 950 });
  await page.goto("contacts.html");
  const heading = page.locator(".criteria-copy h2");
  const intro = page.locator(".criteria-copy .criteria-intro");
  await heading.scrollIntoViewIfNeeded();
  const headingBox = await heading.boundingBox();
  const introBox = await intro.boundingBox();
  expect(headingBox).not.toBeNull();
  expect(introBox).not.toBeNull();
  expect(headingBox.y + headingBox.height).toBeLessThanOrEqual(introBox.y);
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
});

for (const viewport of [
  { name: "mobile-320", width: 320, height: 700 },
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
  { name: "desktop-1904", width: 1904, height: 950 },
  { name: "landscape", width: 844, height: 390 }
]) {
  test(`responsive smoke: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("");
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
    await expect(page.locator("h1")).toBeVisible();
  });
}
