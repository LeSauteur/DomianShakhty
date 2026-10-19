import { test, expect } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.route("https://**", route => route.fulfill({ status: 200, contentType: "text/plain", body: "" }));
});

for (const width of [390, 1440]) {
  test(`local newbuild hub and expanded complex fit at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    for (const route of ["novostroyki-shakhty.html", "zhk-aleksandrovskiy-park.html", "locations/kamenolomni.html", "kvartiry-v-centre-shakhty.html"]) {
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), route).toBe(true);
      if (route === "novostroyki-shakhty.html") {
        await expect(page.locator("[data-local-complex]")).toHaveCount(6);
        await expect(page.locator("[data-eis-building]")).toHaveCount(8);
        await expect(page.locator("main details")).toHaveCount(6);
        await expect(page.locator('[data-lead-form]')).toHaveAttribute("data-source-cta", "newbuilds_shakhty");
      }
      if (route === "zhk-aleksandrovskiy-park.html") await expect(page.locator('main a[href="/listings/shk-a13-aleksandrovskiy-park.html"]').first()).toBeVisible();
      if (route === "kvartiry-v-centre-shakhty.html") {
        await expect(page.locator('[data-lead-form]')).toHaveAttribute("data-source-cta", "center_apartments");
        await expect(page.locator("main details")).toHaveCount(6);
        for (const image of await page.locator("main .listing-grid img").all()) {
          await image.scrollIntoViewIfNeeded();
          await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
        }
      }
    }
    expect(errors).toEqual([]);
  });
}

for (const width of [390, 1440]) {
  test(`new practical guides keep author sources and FAQs readable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    for (const slug of ["podrabotannye-territorii-shahty", "mezhevanie-pered-pokupkoy", "proverka-doma-s-gazom"]) {
      await page.goto(`guides/${slug}.html`);
      await expect(page.locator("h1")).toBeVisible();
      await expect(page.locator(".guide-meta")).toContainText("Автор: Редакция офиса");
      await expect(page.locator("#guide-faq details")).toHaveCount(6);
      await page.locator("#guide-faq details").first().locator("summary").click();
      await expect(page.locator("#guide-faq details").first()).toHaveAttribute("open", "");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), slug).toBe(true);
    }
    expect(errors).toEqual([]);
  });
}
