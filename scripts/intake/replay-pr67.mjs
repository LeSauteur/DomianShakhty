import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {prepareBatch,applyPrepared,json,hash} from './core.mjs';

const root=fileURLToPath(new URL('../..',import.meta.url));
const args=process.argv.slice(2), archives=args[args.indexOf('--archives')+1];
if(!args.includes('--archives')||!archives)throw Error('npm run intake:replay -- --archives <directory with 54.zip, 59.zip, _3.zip>');
const fixture=json(path.join(root,'tests/fixtures/intake-pr67.json'));
const readGit=rel=>execFileSync('git',['show',`${fixture.base}:${rel}`],{cwd:root,maxBuffer:20e6});
const data=['src/data/listings.json','src/data/team.json','src/data/listing-media-manifest.json'];
const digest=dir=>Object.fromEntries(data.map(p=>[p,hash(fs.readFileSync(path.join(dir,p)))]));
const currentBefore=digest(root), isolated=fs.mkdtempSync(path.join(os.tmpdir(),'domian-replay-pr67-'));
try {
  fs.mkdirSync(path.join(isolated,'src/data'),{recursive:true});
  for(const rel of data)fs.writeFileSync(path.join(isolated,rel),readGit(rel));
  for(const rel of ['site.config.json','src/data/listing.schema.json'])fs.copyFileSync(path.join(root,rel),path.join(isolated,rel));
  const oldListings=json(path.join(isolated,data[0])),oldTeam=json(path.join(isolated,data[1])),oldMedia=json(path.join(isolated,data[2]));
  const referenced=new Set(oldMedia.flatMap(m=>m.files.map(n=>`assets/images/listings/${m.id}/${n}`)));
  for(const r of [...oldListings,...oldTeam])for(const p of [r.image,...r.gallery||[]].filter(Boolean))for(const rel of [p.src,p.original,p.fallback,...(p.srcset||[]).map(x=>x.src)].filter(Boolean))referenced.add(rel);
  for(const rel of referenced){const to=path.join(isolated,rel);fs.mkdirSync(path.dirname(to),{recursive:true});fs.copyFileSync(path.join(root,rel),to);}
  const preservedMedia=new Map([...referenced].map(rel=>[rel,hash(fs.readFileSync(path.join(isolated,rel)))]));
  const batch={version:1,id:'replay-pr67',approval:{confirmed:true,date:'2026-11-23',note:'Изолированное воспроизведение ранее согласованной партии PR67'},listings:fixture.entries.map(({record,source,media})=>({record,source,agentAssignmentNote:"Отправитель и подпись письма: Владимир Старчак; ответственное лицо подтверждено в опубликованной партии PR67",media:{...media,archive:path.resolve(archives,media.archive)}}))};
  const batchFile=path.join(isolated,'batch.json');fs.writeFileSync(batchFile,JSON.stringify(batch));
  const before=digest(isolated),plan=await prepareBatch(isolated,batchFile);assert.deepEqual(digest(isolated),before,'dry-run mutated baseline');
  applyPrepared(plan,plan.token);
  const after=json(path.join(isolated,data[0]));assert.deepEqual(after.slice(0,oldListings.length),oldListings);
  assert.deepEqual(json(path.join(isolated,data[1])),oldTeam);
  assert.deepEqual(json(path.join(isolated,data[2])).slice(0,oldMedia.length),oldMedia);
  let photoCount=0;
  for(const entry of fixture.entries){
    const r=after.find(x=>x.id===entry.record.id);for(const [k,v] of Object.entries(entry.record))assert.deepEqual(r[k],v,`${r.id}.${k}`);
    const photos=[r.image,...r.gallery];assert.equal(photos.length,entry.expectedImages.length);
    for(let i=0;i<photos.length;i++){
      const actual=fs.readFileSync(path.join(isolated,photos[i].src));
      const expected=fs.readFileSync(path.join(root,entry.expectedImages[i].src));
      assert.equal(hash(actual),hash(expected),`${r.id}: byte-identical photo/order ${i}`);photoCount++;
    }
  }
  for(const [rel,digest] of preservedMedia)assert.equal(hash(fs.readFileSync(path.join(isolated,rel))),digest,rel);
  await assert.rejects(prepareBatch(isolated,batchFile),/партия/);
  await assert.rejects(prepareBatch(root,batchFile),/ID уже существует|дубль|Фото уже/);
  assert.deepEqual(digest(root),currentBefore,'working catalogue changed');
  const report={result:'pass',base:fixture.base,publication:'PR67',preservedListings:oldListings.length,preservedAgents:oldTeam.length,preservedMedia:preservedMedia.size,added:plan.report.added,byteIdenticalPhotos:photoCount,dryRunUnchanged:true,retryRejected:true,productionDuplicateRejected:true,currentCatalogueUnchanged:true};
  const out=path.join(root,'artifacts/replay-pr67.json');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
}finally{
  assert.ok(path.resolve(isolated).startsWith(path.resolve(os.tmpdir(),'domian-replay-pr67-')));
  fs.rmSync(isolated,{recursive:true,force:true});
}
