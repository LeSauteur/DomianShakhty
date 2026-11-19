import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const json=p=>JSON.parse(fs.readFileSync(p,'utf8'));
test('evening intake keeps sender ownership, confirmed prices and all supplied photos',()=>{
 const records=json('src/data/listings.json'),intake=json('docs/intake-20261118-evening/intake.json');
 assert.deepEqual(intake.map(x=>x.photos.length),[15,8,5]);
 assert.deepEqual(intake.map(x=>x.agentId),['ksenia-tsygankova','ksenia-tsygankova','yana-efimchenko']);
 assert.deepEqual(intake.map(x=>x.price),[7600000,3600000,3400000]);
 for(const source of intake){const x=records.find(x=>x.id===source.id);assert.equal(x.agentId,source.agentId);assert.equal(x.price,source.price??undefined);assert.equal(x.gallery.length+1,source.photos.length);const html=fs.readFileSync(`dist/listings/${x.id}.html`,'utf8');assert.ok(html.includes('tel:+79188504488'));if(!source.price)assert.match(html,/Цена по запросу/u);assert.ok(fs.readFileSync(`dist/team/${x.agentId}.html`,'utf8').includes(x.id+'.html'));}
 const person=json('src/data/team.json').find(x=>x.id==='ekaterina-ivanova');assert.equal(person.phoneHref,'tel:+79860080829');assert.equal(person.email,'ekaterinadam910@gmail.com');assert.ok(fs.existsSync(person.image.fallback));
 const houses=fs.readFileSync('dist/houses.html','utf8');assert.match(houses,/<option value="melikhovskaya">Мелиховская<\/option>/u);assert.match(houses,/<option value="razdorskaya">Раздорская<\/option>/u);
 const land=fs.readFileSync('dist/lands.html','utf8');assert.match(land,/<option value="internatsionalny">Интернациональный<\/option>/u);
});
