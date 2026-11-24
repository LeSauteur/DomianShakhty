import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {assertPublishedInventory,assertMediaIntegrity,assertSitemapIntegrity} from './helpers/catalog-integrity.mjs';
import {publicListing} from '../src/listing-publication.mjs';
import {publicCopy} from '../src/public-copy.mjs';

function isolated(run){
 const previous=process.cwd(),root=fs.mkdtempSync(path.join(os.tmpdir(),'domian-integrity-test-'));
 const write=(p,v)=>{fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,typeof v==='string'?v:JSON.stringify(v));};
 const row={id:'shk-h01-test',verified:true,status:'available',type:'house-secondary',title:'Проверочный дом',description:'Дом для проверки целостности.',features:[],agentId:'agent',image:{src:'assets/images/listings/shk-h01-test/hero.webp',width:120,height:80}};
 try{
  process.chdir(root);
  write('site.config.json',{productionOrigin:'https://example.test'});
  write('src/data/listings.json',[row]);write('src/data/team.json',[{id:'agent',verified:true}]);
  write('src/data/listing-media-manifest.json',[{id:row.id,status:'done',files:['hero.webp']}]);
  write(row.image.src,'photo');write('dist/assets/data/listings.json',[publicListing(row,publicCopy)]);
  const routes=['/','/listings/'+row.id+'.html','/team/agent.html'];
  for(const route of routes)write('dist'+(route==='/'?'/index.html':route),`<meta name="robots" content="index,follow"><link rel="canonical" href="https://example.test${route}">`);
  write('dist/sitemap.xml','<urlset>'+routes.map(r=>`<url><loc>https://example.test${r}</loc></url>`).join('')+'</urlset>');
  assertPublishedInventory();assertMediaIntegrity();assertSitemapIntegrity();run({row,write});
 }finally{process.chdir(previous);assert.ok(root.startsWith(path.join(os.tmpdir(),'domian-integrity-test-')));fs.rmSync(root,{recursive:true,force:true});}
}
test('inventory integrity catches lost pages, duplicate output and broken agent references',()=>isolated(({row,write})=>{
 fs.unlinkSync('dist/listings/'+row.id+'.html');assert.throws(()=>assertPublishedInventory());write('dist/listings/'+row.id+'.html','page');
 const published=publicListing(row,publicCopy);write('dist/assets/data/listings.json',[published,published]);assert.throws(()=>assertPublishedInventory());
 write('dist/assets/data/listings.json',[published]);write('src/data/team.json',[]);assert.throws(()=>assertPublishedInventory());
}));
test('media integrity catches missing photos, missing registry entries and orphan records',()=>isolated(({row,write})=>{
 fs.unlinkSync(row.image.src);assert.throws(()=>assertMediaIntegrity());write(row.image.src,'photo');
 write('src/data/listing-media-manifest.json',[]);assert.throws(()=>assertMediaIntegrity());
 write('src/data/listing-media-manifest.json',[{id:row.id,status:'done',files:['hero.webp']},{id:'orphan',status:'done',files:[]}]);assert.throws(()=>assertMediaIntegrity());
}));
test('sitemap integrity catches missing, duplicate and ungenerated URLs',()=>isolated(({write})=>{
 const original=fs.readFileSync('dist/sitemap.xml','utf8');
 for(const changed of [original.replace(/<url>.*?<\/url>/,''),original.replace('</urlset>','<url><loc>https://example.test/ghost.html</loc></url></urlset>'),original.replace('</urlset>','<url><loc>https://example.test/</loc></url></urlset>')]){write('dist/sitemap.xml',changed);assert.throws(()=>assertSitemapIntegrity());}
}));
