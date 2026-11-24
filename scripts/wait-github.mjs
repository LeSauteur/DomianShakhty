import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const exec=promisify(execFile);
export async function waitGitHub({kind,pr,sha,run=async args=>(await exec('gh',args,{timeout:25*60e3,maxBuffer:8e6})).stdout,sleep=ms=>new Promise(r=>setTimeout(r,ms))}) {
 if(kind==='checks') {if(!/^\d+$/.test(String(pr)))throw Error('Укажите PR');return await run(['pr','checks',String(pr),'--watch','--interval','10']);}
 if(kind!=='deploy'||!/^[a-f0-9]{40}$/.test(sha||''))throw Error('deploy требует полный merge SHA');
 for(let attempt=0;attempt<10;attempt++) {
   const rows=JSON.parse(await run(['run','list','--workflow','pages.yml','--commit',sha,'--branch','main','--event','push','--limit','5','--json','databaseId,headSha,status,conclusion']));
   const match=rows.find(x=>x.headSha===sha);if(match){await run(['run','watch',String(match.databaseId),'--exit-status','--interval','30']);return JSON.stringify({run:match.databaseId,sha,status:'success'});}
   if(attempt<9)await sleep(60000);
 }
 throw Error('Deployment для merge SHA не появился за 10 минут; автоматический повтор публикации запрещён');
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
 const [kind,value]=process.argv.slice(2);fs.mkdirSync('artifacts',{recursive:true});const log=`artifacts/github-${kind}.log`;
 console.log(`Ожидаю ${kind}. Подробный вывод: ${log}. Отдельные опросы gh не нужны.`);
 try {const result=await waitGitHub({kind,pr:value,sha:value});fs.writeFileSync(log,result);console.log(`${kind}: успешно`);}
 catch(e){fs.writeFileSync(log,String(e.stdout||'')+String(e.stderr||'')+e.message);console.error(`${kind}: ошибка, см. ${log}`);process.exitCode=1;}
}
