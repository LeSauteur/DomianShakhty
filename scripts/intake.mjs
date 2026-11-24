import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { prepareBatch,applyPrepared } from './intake/core.mjs';
const args=process.argv.slice(2), command=args[0]||'help';
const arg=name=>{const i=args.indexOf(name);return i<0?undefined:args[i+1];};
if(command==='help'||args.includes('--help'))console.log('node scripts/intake.mjs plan|apply --batch batch.json [--root ROOT] [--out report.json] [--token TOKEN]\nplan — dry-run по умолчанию; apply требует проверенный token и approval.confirmed. Git/push/публикация не запускаются.');
else try {
  if(!['plan','apply'].includes(command)||!arg('--batch'))throw Error('Укажите plan/apply и --batch');
  const root=path.resolve(arg('--root')||fileURLToPath(new URL('..',import.meta.url)));
  if(command==='apply'){
    const branch=execFileSync('git',['branch','--show-current'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    if(!branch.startsWith('codex/'))throw Error('apply разрешён только в отдельной ветке codex/, не main/HEAD');
    const dirty=execFileSync('git',['status','--porcelain','--','src/data/listings.json','src/data/team.json','src/data/listing-media-manifest.json','assets/images'],{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    if(dirty)throw Error('В каталоге/команде/фотографиях уже есть незакоммиченные изменения. Используйте чистый отдельный worktree; не накладывайте intake поверх чужой работы.');
  }
  if(arg('--out')){
    const out=path.resolve(arg('--out')),dir=path.join(fs.realpathSync(root),'artifacts');
    if(!out.startsWith(dir+path.sep))throw Error('--out разрешён только внутри artifacts/');
    let parent=path.dirname(out);while(!fs.existsSync(parent))parent=path.dirname(parent);
    const resolved=fs.realpathSync(parent);
    if(resolved!==root && resolved!==dir && !resolved.startsWith(dir+path.sep) || fs.existsSync(out)&&fs.lstatSync(out).isSymbolicLink())throw Error('Небезопасный путь отчёта');
  }
  const plan=await prepareBatch(root,path.resolve(arg('--batch')));
  if(command==='apply')applyPrepared(plan,arg('--token'));
  const report={mode:command==='plan'?'dry-run':'applied',...plan.report};
  if(arg('--out')){const out=path.resolve(arg('--out'));if(!out.startsWith(path.join(root,'artifacts')+path.sep))throw Error('--out разрешён только внутри artifacts/');fs.mkdirSync(path.dirname(out),{recursive:true});fs.writeFileSync(out,JSON.stringify(report,null,2)+'\n');}
  console.log(JSON.stringify(args.includes('--verbose')?report:{...report,changedFiles:undefined,changedFileCount:report.changedFiles.length,reportFile:arg('--out')||null},null,2));
}catch(e){console.error('Intake: '+e.message);process.exitCode=1;}
