import { test, expect } from '@playwright/test';
import sharp from 'sharp';
import fs from 'node:fs/promises';
const agentObject = 'shk-h11-cottage-50';
const phone = 'tel:+79188504488';
async function analytics(page, consent = 'accepted') {
  await page.route('**/assets/js/site-config.js*', route => route.fulfill({ contentType: 'text/javascript', body: `window.DOMIAN_SITE_CONFIG={basePath:'',analyticsTestMode:true,ga4Id:'G-TEST123456',web3formsAccessKey:'test-only-placeholder',endpoint:'https://api.web3forms.com/submit',phoneHref:'tel:+79185071000'}` }));
  await page.route('https://www.googletagmanager.com/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.addInitScript(value => {
    if (value) localStorage.setItem('domian_analytics_consent', value);
    window.__gaCalls = []; window.gtag = function () { window.__gaCalls.push(Array.from(arguments)); };
    document.addEventListener('click', event => { if (event.target.closest('a[href^="tel:"]')) event.preventDefault(); }, true);
  }, consent);
}
const events = page => page.evaluate(() => window.__gaCalls.filter(call => call[0] === 'event').map(([, name, params]) => ({ name, params })));

test('administrator contacts reveal once, all duplicates stay in sync, and phone clicks have context', async ({ page }) => {
  await analytics(page);
  await page.goto(`listings/${agentObject}.html`);
  const numbers = page.locator(`a[href="${phone}"]`);
  expect(await numbers.count()).toBe(6);
  for (const number of await numbers.all()) await expect(number).toBeHidden();
  const control = page.locator('[data-phone-control][data-placement="hero"]');
  const before = await control.boundingBox();
  await control.getByRole('button', { name: 'Показать телефон' }).click();
  for (const number of await numbers.all()) await expect(number).not.toHaveAttribute('hidden', '');
  const after = await control.boundingBox(); expect(Math.abs(before.height - after.height)).toBeLessThan(1); expect(Math.abs(before.width - after.width)).toBeLessThan(1);
  await control.locator('a').click();
  const calls = await events(page);
  expect(calls.filter(call => call.name === 'phone_reveal')).toHaveLength(1);
  expect(calls.filter(call => call.name === 'phone_click')).toHaveLength(1);
  for (const call of calls) expect(call.params).toMatchObject({ object_id: agentObject, agent_id: 'olesya-grigoryan', placement: 'hero', event_type: call.name, contact_id: 'elena-larionova', contact_role: 'administrator' });
  expect(JSON.stringify(calls)).not.toMatch(/79188504488|44-88|@/);
  await expect(page.locator('a[href^="tel:"]')).toHaveCount(6);
});

test('unassigned objects default to hidden administrator and specialist profiles keep their own phones open', async ({ page }) => {
  await page.goto('listings/shk-a01-studio-olymp.html');
  await expect(page.locator('[data-phone-reveal]')).toHaveCount(6);
  for (const number of await page.locator('a[href^="tel:"]').all()) { await expect(number).toHaveAttribute('href', phone); await expect(number).toBeHidden(); }
  await page.locator('[data-placement="hero"] [data-phone-reveal]').click();
  await expect(page.locator('.listing-detail__copy a[href="' + phone + '"]')).toBeVisible();
  await page.goto('team/olesya-grigoryan.html');
  await expect(page.locator('.profile-facts a[href="tel:+79001213704"]')).toBeVisible();
  await page.goto('team/');
  await expect(page.locator('[data-team-member="olesya-grigoryan"] a[href="tel:+79001213704"]')).toBeVisible();
});

test('declined analytics never sends contact or promo events, while features still work', async ({ page }) => {
  await analytics(page, 'declined');
  await page.goto(`listings/${agentObject}.html`);
  await page.locator('[data-placement="hero"] [data-phone-reveal]').click();
  await page.locator('[data-placement="hero"] a').click();
  await page.getByRole('link', { name: 'Рекламный комплект' }).click();
  const downloadPromise = page.waitForEvent('download'); await page.locator('[data-promo-download="story"]').click(); await downloadPromise;
  expect(await events(page)).toEqual([]);
  await expect(page.locator('script[src*="mc.yandex"],script[src*="googletagmanager"]')).toHaveCount(0);
});

