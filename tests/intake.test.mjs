import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import sharp from 'sharp';import {zipSync,strToU8} from 'fflate';
import {prepareBatch,applyPrepared,archivePhotos,price,hash} from '../scripts/intake/core.mjs';
import {waitGitHub} from '../scripts/wait-github.mjs';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
async function fixture(t) {
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'intake-test-'));t.after(()=>{assert.ok(root.startsWith(path.join(os.tmpdir(),'intake-test-')));fs.rmSync(root,{recursive:true,force:true,maxRetries:3,retryDelay:100});});fs.mkdirSync(path.join(root,'src/data'),{recursive:true});
 const write=(p,x)=>{fs.mkdirSync(path.dirname(path.join(root,p)),{recursive:true});fs.writeFileSync(path.join(root,p),JSON.stringify(x));};
 for(const [p,v] of [['listings.json',[]],['team.json',[{id:'agent',name:'Агент',email:'agent@example.test'}]],['listing-media-manifest.json',[]]])write('src/data/'+p,v);
 write('src/data/listing.schema.json',JSON.parse(fs.readFileSync('src/data/listing.schema.json')));write('site.config.json',{phone:'+79188504488'});
 const image=await sharp({create:{width:120,height:80,channels:3,background:'red'}}).jpeg().toBuffer();fs.writeFileSync(path.join(root,'photos.zip'),zipSync({'photo.jpg':image}));
 const batch={version:1,id:'test-batch',approval:{confirmed:true,date:'2026-11-24',note:'User authorized publication'},listings:[{source:{id:'message-1',from:'agent@example.test',text:'Дом 50 м². Цена 2,8 млн.'},record:{type:'house-secondary',format:'secondary',title:'Дом 50 м² в Шахтах',location:'shakhty',address:'Шахты, ул. Проверочная, 1',area:50,price:'2,8 млн',description:'Дом для продажи в Шахтах.'},media:{archive:'photos.zip',cover:'photo.jpg'}}]};write('batch.json',batch);
 const digest=()=>Object.fromEntries(['src/data/listings.json','src/data/team.json','src/data/listing-media-manifest.json','site.config.json'].map(p=>[p,hash(fs.readFileSync(path.join(root,p)))]));
 return {root,write,batch,image,file:path.join(root,'batch.json'),digest};
}
test('price parser handles explicit units and refuses ambiguous decimal shorthand',()=>{assert.equal(price('6,3 млн'),6300000);assert.equal(price('6300 тыс'),6300000);assert.equal(price('6 300 000 ₽'),6300000);assert.equal(price(null),undefined);for(const v of ['6.3','abc',0,-1,1.2])assert.throws(()=>price(v));});
test('dry-run changes nothing, auto IDs and agents resolve, apply preserves baseline, retry is rejected',async t=>{const f=await fixture(t),before=f.digest(),p=await prepareBatch(f.root,f.file);assert.deepEqual(f.digest(),before);assert.equal(p.report.added[0].id,'shk-h01-shakhty-ul-proverochnaya-1');assert.equal(p.report.added[0].agentId,'agent');assert.equal(p.report.added[0].price,2800000);assert.throws(()=>applyPrepared(p,'wrong'),/План/);applyPrepared(p,p.token);const rows=JSON.parse(fs.readFileSync(path.join(f.root,'src/data/listings.json')));assert.equal(rows.length,1);assert.equal(rows[0].price,2800000);assert.equal(f.digest()['site.config.json'],before['site.config.json']);await assert.rejects(prepareBatch(f.root,f.file),/партия/);});
test('unapproved apply and changed baseline are rejected without a partial import',async t=>{const f=await fixture(t);f.batch.approval.confirmed=false;f.write('batch.json',f.batch);const p=await prepareBatch(f.root,f.file);assert.throws(()=>applyPrepared(p,p.token),/подтверждение/);f.batch.approval.confirmed=true;f.write('batch.json',f.batch);const q=await prepareBatch(f.root,f.file);f.write('site.config.json',{phone:'changed'});assert.throws(()=>applyPrepared(q,q.token),/изменился/);assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,'src/data/listings.json'))),[]);});
test('unknown agent, mismatched attachments, invalid fields and duplicate content fail before mutation',async t=>{const f=await fixture(t);for(const mutate of [b=>b.listings[0].record.agentId='missing',b=>b.listings[0].source.attachments=[{filename:'wrong',size:1}],b=>b.listings[0].record.area=-10,b=>b.listings.push(structuredClone(b.listings[0]))]){const b=structuredClone(f.batch);mutate(b);f.write('batch.json',b);await assert.rejects(prepareBatch(f.root,f.file));assert.deepEqual(JSON.parse(fs.readFileSync(path.join(f.root,'src/data/listings.json'))),[]);}});
test('ZIP traversal, zip bomb metadata and duplicate basenames are blocked',()=>{assert.throws(()=>archivePhotos(zipSync({'../photo.jpg':strToU8('bad')})),/путь/);assert.throws(()=>archivePhotos(zipSync({'a/photo.jpg':strToU8('a'),'b/photo.jpg':strToU8('b')})),/Повтор/);const bomb=zipSync({'photo.jpg':strToU8('x')});const dv=new DataView(bomb.buffer);for(let i=0;i<bomb.length-28;i++)if(dv.getUint32(i,true)===0x02014b50)dv.setUint32(i+24,600e6,true);assert.throws(()=>archivePhotos(bomb),/лимит/);});
test('duplicate address and re-encoded photos are rejected even with different source IDs',async t=>{const f=await fixture(t);const p=await prepareBatch(f.root,f.file);applyPrepared(p,p.token);const b=structuredClone(f.batch);b.id='second';b.listings[0].source.id='message-2';f.write('batch.json',b);await assert.rejects(prepareBatch(f.root,f.file),/дубль/);b.listings[0].record.address='Шахты, другая улица, 5';b.listings[0].record.title='Другой дом 50 м²';f.write('batch.json',b);await assert.rejects(prepareBatch(f.root,f.file),/Фото уже/);});
test('agent intake generates responsive portrait and can own a listing in the same batch',async t=>{const f=await fixture(t);fs.writeFileSync(path.join(f.root,'portrait.jpg'),f.image);f.batch.agents=[{portrait:'portrait.jpg',record:{name:'Тестовая Мария',shortName:'Мария Тестовая',firstName:'Мария',role:'Агент',phone:'+7 (900) 000-00-01',phoneHref:'tel:+79000000001',email:'new@example.test',lead:'Помогу с недвижимостью',directions:['Дома'],skills:['Сопровождение'],serviceAreas:['Шахты']}}];f.batch.listings[0].source.from='new@example.test';f.write('batch.json',f.batch);const p=await prepareBatch(f.root,f.file);assert.equal(p.report.added[1].agentId,'mariya-testovaya');applyPrepared(p,p.token);const team=JSON.parse(fs.readFileSync(path.join(f.root,'src/data/team.json')));assert.deepEqual(team[0],{id:'agent',name:'Агент',email:'agent@example.test'});assert.ok(fs.existsSync(path.join(f.root,team[1].image.fallback)));});
test('commit failure rolls back written files and removes lock/journal',async t=>{const f=await fixture(t),p=await prepareBatch(f.root,f.file),before=f.digest();const original=fs.renameSync;let calls=0;fs.renameSync=(...args)=>{if(++calls===2)throw Error('Injected rename failure');return original(...args);};try{assert.throws(()=>applyPrepared(p,p.token),/Injected/);}finally{fs.renameSync=original;}assert.deepEqual(f.digest(),before);assert.ok(!fs.existsSync(path.join(f.root,'.intake.lock')));assert.ok(!fs.existsSync(path.join(f.root,'.intake-transaction.json')));for(const rel of p.files.keys())if(rel.startsWith('assets/'))assert.ok(!fs.existsSync(path.join(f.root,rel)),rel);});
test('watch helper uses one long-running check and one exact-SHA deploy watch',async()=>{const calls=[];await waitGitHub({kind:'checks',pr:67,run:async a=>{calls.push(a);return 'pass';}});assert.deepEqual(calls[0],['pr','checks','67','--watch','--interval','10']);const sha='a'.repeat(40);let lists=0,sleeps=0;await waitGitHub({kind:'deploy',sha,sleep:async()=>sleeps++,run:async a=>{calls.push(a);if(a[0]==='run'&&a[1]==='list')return JSON.stringify(++lists===1?[]:[{databaseId:42,headSha:sha}]);return 'success';}});assert.equal(sleeps,1);assert.deepEqual(calls.at(-1),['run','watch','42','--exit-status','--interval','30']);});

