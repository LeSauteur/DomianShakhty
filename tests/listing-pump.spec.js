import { test, expect } from '@playwright/test';

test('viewing dates use Moscow calendar; quick question, day, time and manual comment reach mocked Web3Forms', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-10-20T22:30:00Z') });
  let payload;
  await page.route('https://api.web3forms.com/submit', async route => { payload = route.request().postData(); await route.fulfill({ status: 422, contentType: 'application/json', body: '{"success":false}' }); });
  await page.goto('listings/shk-a05-center-renovated-1k.html');
  await expect(page.locator('[data-viewing-date]')).toHaveCount(7);
  await expect(page.locator('[data-viewing-date]').first()).toHaveAttribute('data-viewing-date', '2026-10-21');
  await page.getByRole('button', { name: 'Торг уместен?', exact: true }).click();
  const form = page.locator('[data-viewing-form]');
  await expect(form.locator('[name="message"]')).toHaveValue(/Объект Ш-К05,.*3.680.000 ₽\. Торг уместен\?/u);
  await form.locator('[name="message"]').press('End');
  await form.locator('[name="message"]').press('Enter');
  await form.locator('[name="message"]').pressSequentially('Нужна парковка.');
  await page.locator('[data-viewing-date]').nth(2).click();
  await form.locator('[name="viewing_time"]').selectOption('Вечер');
  await form.locator('[name="phone"]').fill('89991234567');
  await form.locator('[name="privacy_consent"]').check();
  await form.getByRole('button', { name: 'Записаться на просмотр', exact: true }).click();
  await expect.poll(() => payload || '').toContain('2026-10-23');
  expect(payload).toContain('Вечер'); expect(payload).toContain('Торг уместен?'); expect(payload).toContain('Нужна парковка.'); expect(payload).toContain('Ш-К05');
  await expect(form.locator('[name="message"]')).toHaveValue(/Нужна парковка/u);
});
test('district hash opens the correct map district and survives hash navigation', async ({ page }) => {
  await page.goto('/#district=hbk');
  await expect(page.locator('[data-district-name]')).toHaveText('ХБК');
  await page.evaluate(() => { location.hash = 'district=artem'; });
  await expect(page.locator('[data-district-name]')).toHaveText('Артём');
  await page.evaluate(() => { location.hash = "request"; });
  await expect(page.locator("[data-district-name]")).toHaveText("Артём");
});
test('listing payment stays absent without a rate and validates entered terms', async ({ page }) => {
  await page.goto('listings/shk-a05-center-renovated-1k.html');
  const calc = page.locator('[data-payment-calculator]');
  await calc.locator('[name="down"]').fill('680000'); await calc.locator('[name="years"]').fill('20');
  await expect(calc.locator('[data-payment-result]')).toBeHidden();
  await calc.locator('[name="rate"]').fill('10');
  await expect(calc.locator('[data-payment-result]')).toHaveText('28 951 ₽ / мес.');
  await calc.locator('[name="rate"]').fill('0');
  await expect(calc.locator('[data-payment-result]')).toHaveText('12 500 ₽ / мес.');
  await calc.locator('[name="down"]').fill('4000000'); await expect(calc.locator('[data-payment-result]')).toBeHidden();
  await calc.locator('[name="rate"]').fill(''); await expect(calc.locator('[data-payment-result]')).toBeHidden();
});
test('share links carry canonical object URL; clipboard uses the same URL', async ({ page, context }) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('listings/shk-a05-center-renovated-1k.html?utm_source=qa');
  const share = page.locator('.listing-share');
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
  const max = new URL(await share.getByRole('link', { name: 'MAX', exact: true }).getAttribute('href'));
  expect(max.pathname).toBe('/:share'); expect(max.searchParams.get('text')).toContain(canonical);
  expect(max.searchParams.get('text')).not.toContain('utm_source');
  await share.getByRole('button', { name: 'Скопировать ссылку' }).click();
  await expect(share.locator('[data-copy-status]')).toHaveText('Ссылка скопирована');
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(canonical);
});
