import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { maskApprovedHotelRoute } from '../_tools/approved-donor-content.mjs';

test('approved hotel junction does not exempt unrelated donor mentions or unrelated files',()=>{
  const city='\u041d\u043e\u0432\u043e\u0447\u0435\u0440\u043a\u0430\u0441\u0441\u043a';
  const hotel=JSON.parse(fs.readFileSync('src/data/listings.json','utf8')).find(x=>x.id==='shk-c02-virgo-hotel-m4');
  const source=JSON.stringify(hotel);
  assert.ok(source.includes(city));
  assert.ok(!maskApprovedHotelRoute('src/data/listings.json',source).includes(city));
  assert.ok(!maskApprovedHotelRoute('dist/commercial.html',source).includes(city));
  assert.ok(!maskApprovedHotelRoute('dist/commercial.html',source.toLowerCase()).includes(city.toLowerCase()));
  assert.equal(maskApprovedHotelRoute('src/unrelated.mjs',source),source);
  assert.ok(maskApprovedHotelRoute('dist/commercial.html',source+' '+city).includes(city));
  const unrelated=hotel.description;
  assert.equal(maskApprovedHotelRoute('dist/other.html',unrelated),unrelated);
});
