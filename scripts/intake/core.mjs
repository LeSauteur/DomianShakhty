import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { unzipSync } from 'fflate';
import sharp from 'sharp';
import Ajv from 'ajv/dist/2020.js';
import formats from 'ajv-formats';

export const json = p => JSON.parse(fs.readFileSync(p, 'utf8'));
export const hash = value => createHash('sha256').update(value).digest('hex');
const encode = x => Buffer.from(JSON.stringify(x, null, 2) + '\n');
const assert = (ok, message) => { if (!ok) throw Error(message); };
const norm = s => String(s || '').normalize('NFKC').toLowerCase().replaceAll('ё','е').replace(/[^\p{L}\p{N}]/gu,'');
export function slug(s) {
  const chars = 'абвгдеёжзийклмнопрстуфхцчшщъыьэюя';
  const to = ['a','b','v','g','d','e','e','zh','z','i','y','k','l','m','n','o','p','r','s','t','u','f','kh','ts','ch','sh','shch','','y','','e','yu','ya'];
  return String(s).toLowerCase().split('').map(c=>chars.includes(c)?to[chars.indexOf(c)]:c).join('').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
}
export function price(value) {
  if (value == null || value === '') return undefined;
  if (typeof value === 'number') { assert(Number.isSafeInteger(value) && value > 0, 'Цена: целое число рублей'); return value; }
  const s = String(value).trim().replace(/[\s₽]/gu,'').replace(',','.');
  const m = s.match(/^(\d+(?:\.\d+)?)(млн|миллиона?|тыс|руб\.?|р\.?)?$/iu);
  assert(m, `Непонятная цена: ${value}`);
  assert(m[2] || !s.includes('.'), 'Для дробной цены укажите единицу: 6,3 млн');
  const n = Number(m[1]) * (/^м/i.test(m[2] || '') ? 1e6 : /^тыс/i.test(m[2] || '') ? 1e3 : 1);
  assert(Number.isSafeInteger(n) && n > 0, 'Недопустимая цена'); return n;
}
export function archivePhotos(buffer) {
  assert(buffer.length <= 200e6, 'ZIP превышает 200 MB');
  let total = 0, count = 0;
  const files = unzipSync(buffer, {filter: entry => {
    const n = entry.name.replaceAll('\\','/');
    assert(!n.startsWith('/') && !/^[a-z]:/i.test(n) && !n.split('/').includes('..') && !n.includes('\0'), 'Небезопасный путь ZIP');
    assert(entry.originalSize <= 40e6 && (total += entry.originalSize) <= 500e6 && ++count <= 500, 'ZIP превышает лимит распаковки');
    return /\.(jpe?g|png|webp)$/i.test(n) && !n.includes('__MACOSX/');
  }});
  const out = new Map();
  for (const [n, b] of Object.entries(files)) { const name = path.posix.basename(n.replaceAll('\\','/')); assert(!out.has(name.toLowerCase()), 'Повтор имени файла ZIP'); out.set(name.toLowerCase(), {name, bytes:Buffer.from(b)}); }
  assert(out.size, 'В ZIP нет фотографий'); return [...out.values()];
}
function readPhotos(spec, base) {
  assert(Boolean(spec.archive) !== Boolean(spec.directory), 'Укажите archive либо directory');
  let files;
  if (spec.archive) files = archivePhotos(fs.readFileSync(path.resolve(base,spec.archive)));
  else {
    const dir = fs.realpathSync(path.resolve(base,spec.directory));
    files = fs.readdirSync(dir).filter(n=>/\.(jpe?g|png|webp)$/i.test(n)).map(name=>{const p=path.join(dir,name); assert(fs.lstatSync(p).isFile() && !fs.lstatSync(p).isSymbolicLink(), 'Фото должно быть обычным файлом'); return {name,bytes:fs.readFileSync(p)};});
  }
  const names = spec.order || files.map(f=>f.name).sort((a,b)=>a.localeCompare(b,'en',{numeric:true}));
  assert(names.length === files.length && new Set(names).size === names.length, 'order должен содержать все фото ровно один раз');
  const ordered = names.map(n=>{const f=files.find(f=>f.name===n);assert(f,`Фото не найдено: ${n}`);return f;});
  assert(ordered.length && ordered.length<=100, 'Требуется от 1 до 100 фото');
  if (spec.cover) { const i=ordered.findIndex(f=>f.name===spec.cover); assert(i>=0,'Обложки нет в фото'); ordered.unshift(...ordered.splice(i,1)); }
  return ordered;
}
function snapshot(root) {
  const out = {};
  for (const rel of ['src/data/listings.json','src/data/team.json','src/data/listing-media-manifest.json','site.config.json']) {
    assert(!fs.lstatSync(path.join(root,rel)).isSymbolicLink(),'Данные каталога не должны быть символическими ссылками');
    out[rel]=hash(fs.readFileSync(path.join(root,rel)));
  }
  const rows = [...json(path.join(root,'src/data/listings.json')), ...json(path.join(root,'src/data/team.json'))];
  for (const r of rows) for (const image of [r.image,...r.gallery||[]].filter(Boolean)) for (const rel of [image.src,image.original,image.fallback,...(image.srcset||[]).map(x=>x.src)].filter(Boolean)) {
    assert(!path.isAbsolute(rel) && !rel.split(/[\\/]/).includes('..'), 'Небезопасный путь в каталоге');
    out[rel]=hash(fs.readFileSync(path.join(root,rel)));
  }
  for(const m of json(path.join(root,'src/data/listing-media-manifest.json')))for(const name of m.files||[]){
    assert(/^[a-z0-9-]+$/.test(m.id) && path.basename(name)===name && !name.includes('\\'),'Небезопасный путь медиареестра');
    const rel=`assets/images/listings/${m.id}/${name}`;out[rel]=hash(fs.readFileSync(path.join(root,rel)));
  }
  return out;
}
export function validateIntegrity(root, listings, team, manifest) {
  for (const rows of [listings,team,manifest]) assert(new Set(rows.map(x=>x.id)).size===rows.length, 'Повтор ID в каталоге/команде/медиареестре');
  const agents = new Set(team.map(x=>x.id));
  for(const r of listings) {
    assert(!r.agentId || agents.has(r.agentId), `Неизвестный agentId: ${r.id}`);
    const photos=[r.image,...r.gallery||[]].filter(Boolean);
    for (const p of photos) assert(p.src && p.width>0 && p.height>0,`Некорректное фото: ${r.id}`);
    if(r.id.startsWith('shk-')) {
      const m=manifest.find(x=>x.id===r.id);assert(m?.status==='done',`Нет медиазаписи: ${r.id}`);
      const names=photos.map(x=>path.basename(x.src));
      assert(new Set(names).size===names.length && new Set(m.files).size===m.files.length && names.every(n=>m.files.includes(n)),`Медиареестр не совпадает с карточкой: ${r.id}`);
    }
  }
  for(const m of manifest) assert(listings.some(x=>x.id===m.id),`Лишняя медиазапись: ${m.id}`);
}
function nextId(rows, record) {
  const kind = /apartment/.test(record.type)?'a':/house/.test(record.type)?'h':record.type==='land'?'l':record.type==='commercial'?'c':'p';
  const max=Math.max(0,...rows.map(x=>Number(x.id.match(new RegExp(`^shk-${kind}(\\d+)`))?.[1]||0)));
  return `shk-${kind}${String(max+1).padStart(2,'0')}-${slug(record.address || record.title).slice(0,65)}`;
}
export async function prepareBatch(root, batchFile) {
  root=fs.realpathSync(root);const base=path.dirname(path.resolve(batchFile)),batch=json(batchFile);
  assert(batch.version===1 && /^[a-z0-9-]+$/.test(batch.id), 'Требуются version:1 и безопасный id партии');
  assert(Array.isArray(batch.listings||[]) && Array.isArray(batch.agents||[]), 'listings/agents должны быть массивами');
  assert((batch.listings?.length||0)+(batch.agents?.length||0)>0,'Пустая партия');
  const baseline=snapshot(root), listings=json(path.join(root,'src/data/listings.json')),team=json(path.join(root,'src/data/team.json')),manifest=json(path.join(root,'src/data/listing-media-manifest.json'));
  validateIntegrity(root,listings,team,manifest);
  const original={listings:structuredClone(listings),team:structuredClone(team),manifest:structuredClone(manifest)};
  const ajv=new Ajv({allErrors:true,strict:false});formats(ajv);const validate=ajv.compile(json(path.join(root,'src/data/listing.schema.json')));
  const files=new Map(), added=[],warnings=[],sources=[];
  const ledgerDir=path.join(root,'docs/intake');
  const ledgers=fs.existsSync(ledgerDir)?fs.readdirSync(ledgerDir).filter(n=>n.endsWith('.json')).map(n=>json(path.join(ledgerDir,n))):[];
  assert(!fs.existsSync(path.join(ledgerDir,batch.id+'.json')), 'Эта партия уже применена');
  const date=batch.approval?.date;assert(/^\d{4}-\d{2}-\d{2}$/.test(date||'') && !Number.isNaN(Date.parse(date)) && new Date(date).toISOString().slice(0,10)===date, 'Укажите дату approval.date');
  for (const entry of batch.agents||[]) {
    const r=structuredClone(entry.record);r.id ||= slug(r.shortName||r.name);r.slug ||= r.id;
    assert(/^[a-z0-9-]+$/.test(r.id) && r.slug===r.id,'Недопустимый ID/slug агента');
    assert(!team.some(x=>x.id===r.id || norm(x.name)===norm(r.name) || x.phoneHref===r.phoneHref), 'Агент уже существует');
    for(const k of ['name','shortName','firstName','role','lead','phone','phoneHref'])assert(typeof r[k]==='string' && r[k].trim(),`Нет поля агента ${k}`);
    assert(/^tel:\+7\d{10}$/.test(r.phoneHref),'Неверный телефон агента');
    assert(!r.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email),'Неверный email агента');
    for(const k of ['directions','skills','serviceAreas'])assert(Array.isArray(r[k]) && r[k].length,`Нет ${k} агента`);
    const input=fs.readFileSync(path.resolve(base,entry.portrait));const meta=await sharp(input).rotate().metadata();assert(meta.width && meta.height,'Неверный портрет');
    const prefix=`assets/images/${r.id}`;const ext=path.extname(entry.portrait).toLowerCase();assert(['.png','.jpg','.jpeg','.webp'].includes(ext),'Формат портрета');files.set(prefix+'-original'+ext,input);
    const orientedWidth=meta.orientation>=5&&meta.orientation<=8?meta.height:meta.width;
    const widths=[360,640,960].filter(w=>w<=orientedWidth);if(!widths.length)widths.push(orientedWidth);
    const variants=[];for(const width of widths){const {data,info}=await sharp(input).rotate().resize({width,withoutEnlargement:true}).webp({quality:85}).toBuffer({resolveWithObject:true});const src=prefix+'-'+width+'.webp';files.set(src,data);variants.push({src,width:info.width,height:info.height});}
    const fallback=variants.find(v=>v.width===640)||variants.at(-1);r.image={original:prefix+'-original'+ext,fallback:fallback.src,width:fallback.width,height:fallback.height,alt:r.name+', '+r.role,srcset:variants.map(({src,width})=>({src,width}))};r.verified=true;team.push(r);added.push({kind:'agent',id:r.id});
  }
  const existingMedia = new Map(Object.entries(baseline).filter(([n])=>n.startsWith('assets/')).map(([n,h])=>[h,n]));
  const fingerprints=new Set();
  for(const entry of batch.listings||[]) {
    const r=structuredClone(entry.record), source=entry.source;
    assert(source?.id && source.from && source.text,'Каждому объекту нужны source.id/from/text');
    const fingerprint=norm(source.from)+'|'+source.id;
    assert(!fingerprints.has(fingerprint) && !ledgers.some(l=>l.sources?.some(s=>s.fingerprint===fingerprint)), 'Письмо уже импортировано');fingerprints.add(fingerprint);
    assert(!['agentPhone','phone','phoneHref','image','gallery','verified','verifiedAt','verifiedBy'].some(k=>Object.hasOwn(r,k)), 'Контакты/фото/подтверждение объекта задаются конвейером');
    const email=source.from.match(/[\w.+-]+@[\w.-]+\.[a-z]+/i)?.[0].toLowerCase();
    const candidates=team.filter(t=>t.email?.toLowerCase()===email);
    if(!r.agentId){assert(candidates.length===1,'Укажите agentId: отправитель не сопоставлен однозначно');r.agentId=candidates[0].id;}
    assert(team.some(t=>t.id===r.agentId),'Неизвестный ответственный агент');
    if(candidates.length!==1 || candidates[0].id!==r.agentId)assert(entry.agentAssignmentNote?.trim(),'Для ручной привязки требуется agentAssignmentNote из письма/уточнения пользователя');
    if(Object.hasOwn(r,'price')){const n=price(r.price);if(n===undefined)delete r.price;else r.price=n;}
    if(!r.price)warnings.push(`${r.title}: цена по запросу`);
    r.id ||= nextId(listings,r);assert(/^[a-z0-9-]+$/.test(r.id),'Небезопасный ID');assert(!listings.some(x=>x.id===r.id),'ID уже существует');
    const address=norm(r.address);const duplicate=listings.find(x=>x.location===r.location && x.type===r.type && ((address.length>12 && address===norm(x.address) && x.area===r.area && x.landArea===r.landArea) || norm(x.title)===norm(r.title)));
    assert(!duplicate,`Возможный дубль ${duplicate?.id}: ${r.title}`);
    const photos=readPhotos(entry.media,base),images=[],photoSources=[];
    if(source.attachments) {
      assert(source.attachments.length===photos.length,'Количество фото не совпадает с письмом');
      for(const p of photos){const a=source.attachments.find(a=>a.filename===p.name);assert(a && a.size===p.bytes.length,`Фото не соответствует вложению: ${p.name}`);}
    }
    for(let i=0;i<photos.length;i++) {
      const p=photos[i];assert(p.bytes.length<=40e6,'Фото превышает 40 MB');
      const {data,info}=await sharp(p.bytes,{limitInputPixels:100e6}).rotate().resize({width:1200,height:1200,fit:'inside',withoutEnlargement:true}).webp({quality:82}).toBuffer({resolveWithObject:true});
      const h=hash(data);assert(!existingMedia.has(h),`Фото уже используется: ${existingMedia.get(h)}`);existingMedia.set(h,r.id);
      const name=i?String(i).padStart(2,'0')+'.webp':'hero.webp',src=`assets/images/listings/${r.id}/${name}`;files.set(src,data);images.push({src,alt:i?`${r.title}: фотография ${i+1}`:r.title,width:info.width,height:info.height});photoSources.push({name:p.name,outputPath:src,sourceSha256:hash(p.bytes),outputSha256:h});
    }
    Object.assign(r,{verified:true,status:r.status||'available',statusLabel:'Актуально',provenance:'office',updatedAt:date,pageUpdatedAt:date,verifiedAt:date,verifiedBy:batch.approval.note,descriptionOriginal:source.text,image:images[0],gallery:images.slice(1)});
    assert(validate(r),`${r.title}: ${ajv.errorsText(validate.errors)}`);
    assert(r.description?.trim() && r.address?.trim(),'Требуются description и address (либо явное «Адрес уточняется»)');
    listings.push(r);manifest.push({id:r.id,status:'done',files:images.map(x=>path.basename(x.src))});sources.push({fingerprint,listingId:r.id,assignedAgentId:r.agentId,agentAssignmentNote:entry.agentAssignmentNote||null,from:source.from,id:source.id,photos:photoSources});added.push({kind:'listing',id:r.id,agentId:r.agentId,price:r.price??null,photoCount:images.length});
  }
  validateIntegrity(root,listings,team,manifest);
  assert(JSON.stringify(listings.slice(0,original.listings.length))===JSON.stringify(original.listings) && JSON.stringify(team.slice(0,original.team.length))===JSON.stringify(original.team) && JSON.stringify(manifest.slice(0,original.manifest.length))===JSON.stringify(original.manifest),'Изменены прежние записи');
  const audit={version:1,batchId:batch.id,approval:batch.approval,sources,added};
  for(const [p,rows] of [['src/data/listings.json',listings],['src/data/team.json',team],['src/data/listing-media-manifest.json',manifest]])if(JSON.stringify(rows)!==JSON.stringify(p.includes('listings.json')?original.listings:p.includes('team.json')?original.team:original.manifest))files.set(p,encode(rows));
  files.set(`docs/intake/${batch.id}.json`,encode(audit));
  const token=hash(JSON.stringify({baseline,files:[...files].map(([p,b])=>[p,hash(b)])}));
  return {root,batch,baseline,files,token,report:{batchId:batch.id,token,added,warnings,changedFiles:[...files.keys()],preservedListings:original.listings.length,preservedAgents:original.team.length}};
}
export function applyPrepared(plan, token, beforeCommit=()=>{}) {
  const {root,batch,files,baseline}=plan;
  assert(batch.approval?.confirmed===true && batch.approval.note?.trim(), 'Нужно явное подтверждение пользователя в approval.confirmed/note');
  assert(token===plan.token,'План изменился: повторите dry-run и проверьте новый token');
  const lock=path.join(root,'.intake.lock'),journal=path.join(root,'.intake-transaction.json');assert(!fs.existsSync(journal),'Незавершённая транзакция: проверьте .intake-transaction.json');
  const fd=fs.openSync(lock,'wx'),backups=new Map(),written=[],stages=[];const temp=fs.mkdtempSync(path.join(os.tmpdir(),'domian-intake-'));
  try {
    fs.writeFileSync(fd,encode({pid:process.pid,batchId:batch.id,startedAt:new Date().toISOString()}));
    assert(JSON.stringify(snapshot(root))===JSON.stringify(baseline),'Каталог изменился после dry-run');
    for(const [rel,bytes] of files) {
      const target=path.join(root,rel);assert(!fs.existsSync(target)||['src/data/listings.json','src/data/team.json','src/data/listing-media-manifest.json'].includes(rel),`Файл уже существует: ${rel}`);
      backups.set(rel,fs.existsSync(target)?fs.readFileSync(target):null);const stage=path.join(temp,rel);fs.mkdirSync(path.dirname(stage),{recursive:true});fs.writeFileSync(stage,bytes);
    }
    fs.writeFileSync(journal,encode({batchId:batch.id,files:[...backups].map(([rel,bytes])=>({rel,original:bytes?.toString('base64')??null}))}),{flag:'wx'});
    beforeCommit();
    assert(JSON.stringify(snapshot(root))===JSON.stringify(baseline),'Каталог изменился во время подготовки');
    for(const [rel,bytes] of files) {
      const target=path.join(root,rel);fs.mkdirSync(path.dirname(target),{recursive:true});
      assert(fs.realpathSync(path.dirname(target)).startsWith(root+path.sep),'Путь выходит из рабочей копии');
      if(backups.get(rel)===null){fs.writeFileSync(target,bytes,{flag:'wx'});written.push(rel);}
      else {const stage=target+'.intake-tmp';fs.writeFileSync(stage,bytes,{flag:'wx'});stages.push(stage);fs.renameSync(stage,target);written.push(rel);}
    }
    fs.unlinkSync(journal);
  } catch(e) {
    for(const rel of written.reverse()){const p=path.join(root,rel),b=backups.get(rel);if(b===null)fs.rmSync(p,{force:true});else fs.writeFileSync(p,b);fs.rmSync(p+'.intake-tmp',{force:true});}
    if(fs.existsSync(journal))fs.unlinkSync(journal);throw e;
  } finally {for(const p of stages)fs.rmSync(p,{force:true});fs.closeSync(fd);fs.unlinkSync(lock);fs.rmSync(temp,{recursive:true,force:true});}
  return plan.report;
}
