import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { districtInventory } from '../src/district-map.mjs';
import { objectContext } from '../src/listing-pump.mjs';
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const listings=read('src/data/listings.json');
test('Semutenko profile, seven unique objects and administrator defaults retain source facts',()=>{
 const agent=read('src/data/team.json').find(x=>x.id==='olesya-semutenko');
 assert.equal(agent.phoneHref,'tel:+79895152487');assert.equal(agent.email,'o-lesye@mail.ru');
 const items=["shk-a21-artem-3k-renovated","shk-l11-internatsionalny-15","shk-l12-internatsionalny-8","shk-a24-mayskiy-4k-66","shk-l14-kamenolomni-6-sot","shk-l15-pulnogo-4-sot","shk-h21-kamenolomni-mira-100"].map(id=>listings.find(x=>x.id===id));assert.ok(items.every(x=>x?.agentId===agent.id));
 assert.deepEqual(items.map(x=>x.price),[4900000,1800000,750000,3600000,900000,1100000,9000000]);
 assert.deepEqual(items.map(x=>x.gallery.length+1),[9,9,1,6,1,4,12]);
 assert.equal(items[0].area,undefined);assert.equal(items[0].rooms,3);
 assert.match(objectContext({...items[0],price:undefined}),/Цена по запросу/u);
 const page=fs.readFileSync(`dist/listings/${items[0].id}.html`,'utf8');
 assert.match(page,/4\s900\s000 ₽/u);assert.ok(page.includes("ул. Искра, 59"));assert.doesNotMatch(page,/NaN|не\s*число|undefined/u);
 assert.ok(page.includes('tel:+79188504488'));assert.ok(!page.includes(agent.phoneHref));
 const profile=fs.readFileSync('dist/team/olesya-semutenko.html','utf8');
 assert.ok(profile.includes(agent.phoneHref));for(const item of items)assert.ok(profile.includes(item.id+'.html'));
});
test('map includes the new Artem apartment and the Yuzhnaya settlement address, excluding external plots',()=>{
 const districts=districtInventory(listings);const artem=districts.find(x=>x.key==='artem');const yuzh=districts.find(x=>x.key==='yuzh');
 assert.equal(artem.count,new Set(artem.listingIds).size);assert.ok(artem.listingIds.includes('shk-a21-artem-3k-renovated'));
 assert.equal(yuzh.count,new Set(yuzh.listingIds).size);assert.ok(yuzh.listingIds.includes('shk-a19-yuzhnaya-2k-heating'));
 const mapped=districts.flatMap(x=>x.listingIds);assert.ok(!mapped.includes('shk-l11-internatsionalny-15'));assert.ok(!mapped.includes('shk-l12-internatsionalny-8'));
});
