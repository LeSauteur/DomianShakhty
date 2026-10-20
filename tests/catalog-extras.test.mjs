import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {catalogScenarios} from '../src/catalog-extras.mjs';
import {filterCatalog} from '../src/catalog-pump.mjs';
import {districtInventory} from '../src/district-map.mjs';
const listings=JSON.parse(fs.readFileSync('src/data/listings.json','utf8'));
test('scenario tiles require three matching available objects',()=>{
 const scenarios=catalogScenarios(listings);assert.equal(scenarios.length,4);
 for(const s of scenarios)assert.equal(s.count,filterCatalog(listings,{scenario:s.key}).length);
 assert.deepEqual(catalogScenarios(listings.slice(0,2)),[]);
 assert.deepEqual(catalogScenarios(listings.map(i=>({...i,status:'sold'}))),[]);
});
test('catalog districts reuse the map classification without fuzzy text alternatives',()=>{
 for(const d of districtInventory(listings))assert.deepEqual(filterCatalog(listings,{district:d.key}).map(i=>i.id),d.listingIds);
});
test('public output has no banned defensive copy; existing SEO remains in source',()=>{
 for(const file of fs.readdirSync('dist',{recursive:true}).filter(f=>/\.(?:html|js|json|xml|txt)$/u.test(f))){
  assert.doesNotMatch(fs.readFileSync('dist/'+file,'utf8'),/Данные на|уточните график|проверенными данными|не является|публичной офертой/iu,file);
 }
});
