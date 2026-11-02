import { test, expect } from '@playwright/test';

test('evening preview works on mobile and desktop with its own styles and existing photos', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  for (const width of [320, 390, 820, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('previews/evening-home.html');
    await expect(page.locator('h1')).toHaveText('У каждого домасвоя история');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
    await page.evaluate(async () => { await document.fonts.ready; await document.querySelector('.hero img').decode(); });
    await expect(page.locator('.hero img')).toHaveJSProperty('complete', true);
    const image = await page.locator('.hero img').evaluate(node => ({ src: node.currentSrc, width: node.naturalWidth }));
    expect(image.src).toMatch(/house-dark-cta-(?:960|1440)\.webp$/u);
    expect(image.width).toBeGreaterThan(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1), `${width}px`).toBe(true);
    if (width <= 700) {
      const toggle = page.locator('[data-menu-toggle]');
      await toggle.click();
      await expect(toggle).toHaveAttribute('aria-expanded', 'true');
      await page.keyboard.press('Escape');
      await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    }
  }
  expect(errors).toEqual([]);
});

test('evening filters, search and enquiry carry real criteria', async ({ page }) => {
  await page.goto('previews/evening-home.html');
  await page.getByRole('button', { name: 'Дома', exact: true }).click();
  const visible = page.locator('[data-property-card]:visible');
  await expect(visible).toHaveCount(3);
  for (const card of await visible.all()) await expect(card).toHaveAttribute('data-type', 'houses');
  await page.getByRole('button', { name: 'Все предложения', exact: true }).click();
  await expect(visible).toHaveCount(8);
  const search = page.locator('[data-evening-search]');
  await search.locator('[name="type"]').selectOption('houses');
  await search.locator('[name="city"]').selectOption('kamenolomni');
  await search.locator('[name="priceMax"]').fill('6000000');
  await search.getByRole('button').click();
  await expect(page).toHaveURL(/catalog\.html\?type=houses&city=kamenolomni&priceMax=6000000$/u);
  await expect(page.locator('[data-product-filters] [name="city"]')).toHaveValue('kamenolomni');
  await page.goto('previews/evening-home.html');
  let payload;
  await page.route('https://api.web3forms.com/submit', async route => {
    payload = route.request().postData();
    await route.fulfill({ status: 422, contentType: 'application/json', body: '{"success":false}' });
  });
  const form = page.locator('.contact-form');
  await form.locator('[name="name"]').fill('Проверка');
  await form.locator('[name="phone"]').fill('89991234567');
  await form.locator('[name="property_type"]').selectOption('house');
  await form.locator('[name="message"]').fill('Дом с участком в Шахтах');
  await form.locator('[name="privacy_consent"]').check();
  await form.getByRole('button').click();
  await expect.poll(() => payload).toBeTruthy();
  expect(payload).toContain('house');
  expect(payload).toContain('Дом с участком в Шахтах');
  expect(payload).toContain('evening-home');
  await expect(form.locator('[data-form-status]')).toBeVisible();
});
