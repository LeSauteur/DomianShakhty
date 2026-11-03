import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const html = file => fs.readFileSync(`dist/${file}`, 'utf8');

test('November apartments keep the supplied prices, photos and office provenance', () => {
  const listings = json('src/data/listings.json').slice(-3);
  assert.deepEqual(listings.map(item => [item.area, item.rooms, item.price, item.gallery.length + 1]), [[37, 1, 3150000, 10], [50, 2, 4250000, 14], [51, 2, 3100000, 12]]);
  for (const item of listings) {
    assert.equal(item.provenance, 'office');
    assert.equal(item.verifiedAt, '2026-11-02');
    assert.match(item.verifiedBy, /Олеси Григорян/u);
    assert.match(html(`listings/${item.id}.html`), /Олеся Григорян/u);
  }
  assert.equal(listings[1].address, 'Шахты');
  assert.match(listings[1].description, /7,5 м².*7 м²/u);
  assert.equal(listings[2].address, 'Шахты, ул. Калинина, 31А');
});

test('new specialists expose their own contacts and supplied portraits without invented email', () => {
  const inessa = html('team/inessa-kovaleva.html');
  for (const contact of ['tel:+79613300933', 'tel:+79001219244', 'mailto:innakovaleva75@mail.ru']) assert.ok(inessa.includes(contact));
  assert.match(inessa, /inessa-kovaleva-360.webp/u);
  assert.match(inessa, /inessa-kovaleva-640.webp/u);
  assert.match(inessa, /inessa-kovaleva-960.webp/u);
  assert.doesNotMatch(inessa, /class="person-initials"/u);
  const roman = html('team/roman-roslyakov.html');
  assert.ok(roman.includes('tel:+79001889888'));
  assert.ok(roman.includes('mailto:rrb@mail.ru'));
  assert.match(roman, /roman-roslyakov-360.webp/u);
  const vladimir = html('team/vladimir-starchak.html');
  assert.ok(vladimir.includes('tel:+79001223627'));
  const profile = vladimir.match(/<dl class="profile-facts">[\s\S]*?<\/dl>/u)?.[0];
  assert.ok(profile);
  assert.doesNotMatch(profile, /mailto:/u);
  assert.doesNotMatch(vladimir, /mailto:(?:undefined|null|false)?"/u);
  const person = [...vladimir.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)].flatMap(match => JSON.parse(match[1])['@graph'] || []).find(item => item['@type'] === 'Person');
  assert.ok(person);
  assert.equal(person.email, undefined);
  const ksenia = html('team/ksenia-tsygankova.html');
  for (const contact of ['tel:+79895227655', 'mailto:ksenj79@yandex.ru']) assert.ok(ksenia.includes(contact));
  assert.match(ksenia, /Цыганкова Ксения Петровна/u);
  assert.match(ksenia, /Вся Ростовская область/u);
  assert.match(ksenia, /ksenia-tsygankova-640.webp/u);
  assert.match(html('team/index.html'), /8 специалистов/u);
});
