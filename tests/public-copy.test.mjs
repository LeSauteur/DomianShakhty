import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { publicCopy } from '../src/public-copy.mjs';
const read=f=>fs.readFileSync(f,'utf8');

test('all public HTML omits origin badges and legacy caveats including old pages',()=>{
  const files=fs.readdirSync('dist',{recursive:true}).filter(f=>f.endsWith('.html'));
  let count=0;
  for(const file of files){
    const html=read(`dist/${file}`);
    if(html.includes('http-equiv="refresh"'))continue;
    count++;
    assert.doesNotMatch(html,/Объект из обзора рынка|Объект офиса|не гарант|не подтвержда|уточня(?:ет|ют)ся|не является|не являются|не заменя|не означает|не обеща|не показывает|не подменяет|не отменяет|уточняется под рынок/iu,file);
  }
  assert.ok(count>=191);
  for(const file of ['apartments.html','locations/kamenolomni.html'])assert.doesNotMatch(read(`dist/${file}`),/одно название территории|Наличие дороги на карте|Набор вопросов уточняется/u);
});

test('property description formatting preserves original records and technical facts',()=>{
  const source=JSON.parse(read('src/data/listings.json'));
  const output=JSON.parse(read('dist/assets/data/listings.json'));
  const original=JSON.stringify(source);
  for(const item of source.filter(item=>item.verified)){
    const formatted=publicCopy(item.description);
    const detail=read(`dist/listings/${item.id}.html`);
    assert.doesNotMatch(formatted,/уточня(?:ет|ют)ся/iu);
    assert.equal(output.find(x=>x.id===item.id).description,formatted);
    assert.ok(detail.includes(formatted.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#39;')),item.id);
    for(const key of ['id','verified','verifiedAt','verifiedBy','provenance','price','area','image'])assert.deepEqual(output.find(x=>x.id===item.id)[key],item[key]);
  }
  assert.equal(JSON.stringify(source),original);
  assert.match(source.find(x=>x.id==='shk-h06-city-designer-house').description,/уточняется/u);
  assert.match(read('dist/listings/shk-h06-city-designer-house.html'),/Тип канализации — уточните у агента/u);
  assert.match(read('dist/listings/shk-h01-renovation-house.html'),/Газ не подключён/u);
});
