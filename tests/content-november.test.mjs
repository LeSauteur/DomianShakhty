import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const html = file => fs.readFileSync(`dist/${file}`, 'utf8');

test('November apartments keep the supplied prices, photos and office provenance', () => {
  const listings = json('src/data/listings.json').filter(item => ["shk-a15-hbk-1k-37", "shk-a16-2k-50-individual", "shk-a17-kalinina-31a-2k"].includes(item.id));
  assert.deepEqual(listings.map(item => [item.area, item.rooms, item.price, item.gallery.length + 1]), [[37, 1, 3150000, 10], [50, 2, 4250000, 14], [51, 2, 3100000, 12]]);
  for (const item of listings) {
    assert.equal(item.provenance, 'office');
    assert.equal(item.verifiedAt, '2026-11-02');
    assert.match(item.verifiedBy, /Олеси Григорян/u);
    assert.match(html(`listings/${item.id}.html`), /Олеся Григорян/u);
  }
  assert.equal(listings[1].address, 'Шахты');
  assert.match(listings[1].descriptionOriginal, /7,5 м².*7 м²/u);
  assert.doesNotMatch(listings[1].description, /7,5 м²|кухня 7|площадь кухни/iu);
  assert.deepEqual(listings[1].contentIssues,[{field:'kitchenArea',values:[7,7.5],reason:'conflicting_source_values'}]);
  assert.equal(listings[2].address, 'Шахты, ул. Калинина, 31А');
});

test('new specialists expose their own contacts and supplied portraits without invented email', () => {
  const inessa = html('team/inessa-kovaleva.html');
  for (const contact of ['tel:+79613300933', 'tel:+79001219244', 'mailto:innakovaleva75@mail.ru']) assert.ok(inessa.includes(contact));
  assert.match(inessa, /inessa-kovaleva-20261106-360.webp/u);
  assert.match(inessa, /inessa-kovaleva-20261106-640.webp/u);
  assert.match(inessa, /inessa-kovaleva-20261106-960.webp/u);
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
  const elena = html('team/elena-salnikova.html');
  for (const contact of ['tel:+79043454119', 'mailto:salnikova.80@list.ru']) assert.ok(elena.includes(contact));
  assert.match(elena, /Сальникова Елена Ивановна/u);
  assert.match(elena, /elena-salnikova-640.webp/u);
  const dmitry = html('team/dmitry-shevchenko.html');
  for (const contact of ['tel:+79001215017', 'mailto:79081818800@yandex.ru']) assert.ok(dmitry.includes(contact));
  assert.match(dmitry, /Дмитрий Шевченко/u);
  assert.match(dmitry, /Новостройки по всей России/u);
  assert.match(dmitry, /эскроу-счётом/u);
  assert.match(dmitry, /dmitry-shevchenko-640\.webp/u);
  assert.match(html('team/index.html'), /13 специалистов/u);
});


test('November 16 houses keep supplied facts and link the responsible specialist', () => {
  const records = json('src/data/listings.json');
  for (const [id, area, landArea, price, photoCount] of [
    ['shk-h10-stone-house-31', 31, 6, 2800000, 11],
    ['shk-h11-cottage-50', 50, 10, 2150000, 17]
  ]) {
    const item = records.find(item => item.id === id);
    assert.deepEqual([item.area, item.landArea, item.price, item.rooms, item.gallery.length + 1], [area, landArea, price, 2, photoCount]);
    assert.equal(item.address, 'Шахты');
    assert.equal(item.verifiedAt, '2026-11-16');
    const page = html(`listings/${id}.html`);
    assert.match(page, /data-listing-agent="olesya-grigoryan"/u);
    assert.match(page, /href="[^"\s]*team\/olesya-grigoryan.html"/u);
    assert.ok(page.includes('tel:+79188504488'));
    for (const contact of ['tel:+79001213704', 'tel:+79281016277', 'mailto:olesya_eurobereg@mail.ru']) assert.ok(!page.includes(contact));
    assert.match(page.match(/class="hero-actions">([\s\S]*?)<\/div>/u)[1], /tel:\+79188504488/u);
    assert.match(page.match(/id="lead-form-section">([\s\S]*?)<form/u)[1], /tel:\+79188504488/u);
  }
  const profile = html('team/olesya-grigoryan.html');
  assert.match(profile, /olesya-grigoryan-640.webp/u);
  assert.match(profile, /data-agent-listings/u);
  assert.match(profile, /shk-h10-stone-house-31.html/u);
  assert.match(profile, /shk-h11-cottage-50.html/u);
  const cottage = records.find(item => item.id === 'shk-h11-cottage-50');
  assert.match(cottage.description, /летняя кухня, требующая ремонта/iu);
  assert.match(cottage.description, /Кухня 16 м²/iu);
});
