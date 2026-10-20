import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { QUICK_FILTERS, quickKeys, filterCatalog, newestListings, SCENARIOS } from '../src/catalog-pump.mjs';
import { isAvailableListing } from '../src/listing-search.mjs';
import { homePending } from '../src/home-pump.mjs';
const listings = JSON.parse(fs.readFileSync('src/data/listings.json', 'utf8'));
const home = () => fs.readFileSync('dist/index.html', 'utf8');

test('homepage quick search and catalog use the same inventory predicates', () => {
  for (const f of QUICK_FILTERS) {
    const expected = listings.filter(isAvailableListing).filter(f.test).map(i => i.id);
    assert.deepEqual(filterCatalog(listings, { quick: f.key }).map(i => i.id), expected);
    assert.equal(home().includes(`data-quick-link="${f.key}"`), expected.length >= 2);
    for (const item of filterCatalog(listings, { quick: f.key })) assert.ok(quickKeys(item).includes(f.key));
  }
  const repair = QUICK_FILTERS.find(f => f.key === 'renovated');
  assert.equal(repair.test({ features: ['Без ремонта'] }), false);
  assert.equal(repair.test({ features: ['Под ремонт'] }), false);
  assert.equal(repair.test({ features: ['Дизайнерский ремонт'] }), true);
  assert.equal(QUICK_FILTERS.find(f => f.key === 'center').test({ features: ['Центральная вода'] }), false);
});
test('newest objects use dates, exclude unavailable/unverified listings and sort deterministically', () => {
  const source = [{ id: 'b', verified: true, status: 'available', updatedAt: '2026-01-01' }, { id: 'c', verified: true, status: 'sold', updatedAt: '2026-12-31' }, { id: 'a', verified: true, status: 'available', updatedAt: '2026-02-01' }, { id: 'd', verified: false, status: 'available', updatedAt: '2026-12-31' }];
  assert.deepEqual(newestListings(source).map(i => i.id), ['a', 'b']);
  const section = home().match(/data-home-section="new-objects"[\s\S]*?<\/section>/u)[0];
  assert.deepEqual([...section.matchAll(/class="listing-card__media" href="\/listings\/([^"/]+)\.html"/gu)].map(m => m[1]), newestListings(listings).map(i => i.id));
});
test('unconfirmed office blocks and answers are absent from dist, templates can publish confirmed data', () => {
  assert.equal(homePending({}), '');
  assert.doesNotMatch(home(), /data-home-section="(?:office-stats|banks|certificates)"|Работаете с материнским капиталом\?|Сколько длится сделка\?/u);
  assert.equal(fs.existsSync('dist/assets/data/office-pending.json'), false);
  assert.match(homePending({ href: v => v }, { stats: { publish: true, years: 2, deals: 10 }, banks: { publish: true, items: [{ name: 'Тестовый банк' }] }, certificates: { publish: true, items: [{ name: 'Документ', file: 'test.pdf' }] } }), /Тестовый банк/u);
});
test('homepage HTML fits the agreed 60 KiB growth budget and keeps Maria portrait', () => {
  assert.ok(Buffer.byteLength(home()) <= 102646 + 60 * 1024, Buffer.byteLength(home()));
  assert.match(home(), /maria-voronina-960\.webp/u);
  assert.match(home(), /52 оценки · 39 отзывов/u);
});