test('promo open is recorded once when consent is granted on the same page', async ({ page }) => {
  await analytics(page, null);
  await page.goto(`promo/${agentObject}.html`);
  expect(await events(page)).toEqual([]);
  await page.locator('[data-analytics-accept]').click();
  expect((await events(page)).filter(call => call.name === 'promo_open')).toHaveLength(1);
});

for (const width of [390, 430, 768, 1366, 1440]) test(`promo, photo selection, PNG downloads and contact layout at ${width}px`, async ({ browser, baseURL }, info) => {
  const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 500, hasTouch: width < 500 });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message)); page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await analytics(page);
  await page.goto(`${baseURL}listings/${agentObject}.html`);
  await page.locator('[data-placement="hero"]').scrollIntoViewIfNeeded();
  await page.screenshot({ path: info.outputPath(`phone-before-${width}.png`) });
  await page.locator('[data-placement="hero"] [data-phone-reveal]').click();
  await page.screenshot({ path: info.outputPath(`phone-after-${width}.png`) });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  await page.getByRole('link', { name: 'Рекламный комплект' }).click();
  await expect(page.locator('[data-promo-preview]')).toBeVisible();
  await expect(page.locator('[data-promo-warning]')).toBeVisible();
  await page.locator('.promo-photos').scrollIntoViewIfNeeded();
  await page.locator('.promo-photos img').evaluateAll(async images => { for (const image of images) image.loading = 'eager'; await Promise.all(images.map(image => image.decode())); });
  await page.evaluate(() => scrollTo(0,0));
  await page.screenshot({ path: info.outputPath(`promo-${width}.png`), fullPage: true });
  for (const [format, height] of [['story', 1920], ['post', 1350]]) {
    const downloadPromise = page.waitForEvent('download'); await page.locator(`[data-promo-download="${format}"]`).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBe(`shakhty-${agentObject}-${format}.png`);
    const metadata = await sharp(await fs.readFile(await download.path())).metadata(); expect([metadata.width, metadata.height]).toEqual([1080, height]);
  }
  await page.locator('[data-promo-photo="1"]').click();
  await expect(page.locator('[data-promo-status]')).toContainText('Обложка готова');
  await expect(page.locator('[data-promo-preview]')).toHaveAttribute('src', /^blob:/);
  await page.locator('[data-promo-format="post"]').click();
  await expect(page.locator('[data-promo-preview]')).toHaveAttribute('height', '1350');
  await page.locator('[data-promo-position="x"]').fill('20');
  await expect(page.locator('[data-promo-download="post"]')).toHaveAttribute('aria-disabled', 'false');
  const customPromise = page.waitForEvent('download'); await page.locator('[data-promo-download="post"]').click();
  const customFile = await customPromise; expect((await sharp(await fs.readFile(await customFile.path())).metadata()).height).toBe(1350);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  expect((await events(page)).filter(call => call.name === 'promo_download')).toHaveLength(3);
  expect(errors).toEqual([]); await context.close();
});

test('text, link and QR actions fire once and a short link forwards only allowed attribution', async ({ page, context }) => {
  await analytics(page);
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(`promo/${agentObject}.html`);
  await page.locator('[data-promo-copy="text"]').click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toContain('2\u00a0150\u00a0000 ₽');
  await page.locator('[data-promo-copy="link"]').click();
  const link = await page.evaluate(() => navigator.clipboard.readText());
  expect(link).toContain('/s/h11.html?utm_source=agent');
  const qrPromise = page.waitForEvent('download'); await page.locator('[data-promo-qr]').click(); await qrPromise;
  for (const name of ['promo_open', 'promo_copy_text', 'promo_copy_link', 'promo_qr_download']) expect((await events(page)).filter(call => call.name === name)).toHaveLength(1);
  await page.goto('s/h11.html?utm_source=telegram&utm_medium=status&phone=123&other=secret');
  await page.waitForURL('**/listings/shk-h11-cottage-50.html?**');
  expect(page.url()).toContain('utm_source=telegram'); expect(page.url()).not.toMatch(/phone=|other=/);
});
for (const width of [390, 1440]) test(`header administrator reveal remains clickable at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`listings/${agentObject}.html`);
  const header = page.locator('.site-header [data-placement="header"]');
  await expect(header.locator('[data-phone-reveal]')).toBeVisible();
  await header.locator('[data-phone-reveal]').click();
  await expect(header.locator('a')).toBeVisible();
  await expect(header.locator('a')).toHaveAttribute('href', phone);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
});