test('collision during commit never deletes a file created by another writer',async t=>{
 const f=await fixture(t),p=await prepareBatch(f.root,f.file),before=f.digest();
 const rel=[...p.files.keys()].find(n=>n.startsWith('assets/')),file=path.join(f.root,rel);
 assert.throws(()=>applyPrepared(p,p.token,()=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'other writer');}),/EEXIST/);
 assert.equal(fs.readFileSync(file,'utf8'),'other writer');assert.deepEqual(f.digest(),before);
});

test('manual agent override requires evidence and a concurrent lock blocks apply',async t=>{
 const f=await fixture(t);f.batch.listings[0].source.from='Forwarder <forward@example.test>';f.batch.listings[0].record.agentId='agent';f.write('batch.json',f.batch);
 await assert.rejects(prepareBatch(f.root,f.file),/agentAssignmentNote/);
 f.batch.listings[0].agentAssignmentNote='В письме прямо указан агент';f.write('batch.json',f.batch);const p=await prepareBatch(f.root,f.file);
 fs.writeFileSync(path.join(f.root,'.intake.lock'),'existing process');assert.throws(()=>applyPrepared(p,p.token),/EEXIST/);
 assert.equal(fs.readFileSync(path.join(f.root,'.intake.lock'),'utf8'),'existing process');
});

