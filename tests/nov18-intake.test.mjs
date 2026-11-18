import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { districtInventory } from '../src/district-map.mjs';
import { listingCode } from '../src/catalog-pump.mjs';
const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const records = json('src/data/listings.json');
const intake = json('docs/content-20261118/email-intake.json');

test('November 18 email intake preserves prices, photo provenance and separate agents', () => {
  assert.deepEqual(intake.map(x=>x.price), [2750000,700000,5490000,3600000,3600000,400000000]);
  assert.deepEqual(intake.map(x=>x.photos.length), [10,1,12,8,6,9]);
  assert.equal(new Set(intake.map(x=>x.sourceMessageId)).size, 6);
  assert.equal(new Set(intake.flatMap(x=>x.photos.map(p=>p.sourceSha256))).size, 46);
  for (const source of intake) {
    const item=records.find(x=>x.id===source.id);
    assert.equal(item.price,source.price);
    assert.equal(item.agentId,source.agentId);
    assert.deepEqual([item.image,...item.gallery].map(x=>x.src.split('/').at(-1)),source.photos.map(x=>x.publishedName));
    const page=fs.readFileSync(`dist/listings/${item.id}.html`,'utf8');
    const phones=[...page.matchAll(/<a[^>]*href="tel:[^"]+"[^>]*>/gu)].map(x=>x[0]);
    assert.equal(phones.length,6,item.id);
    assert.ok(phones.every(x=>x.includes('tel:+79188504488') && /\bhidden\b/u.test(x)),item.id);
  }
  const house=records.find(x=>x.id==='shk-h17-gazetny-90');
  assert.equal(house.landArea,6);assert.equal(house.rooms,4);
  assert.match(house.description,/10 соток.*условия.*уточняются/u);
  const may=records.find(x=>x.id==='shk-a24-mayskiy-4k-66');
  assert.equal(may.area,66);assert.equal(may.rooms,4);
  assert.equal(may.agentId,'olesya-semutenko');
  const hotel=records.find(x=>x.id==='shk-c02-virgo-hotel-m4');
  assert.equal(hotel.area,2382);assert.equal(hotel.landArea,800);assert.equal(hotel.price,400000000);
  assert.equal(hotel.agentId,'yana-efimchenko');assert.match(hotel.address,/Октябрьский район.*1003-й км/u);
  assert.equal(hotel.description,hotel.descriptionOriginal.trim());assert.match(hotel.description,/60 номеров/u);
  assert.match(hotel.description,/Классический отель 4★/u);
  assert.ok(hotel.contentIssues.some(x=>x.field==='roomCount' && x.status==='published-as-supplied-by-user-request'));
  assert.match(fs.readFileSync('dist/commercial.html','utf8'),/shk-c02-virgo-hotel-m4/u);
  assert.equal(listingCode(hotel),'Ш-КО02');
  assert.match(fs.readFileSync(`dist/listings/${hotel.id}.html`,'utf8'),/Код Ш-КО02/u);
});

test('new profile has four objects and Grigoryan contact correction stays on her profile', () => {
  const team=json('src/data/team.json');const agent=team.find(x=>x.id==='natalya-panchenko');
  assert.equal(agent.phoneHref,'tel:+79001226706');assert.equal(agent.email,'PanchenkoNatalia1986@yandex.ru');
  const objects=records.filter(x=>x.agentId===agent.id);assert.equal(objects.length,4);
  const profile=fs.readFileSync('dist/team/natalya-panchenko.html','utf8');
  assert.ok(profile.includes(agent.phoneHref));for(const item of objects)assert.ok(profile.includes(item.id+'.html'));
  const grigoryan=team.find(x=>x.id==='olesya-grigoryan');assert.equal(grigoryan.phoneHref,'tel:+79001213704');
  assert.ok(fs.readFileSync('dist/team/olesya-grigoryan.html','utf8').includes(grigoryan.phoneHref));
});

test('May district counter matches its new apartment and excludes Novoshakhtinsk', () => {
  const districts=districtInventory(records);const may=districts.find(x=>x.key==='mayskiy');
  assert.deepEqual(may.listingIds,['shk-a24-mayskiy-4k-66']);assert.equal(may.count,1);
  const home=fs.readFileSync('dist/index.html','utf8');const data=JSON.parse(home.match(/data-district-data>(.*?)<\/script>/su)[1]);
  assert.equal(data.mayskiy.count,1);assert.match(data.mayskiy.text,/Четырёхкомнатная квартира 66 м²/u);
  const mapped=new Set(districts.flatMap(x=>x.listingIds));
  assert.ok(records.filter(x=>x.location==='novoshakhtinsk').every(x=>!mapped.has(x.id)));
});
