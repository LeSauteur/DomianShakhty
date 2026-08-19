import { expect, test } from "@playwright/test";

const representativePages = [
  "",
  "construction.html",
  "locations/shakhty.html",
  "guides/kak-vybrat-dom-ot-zastroyshchika-v-shakhtah.html",
  "team/maria-voronina.html",
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
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
    expect(errors).toEqual([]);
    expect(failed).toEqual([]);
  });
}

test("mobile drawer opens, traps focus and closes with Escape", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("");
  const toggle = page.locator("[data-menu-toggle]");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-drawer")).toHaveClass(/is-open/u);
  await page.keyboard.press("Escape");
  await expect(toggle).toHaveAttribute("aria-expanded", "false");
  await expect(toggle).toBeFocused();
});

test("lead form validates locally and does not fake success", async ({ page }) => {
  const outbound = [];
  page.on("request", (request) => {
    if (!request.url().startsWith("http://127.0.0.1:4173")) outbound.push(request.url());
  });
  await page.goto("construction.html#lead-form-section");
  const form = page.locator("form[data-lead-form]");
  await form.locator('button[type="submit"]').click();
  await expect(form.locator("[data-form-status]")).toContainText("Проверьте");
  await form.locator('input[name="name"]').fill("Анна");
  await form.locator('input[name="phone"]').fill("8 918 000-00-00");
  await form.locator('input[name="privacy_consent"]').check();
  await form.locator('button[type="submit"]').click();
  await expect(form.locator("[data-form-status]")).toContainText("Форма пока не подключена");
  expect(outbound).toEqual([]);
});

test("mortgage calculator uses the visitor's rate", async ({ page }) => {
  await page.goto("mortgage.html");
  await page.locator('input[name="rate"]').fill("20");
  await expect(page.locator("[data-mortgage-result]")).toContainText("₽ / мес.");
});

test("catalog exposes no unverified inventory", async ({ page }) => {
  await page.goto("construction.html");
  await expect(page.locator("[data-catalog-count]")).toHaveText("0");
  await expect(page.locator("[data-catalog-card]")).toHaveCount(0);
  await expect(page.locator("[data-catalog-empty]")).toBeVisible();
});

for (const viewport of [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "mobile-430", width: 430, height: 932 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-1024", width: 1024, height: 768 },
  { name: "desktop-1366", width: 1366, height: 768 },
  { name: "desktop-1440", width: 1440, height: 900 },
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
