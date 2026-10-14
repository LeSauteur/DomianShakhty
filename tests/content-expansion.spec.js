import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://**", route => route.fulfill({ status: 200, contentType: "text/html", body: "" }));
});

test("inventory filters combine district, territory and rooms and reset cleanly", async ({ page }) => {
  await page.goto("apartments.html");
  const catalog = page.locator('[data-product-catalog="inventory"]');
  const cards = catalog.locator("[data-product-card]");
  await expect(cards).toHaveCount(14);
  await catalog.locator('[name="rooms"]').selectOption("2");
  for (const card of await catalog.locator("[data-product-card]:visible").all()) await expect(card).toHaveAttribute("data-rooms", "2");
  await catalog.locator('[name="query"]').fill("неизвестный район без объектов");
  await expect(catalog.locator("[data-product-count]")).toHaveText("0");
  await expect(catalog.locator("[data-product-empty]")).toBeVisible();
  await catalog.getByRole("button", { name: "Сбросить" }).click();
  await expect(catalog.locator("[data-product-count]")).toHaveText("14");
  await page.goto("houses.html");
  const houses = page.locator('[data-product-catalog="inventory"]');
  await houses.locator('[name="city"]').selectOption("kamenolomni");
  await expect(houses.locator("[data-product-count]")).toHaveText("2");
  for (const card of await houses.locator("[data-product-card]:visible").all()) await expect(card).toHaveAttribute("data-city", "kamenolomni");
});

test("official review widget only loads after the visitor requests it", async ({ page }) => {
  await page.goto("contacts.html");
  const frame = page.locator("[data-reviews-widget] iframe");
  await expect(frame).not.toHaveAttribute("src", /.+/);
  await page.getByRole("button", { name: "Показать отзывы на сайте" }).click();
  await expect(frame).toHaveAttribute("src", "https://yandex.ru/maps-reviews-widget/6252687869?comments");
  await expect(page.locator("[data-reviews-widget]")).toBeVisible();
});

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test(`expanded pages fit and new house media loads at ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    for (const route of ["", "houses.html", "apartments.html", "lands.html", "kadastrovye-raboty.html", "zhk-aleksandrovskiy-park.html", "services.html", "contacts.html", "locations/kamenolomni.html", "construction.html", "construction/projects/postroim-dom-konstantinovsk-110.html"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), route).toBe(true);
      if (["", "kadastrovye-raboty.html", "zhk-aleksandrovskiy-park.html"].includes(route)) {
        await page.screenshot({ path: testInfo.outputPath(`${route || "home"}-${viewport.width}.png`) });
      }
      if (route === "construction.html") {
        const image = page.locator("[data-built-example] img").first();
        await image.scrollIntoViewIfNeeded();
        await expect(image).toBeVisible();
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
        const src = await image.evaluate(node => node.currentSrc);
        expect(src).toMatch(/facade(?:-640)?\.webp$/);
        await page.screenshot({ path: testInfo.outputPath(`built-examples-${viewport.width}.png`) });
      }
      if (route === 'construction/projects/postroim-dom-konstantinovsk-110.html') {
        const image = page.locator('.catalog-detail__media img');
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
        expect(await image.evaluate(node => node.currentSrc)).toContain(viewport.width < 760 ? 'facade-640.webp' : 'facade.webp');
      }
    }
    expect(errors).toEqual([]);
  });
}
