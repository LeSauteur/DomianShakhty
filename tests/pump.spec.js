import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { QUICK_FILTERS, filterCatalog } from '../src/catalog-pump.mjs';
const listings = JSON.parse(fs.readFileSync('src/data/listings.json', 'utf8'));

test('special offer tabs support click and keyboard navigation', async ({ page }) => {
  await page.goto('');
  const tabs = page.locator('[data-pump-tabs]');
  await tabs.getByRole('tab', { name: 'Дома и участки', exact: true }).click();
  await expect(page.locator('#panel-houses-land')).toBeVisible();
  await expect(page.locator('#panel-apartments')).toBeHidden();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Новостройки', exact: true })).toHaveAttribute('aria-selected', 'true');
  for (const key of ['apartments', 'houses-land', 'newbuilds']) {
    await expect(page.locator('#panel-' + key + ' .pump-cards > article')).toHaveCount(3);
    await expect(page.locator('#panel-' + key + ' h3.pump-panel-title')).toHaveCount(0);
  }
  await expect(page.locator('#panel-newbuilds .listing-card')).toHaveCount(1);
  await expect(page.locator('#panel-newbuilds .product-card')).toHaveCount(2);
});
test('quick search URLs hydrate catalog and reset cleanly', async ({ page }) => {
  for (const f of QUICK_FILTERS) {
    await page.goto(`catalog.html?quick=${f.key}`);
    const ids = await page.locator('[data-product-card]:visible').evaluateAll(nodes => nodes.map(n => n.dataset.listingId));
    expect(ids.sort()).toEqual(filterCatalog(listings, { quick: f.key }).map(i => i.id).sort());
    await expect(page.locator('select[name="quick"]')).toHaveValue(f.key);
  }
  await page.locator('[data-product-filters] button[type="reset"]').click();
  await expect(page.locator('select[name="quick"]')).toHaveValue('');
  await expect(page.locator('[data-product-card]:visible')).toHaveCount(filterCatalog(listings).length);
  await expect(page).not.toHaveURL(/quick=/u);
});
