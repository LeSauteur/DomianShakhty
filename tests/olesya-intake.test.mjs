import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const json = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const records = json('src/data/listings.json');
const intake = json('docs/content-20261117/olesya-intake.json');
test('nine email properties retain exact prices, photo sets, attribution and missing dimensions', () => {
  assert.deepEqual(intake.map(x => x.price), [1950000,2600000,8500000,3650000,4300000,6900000,6700000,12900000,7500000]);
  assert.deepEqual(intake.map(x => x.photos.length), [10,12,19,11,6,16,15,10,3]);
  assert.equal(intake.reduce((n,x) => n+x.photos.length,0),102);
  for (const source of intake) {
    const item = records.find(x => x.id === source.id);
    assert.equal(item.price, source.price); assert.equal(item.agentId, 'olesya-grigoryan');
    assert.deepEqual([item.image,...item.gallery].map(x => x.src.split('/').at(-1)), source.photos.map(x=>x.publishedName));
    if (!['shk-h13-krasina-brick-58','shk-a18-gorod-budushchego-4k-100'].includes(item.id)) assert.equal(item.area, undefined);
    const html = fs.readFileSync(`dist/listings/${item.id}.html`,'utf8');
    const phones = [...html.matchAll(/<a[^>]*href="(tel:[^"]+)"[^>]*>/gu)].map(x=>x[0]);
    assert.equal(phones.length,6,item.id);
    assert.ok(phones.every(x=>x.includes('tel:+79188504488') && /\bhidden\b/u.test(x)),item.id);
  }
  assert.equal(records.find(x=>x.id==='shk-h15-razdorskaya-don-dacha').location,'razdorskaya');
  assert.equal(records.find(x=>x.id==='shk-c01-center-building-repair').type,'commercial');
  assert.ok(fs.readFileSync('dist/commercial.html','utf8').includes('shk-c01-center-building-repair.html'));
});
