import { test, expect } from "@playwright/test";
import fs from "node:fs";

const { entries } = JSON.parse(fs.readFileSync("src/data/legacy-construction-urls.json", "utf8"));

test("every legacy URL reaches its exact canonical destination after the browser fixture rebuild", async ({ page }, testInfo) => {
  const base = testInfo.project.use.baseURL;
  for (const entry of entries) {
    await page.goto(entry.from);
    await expect(page).toHaveURL(new URL(entry.to, base).href);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", `https://xn--80aakqtid1b0a2a0b.xn--p1ai/${entry.to}`);
  }
});

test.describe("redirects without JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  test("all four historical URL families work on mobile without script redirects", async ({ page }, testInfo) => {
    const base = testInfo.project.use.baseURL;
    for (const prefix of ["domanstroy-", "eqvita-", "soyuz-", "partner-house-"]) {
      const entry = entries.find(entry => entry.from.split("/").pop().startsWith(prefix));
      await page.goto(entry.from);
      await expect(page).toHaveURL(new URL(entry.to, base).href);
      await expect(page.locator("h1")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    }
  });
});
