import fs from 'node:fs';import path from 'node:path';import assert from 'node:assert/strict';
import { publicListing } from '../../src/listing-publication.mjs';
import { publicCopy } from '../../src/public-copy.mjs';
export const sourceJson=p=>JSON.parse(fs.readFileSync(p,'utf8'));
export const inventory=()=>sourceJson('src/data/listings.json');
export const team=()=>sourceJson('src/data/team.json').filter(x=>x.verified===true);
export function assertSameIds(actual,expected,label='IDs') {assert.equal(new Set(actual).size,actual.length,`${label}: duplicates`);assert.deepEqual([...actual].sort(),[...expected].sort(),label);}
export function assertPublishedInventory() {
 const source=inventory().filter(x=>x.verified===true),built=sourceJson('dist/assets/data/listings.json');
 assert.ok(source.length,'Catalogue must not be empty');assertSameIds(built.map(x=>x.id),source.map(x=>x.id));
 for(const r of source) assert.deepEqual(built.find(x=>x.id===r.id),publicListing(r,publicCopy),r.id);
 assertSameIds(fs.readdirSync('dist/listings').filter(x=>x.endsWith('.html')).map(x=>x.slice(0,-5)),source.map(x=>x.id),'generated listing pages');
 const agents=new Set(team().map(x=>x.id));for(const r of source)assert.ok(!r.agentId||agents.has(r.agentId),r.id);
}
export function assertMediaIntegrity() {
 const listings=inventory(),manifest=sourceJson('src/data/listing-media-manifest.json');
 const managed=listings.filter(x=>x.image?.src.startsWith(`assets/images/listings/${x.id}/`));
 assertSameIds(manifest.map(x=>x.id),managed.map(x=>x.id),'media registry IDs');
 for(const r of managed){
  const m=manifest.find(x=>x.id===r.id),photos=[r.image,...r.gallery||[]],names=photos.map(x=>path.basename(x.src));
  assert.equal(m.status,'done',r.id);assert.equal(new Set(names).size,names.length,r.id);assert.equal(new Set(m.files).size,m.files.length,r.id);
  for(const name of names)assert.ok(m.files.includes(name),r.id+': '+name);
  // Old covers are intentionally retained after replacement; the registry covers every stored file.
  const dir=`assets/images/listings/${r.id}`;assertSameIds(fs.readdirSync(dir).filter(n=>n.endsWith('.webp')),m.files,r.id);
  for(const p of photos){assert.ok(fs.existsSync(p.src),p.src);assert.ok(p.width>0&&p.height>0,p.src);}
 }
}
export function assertSitemapIntegrity() {
 const origin=sourceJson('site.config.json').productionOrigin;
 const actual=[...fs.readFileSync('dist/sitemap.xml','utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m=>m[1]);
 const expected=[];
 const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(e.name.endsWith('.html')){const html=fs.readFileSync(p,'utf8');if(!/<meta name="robots" content="index,follow"/u.test(html))continue;const canonical=html.match(/<link rel="canonical" href="([^"]+)"/u)?.[1];const rel=path.relative('dist',p).replaceAll('\\','/');const url=origin+(rel==='index.html'?'/':rel.endsWith('/index.html')?'/'+rel.slice(0,-10):'/'+rel);if(canonical===url)expected.push(url);}}};walk('dist');
 assertSameIds(actual,expected,'sitemap canonical pages');
 for(const r of inventory().filter(x=>x.verified))assert.ok(actual.includes(`${origin}/listings/${r.id}.html`),r.id);
 for(const r of team())assert.ok(actual.includes(`${origin}/team/${r.slug||r.id}.html`),r.id);
 assert.ok(!actual.some(x=>/\/(promo|s)\/|\/(404|thanks)\.html|\/previews\//.test(x)));
}
