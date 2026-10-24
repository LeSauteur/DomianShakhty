import fs from 'node:fs';
import path from 'node:path';
export const root=process.cwd(), out=path.join(root,'docs/audit-2026-10');
export const site=JSON.parse(fs.readFileSync('site.config.json','utf8'));
export function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
export function json(file,value){fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n');}
export function csv(file,headers,rows){fs.mkdirSync(path.dirname(path.join(out,file)),{recursive:true});const q=v=>'"'+String(v??'').replaceAll('"','""')+'"';fs.writeFileSync(path.join(out,file),'\ufeff'+[headers,...rows].map(r=>r.map(q).join(';')).join('\n')+'\n');}
export function md(file,text){fs.writeFileSync(path.join(out,file),text);}
export const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
export function progress(letter,checked,count,unknown){fs.appendFileSync(path.join(out,'PROGRESS.md'),`\n${letter} — проверено: ${checked}\n${letter} — находок: ${count}\n${letter} — не удалось / UNK: ${unknown}\n`);}
