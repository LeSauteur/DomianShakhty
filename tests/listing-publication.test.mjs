import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {publicListing,listingFacts} from '../src/listing-publication.mjs';
import {publicCopy} from '../src/public-copy.mjs';
const read=p=>fs.readFileSync(p,'utf8'),json=p=>JSON.parse(read(p));
const records=json('src/data/listings.json'),baseline=json('tests/fixtures/listing-publication-20261103.json');
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const decode=s=>s.replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');
const text=s=>decode(s.replace(/<script\b[\s\S]*?<\/script>/gi,'').replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<[^>]*>/g,' ')).replace(/\s+/g,' ').trim();
const forbidden=/информация предоставлена владельцем|со слов собственника|по заявлению пользователя|независимую проверку|автоматически сгенерирован|данные получены из JSON|publicationApproval|descriptionOriginal|verifiedBy|undefined|\bNaN\b|\bnull\b/iu;
test('all 37 IDs, images, original facts and source update dates survive approval',()=>{
  assert.equal(records.length,37);assert.deepEqual(records.map(x=>x.id),baseline.ids);
  assert.equal(hash(records.map(x=>({id:x.id,image:x.image,gallery:x.gallery}))),baseline.imagesHash);
  assert.equal(hash(records.map(({description,features,verifiedAt,verifiedBy,statusLabel,pageUpdatedAt,publicationApproval,contentIssues,descriptionOriginal,featuresOriginal,...x})=>x)),baseline.factsHash);
});
test('all 37 static listings have coherent status, description, metadata, links and graph',()=>{
  const titles=new Set(),meta=new Set(),descriptions=new Set(),sitemap=read('dist/sitemap.xml');
  const publicData=json('dist/assets/data/listings.json'),config=json('site.config.json');
  assert.equal(publicData.length,37);
  for(const r of records){
    assert.equal(r.status,'available',r.id);assert.equal(r.statusLabel,'Актуально',r.id);
    assert.equal(r.publicationApproval.basis,'owner-decision',r.id);assert.ok(r.verifiedAt&&r.verifiedBy,r.id);
    assert.ok(r.description?.length>30,r.id);assert.ok(!descriptions.has(r.description),r.id);descriptions.add(r.description);
    const html=read('dist/listings/'+r.id+'.html'),main=text(html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1]);
    assert.match(main,/Актуально/u,r.id);assert.doesNotMatch(main,forbidden,r.id);
    assert.equal((html.match(/<h1\b/gu)||[]).length,1,r.id);assert.match(html,/name="robots" content="index,follow"/u,r.id);
    const title=decode(html.match(/<title>(.*?)<\/title>/s)[1]),description=decode(html.match(/name="description" content="([^"]+)"/)[1]);
    assert.ok(title.length>10&&description.length>30,r.id);assert.ok(!titles.has(title),r.id+' duplicate title');titles.add(title);
    assert.ok(!meta.has(description),r.id+' duplicate meta');meta.add(description);
    const url=config.productionOrigin+'/listings/'+r.id+'.html';
    assert.ok(html.includes('rel="canonical" href="'+url+'"'),r.id);assert.ok(sitemap.includes('<loc>'+url+'</loc>'),r.id);
    assert.ok(html.includes('href="'+config.phoneHref+'"'),r.id);
    const nodes=[...html.matchAll(/type="application\/ld\+json">([\s\S]*?)<\/script>/g)].flatMap(m=>JSON.parse(m[1])['@graph']||[]);
    const listing=nodes.find(n=>n['@type']==='RealEstateListing'),offer=nodes.find(n=>n['@type']==='Offer');
    assert.ok(listing&&offer,r.id);assert.equal(offer.price,r.price,r.id);assert.equal(offer.itemOffered['@type'],r.type==='land'?'Place':r.type.startsWith('apartment')?'Apartment':'House',r.id);
    const item=publicData.find(x=>x.id===r.id);assert.deepEqual(item,publicListing(r,publicCopy),r.id);
    assert.ok(main.includes(item.description.replace(/\s+/g,' ').trim()),r.id+' static description');
    assert.equal(offer.itemOffered.description,item.description,r.id);
    for(const key of ['verifiedAt','verifiedBy','publicationApproval','descriptionOriginal','featuresOriginal','contentIssues','provenance','source'])assert.equal(item[key],undefined,r.id+' private '+key);
  }
});
test('conflicting kitchen dimensions are retained only in internal evidence',()=>{
  const r=records.find(x=>x.id==='shk-a16-2k-50-individual');
  assert.deepEqual(r.contentIssues[0].values,[7,7.5]);assert.match(r.descriptionOriginal,/7,5 м².*7 м²/u);
  assert.equal(listingFacts(r).kitchen,null);
  assert.doesNotMatch(text(read('dist/listings/'+r.id+'.html')),/7–7,5 м²|площадь кухни 7|кухня 7[ ,]/iu);
});
