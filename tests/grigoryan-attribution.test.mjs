import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const records = JSON.parse(read('src/data/listings.json'));
const changes = JSON.parse(read('docs/attribution-20261118/approved-changes.json'));

test('sender attribution includes all fourteen Grigoryan listings and preserves the older unassigned inventory', () => {
  const novemberIds = JSON.parse(read('docs/content-20261117/olesya-intake.json')).map(x => x.id);
  const confirmedIds = [...changes.map(x => x.id), 'shk-h10-stone-house-31', 'shk-h11-cottage-50', ...novemberIds];
  assert.equal(confirmedIds.length,14);
  assert.deepEqual(records.filter(x => x.agentId === 'olesya-grigoryan').map(x => x.id).sort(), confirmedIds.sort());
  const baseline = JSON.parse(read('tests/fixtures/listing-publication-20261103.json'));
  const older = records.filter(x => baseline.ids.slice(0,34).includes(x.id));
  assert.equal(older.length,34);
  assert.ok(older.every(x => !x.agentId));
  const profile = read('dist/team/olesya-grigoryan.html');
  for (const id of confirmedIds) assert.ok(profile.includes(`${id}.html`),id);
  for (const {id,before,after} of changes) {
    assert.deepEqual(records.find(x => x.id === id), after,id);
    const photos = x => [x.image,...x.gallery].map(photo => photo.src).sort();
    assert.deepEqual(photos(before),photos(after),id+' preserves all photographs');
    const page = read(`dist/listings/${id}.html`);
    assert.match(page,/data-listing-agent="olesya-grigoryan"/u,id);
    assert.ok(page.includes('tel:+79188504488'),id);
    assert.ok(!page.includes('tel:+79001213704'),id);
    if(id !== 'shk-a15-hbk-1k-37') assert.ok(after.image.src.endsWith('/04.webp'),id+' requested kitchen cover');
  }
});
