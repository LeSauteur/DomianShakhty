import { test, expect } from "@playwright/test";
import fs from "node:fs";

const examples = JSON.parse(fs.readFileSync("src/data/construction-projects.json", "utf8")).builtExamples;
const builderPath = "construction/builders/postroim-dom.html";

test.beforeEach(async ({ page }) => {
  await page.route("https://**", route => route.fulfill({ status: 200, contentType: "text/plain", body: "" }));
});

for (const width of [390, 1440]) {
  test(`builder and six completed houses load without overflow or console errors at ${width}px`, async ({ page }, testInfo) => {
    test.setTimeout(120_000);
    await page.setViewportSize({ width, height: 900 });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("console", message => { if (message.type() === "error") errors.push(message.text()); });
    for (const path of [builderPath, ...examples.map(item => `construction/projects/${item.slug}.html`), "construction.html", "houses.html"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), path).toBe(true);
      for (const image of await page.locator(".catalog-detail__media img, [data-built-example] img").all()) {
        await image.scrollIntoViewIfNeeded();
        await expect.poll(() => image.evaluate(node => node.complete && node.naturalWidth > 0)).toBe(true);
        const currentSrc = await image.evaluate(node => node.currentSrc);
        expect(currentSrc).toMatch(/facade(?:-640)?\.webp$/u);
        if (width === 390) expect(currentSrc).toContain("facade-640.webp");
      }
      if (path === builderPath) {
        await expect(page.locator("[data-built-example]")).toHaveCount(6);
        await page.locator("h1").scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`builder-hero-${width}.png`) });
        await page.locator("#built-examples").scrollIntoViewIfNeeded();
        await page.screenshot({ path: testInfo.outputPath(`builder-cards-${width}.png`) });
      }
    }
    expect(errors).toEqual([]);
  });
}

test("builder enquiry preserves house service and identifies the office and source in the mocked payload", async ({ page }) => {
  let payload = "";
  await page.route("https://api.web3forms.com/submit", async route => {
    payload = route.request().postData() || "";
    await route.fulfill({ status: 200, contentType: "application/json", body: '{"success":true}' });
  });
  await page.goto(builderPath);
  const form = page.locator("[data-lead-form]");
  await expect(form).toHaveAttribute("data-source-cta", "builder_postroim_dom");
  await form.locator('[name="name"]').fill("Тест формы");
  await form.locator('[name="phone"]').fill("+79991234567");
  await form.locator('[name="message"]').fill("Участок в Шахтах, дом 110 м², бюджет обсудим с офисом");
  await form.locator('[name="privacy_consent"]').check();
  await form.getByRole("button", { name: "Передать обращение" }).click();
  await expect(page).toHaveURL(/thanks\.html/u);
  const field = (name, value) => expect(payload).toContain(`name="${name}"\r\n\r\n${value}\r\n`);
  field("source_cta", "builder_postroim_dom");
  field("origin_page", builderPath);
  field("service", "house-builder");
  field("property_type", "house");
  field("subject", "Новая заявка: Домиан · Шахты на Маяковского");
});
