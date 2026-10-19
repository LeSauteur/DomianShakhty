import { test, expect } from "@playwright/test";

test("district picker works with mouse, keyboard and mobile chips without remote map requests", async ({ page }) => {
  const errors = [], requests = [];
  page.on("pageerror", error => errors.push(error.message));
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
  page.on("request", request => requests.push(request.url()));
  await page.goto("");
  await page.locator('.district-map__pin[data-district="hbk"]').click();
  await expect(page.locator("[data-district-name]")).toHaveText("ХБК");
  await expect(page.locator("[data-district-count]")).toHaveText("3 объекта в каталоге");
  const kamen = page.locator('.district-map__pin[data-district="kamen"]');
  await kamen.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-district-name]")).toHaveText("Каменоломни");
  await expect(kamen).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.locator(".district-map__chips")).toBeVisible();
  const ayuta = page.locator('.district-map__chip[data-district="ayuta"]');
  await ayuta.scrollIntoViewIfNeeded();
  await ayuta.click();
  await expect(page.locator("[data-district-count]")).toHaveText("Под запрос");
  await expect(page.locator("[data-district-cta]")).toHaveText("Оставить запрос");
  await page.locator(".district-map__canvas").evaluate(node => node.scrollIntoView({ block: "center", behavior: "instant" }));
  for (const pin of await page.locator(".district-map__pin").all()) {
    const box = await pin.boundingBox();
    expect(box.width).toBeGreaterThanOrEqual(44);
    expect(box.height).toBeGreaterThanOrEqual(44);
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(pin).toHaveAttribute("aria-pressed", "true");
  }
  await ayuta.click();
  await page.locator("[data-district-cta]").click();
  await expect(page.locator('[data-home-request-builder] select[name="requestLocation"]')).toHaveValue("Аюта");
  expect(await page.evaluate(() => JSON.parse(sessionStorage.getItem("domian_lead_context")).territory)).toBe("Аюта");
  expect(requests.filter(url => /main-hero-|tile\.|leaflet|mapbox|openstreetmap/u.test(url))).toEqual([]);
  expect(errors).toEqual([]);
});

test("district map keeps Center content and section links without JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 812 } });
  const page = await context.newPage();
  await page.goto(baseURL);
  await expect(page.locator("[data-district-name]")).toHaveText("Центр");
  await expect(page.locator(".district-map__chips a")).toHaveCount(14);
  await expect(page.locator('.district-map__chips a[data-district="kamen"]')).toHaveAttribute("href", /locations\/kamenolomni.html$/u);
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(page.locator(".district-map__chips")).toBeVisible();
  await context.close();
});

test("district labels do not overlap at desktop and tablet widths", async ({ page }) => {
  for (const width of [1440, 1280, 1024, 768]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto("");
    const collisions = await page.locator("[data-district-map]").evaluate(root => {
      const labels = [...root.querySelectorAll(".district-map__pin span")].map(label => ({ name: label.textContent, box: label.getBoundingClientRect() }));
      const collisions = [];
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i].box, b = labels[j].box;
        if (Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1) collisions.push([labels[i].name, labels[j].name]);
      }
      return collisions;
    });
    expect(collisions, `label collisions at ${width}px`).toEqual([]);
  }
});
