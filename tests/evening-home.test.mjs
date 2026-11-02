import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { EVENING_HOME_PATH } from '../src/evening-home.mjs';
const html = fs.readFileSync(`dist/${EVENING_HOME_PATH}`, 'utf8');
test('evening design stays isolated from the published home and search index', () => {
  assert.match(html, /name="robots" content="noindex,follow"/u);
  assert.ok(html.includes(`rel="canonical" href="https://xn--80aakqtid1b0a2a0b.xn--p1ai/${EVENING_HOME_PATH}"`));
  assert.ok(!fs.readFileSync('dist/sitemap.xml', 'utf8').includes(EVENING_HOME_PATH));
  const production = fs.readFileSync('dist/index.html', 'utf8');
  assert.doesNotMatch(production, /evening-home|Cormorant Garamond/u);
  assert.match(production, /data-district-map/u);
  assert.match(html, /maria-voronina-360.webp/u);
  for (const value of ['tel:+79185071000', 'data-evening-search', 'data-lead-form', 'data-offer-filter']) assert.ok(html.includes(value));
});

test('evening property cards use current available inventory and exact prices', () => {
  const listings = JSON.parse(fs.readFileSync('src/data/listings.json', 'utf8'));
  const links = [...html.matchAll(/class="property-card__image" href="\/listings\/([a-z0-9-]+)\.html"/gu)];
  assert.equal(links.length, 8);
  for (const [, id] of links) {
    const item = listings.find(listing => listing.id === id);
    assert.equal(item.verified, true);
    assert.equal(item.status, 'available');
    assert.ok(html.includes(`${item.price.toLocaleString('ru-RU')} ₽`));
    assert.ok(html.includes(item.image.src));
  }
});