test('CLI blocks main, dirty catalogues and report paths outside artifacts; clean codex branch applies',async t=>{
 const f=await fixture(t),cli=fileURLToPath(new URL('../scripts/intake.mjs',import.meta.url));
 const git=args=>execFileSync('git',args,{cwd:f.root,stdio:'pipe'});
 git(['init','-b','main']);git(['add','.']);git(['-c','core.hooksPath='+path.join(f.root,'empty-hooks'),'-c','commit.gpgSign=false','-c','user.name=Intake Test','-c','user.email=intake@example.test','commit','-m','fixture']);
 const plan=await prepareBatch(f.root,f.file),before=f.digest();
 const run=extra=>execFileSync(process.execPath,[cli,'apply','--root',f.root,'--batch',f.file,'--token',plan.token,...extra],{stdio:'pipe',encoding:'utf8'});
 const refuses=(extra,re)=>assert.throws(()=>run(extra),e=>re.test(String(e.stderr)));
 refuses([],/codex/);assert.deepEqual(f.digest(),before);git(['checkout','-b','codex/test']);
 refuses(['--out',path.join(f.root,'src/data/listings.json')],/artifacts/);assert.deepEqual(f.digest(),before);
 f.write('src/data/team.json',[{id:'agent',name:'Изменено',email:'agent@example.test'}]);refuses([],/незакоммиченные/);
 git(['checkout','--','src/data/team.json']);assert.equal(JSON.parse(run([])).mode,'applied');
});

test('EXIF portrait rotation produces correct unique responsive widths without enlargement',async t=>{
 const f=await fixture(t),portrait=await sharp({create:{width:1000,height:300,channels:3,background:'blue'}}).withMetadata({orientation:6}).jpeg().toBuffer();
 fs.writeFileSync(path.join(f.root,'portrait.jpg'),portrait);f.batch.listings=[];
 f.batch.agents=[{portrait:'portrait.jpg',record:{id:'orientation-test',name:'Тест Ориентации',shortName:'Тест Ориентации',firstName:'Тест',role:'Агент',lead:'Помощь с недвижимостью',phone:'+7 (900) 000-00-02',phoneHref:'tel:+79000000002',directions:['Дома'],skills:['Сопровождение'],serviceAreas:['Шахты']}}];f.write('batch.json',f.batch);
 const p=await prepareBatch(f.root,f.file);applyPrepared(p,p.token);const agent=JSON.parse(fs.readFileSync(path.join(f.root,'src/data/team.json'))).at(-1);
 const metadata=await sharp(fs.readFileSync(path.join(f.root,agent.image.fallback))).metadata();assert.equal(metadata.width,300);assert.equal(metadata.height,1000);assert.deepEqual(agent.image.srcset.map(x=>x.width),[300]);
});
