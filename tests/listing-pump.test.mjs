import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { listingCode, unitPrice, similarListings, districtFor } from '../src/catalog-pump.mjs';
import { listingQuestions } from '../src/listing-pump.mjs';
const listings = JSON.parse(fs.readFileSync('src/data/listings.json', 'utf8'));

test('unit prices use square metres for dwellings and sotkas for land; missing areas stay absent', () => {
  assert.deepEqual(unitPrice({ type: 'apartment-secondary', price: 3680000, area: 32 }), { value: 115000, unit: 'м²' });
  assert.deepEqual(unitPrice({ type: 'land', price: 610000, landArea: 6 }), { value: 101667, unit: 'сотку' });
  assert.equal(unitPrice({ type: 'land', price: 610000, area: 600 }), null);
  assert.equal(unitPrice({ type: 'apartment-newbuild', price: 4800000 }), null);
  assert.equal(unitPrice({ type: 'house-new', price: 2000000, area: 0 }), null);
});
test('spoken listing codes are stable and unique across property types', () => {
  assert.equal(listingCode({ id: 'shk-a05-center-renovated-1k' }), 'Ш-К05');
  assert.equal(listingCode({ id: 'shk-h05-large-modern-house' }), 'Ш-Д05');
  const codes = listings.map(listingCode);
  assert.equal(new Set(codes).size, codes.length);
});
test('similar objects exclude the current one and unavailable inventory; district precedes price distance', () => {
  const current = listings.find(i => i.id === 'shk-a05-center-renovated-1k');
  const items = similarListings([...listings, { ...current, id: 'sold', status: 'sold' }], current);
  assert.ok(items.length > 0 && items.length <= 4);
  assert.ok(items.every(i => i.id !== current.id && i.id !== 'sold'));
  assert.ok(items.every(i => districtFor(i) === districtFor(current) || Math.abs(i.price - current.price) <= current.price * .3));
});
test('object questions keep office messenger contacts unpublished until confirmed', () => {
  const item = listings[1];
  assert.doesNotMatch(listingQuestions(item), /data-office-messenger/u);
  assert.match(listingQuestions(item, { publish: true, telegram: 'https://t.me/test_office', max: '' }), /data-office-messenger="telegram"/u);
});
