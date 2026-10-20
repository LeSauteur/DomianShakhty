import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {pathToFileURL} from 'node:url';import {execFileSync} from 'node:child_process';import {chromium} from '@playwright/test';
const revision='1bbcb6f';const snapshot=path.resolve('artifacts/weight-baseline');fs.mkdirSync(snapshot,{recursive:true});
const old=p=>execFileSync('git',['show',`${revision}:${p}`],{maxBuffer:8*1024*1024});
for(const p of execFileSync('git',['ls-tree','-r','--name-only',revision,'src'],{encoding:'utf8'}).trim().split(/\r?\n/u).filter(p=>p.endsWith('.mjs')||['src/data/district-map.json','src/data/district-map-geo.json'].includes(p))){const target=path.join(snapshot,p);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,old(p));}
const {createContext,renderHome}=await import(pathToFileURL(path.join(snapshot,'src/templates.mjs')));
const load=p=>JSON.parse(fs.readFileSync(p,'utf8'));const data={};
for(const [key,file] of Object.entries({locations:'locations',locationContent:'location-content',guides:'guides',pages:'pages',listings:'listings',projects:'projects',builders:'builders',team:'team',teamLife:'team-life',pricing:'pricing',showcase:'showcase',newbuilds:'newbuilds',constructionProjects:'construction-projects',rentalDraft:'rental-draft'}))data[key]=load(`src/data/${file}.json`);
data.localComplexes=fs.readdirSync('src/data/zhk').filter(f=>f.endsWith('.json')).map(f=>load('src/data/zhk/'+f));
const site=JSON.parse(old('site.config.json').toString());site.assetVersion='baseline';const html=renderHome(createContext(site,data),data.guides);
const overrides=new Map([['/',Buffer.from(html)],...['assets/css/site.css','assets/js/site.js','assets/js/form-handler.js','assets/icons/favicon.svg','favicon.ico'].map(p=>['/'+p,old(p)])]);
const mime={'.css':'text/css','.js':'text/javascript','.html':'text/html','.webp':'image/webp','.svg':'image/svg+xml','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');let body=overrides.get(url.pathname);const target=path.resolve('dist','.'+url.pathname);if(!body&&target.startsWith(path.resolve('dist')+path.sep)&&fs.existsSync(target)&&fs.statSync(target).isFile())body=fs.readFileSync(target);if(!body){res.writeHead(404);res.end();return;}res.writeHead(200,{'Content-Type':url.pathname==='/'?'text/html':mime[path.extname(url.pathname)]||'application/octet-stream','Content-Length':body.length});res.end(body);});
await new Promise(r=>server.listen(4174,'127.0.0.1',r));const browser=await chromium.launch();const report=[];
for(const width of [1440,375])for(const [name,port]of [['before',4174],['after',4173]]){
 const context=await browser.newContext({viewport:{width,height:900},reducedMotion:'reduce'});const page=await context.newPage();const responses=[];
 page.on('response',r=>{if(r.url().startsWith(`http://127.0.0.1:${port}/`))responses.push(r);});
 await page.goto(`http://127.0.0.1:${port}/`);await page.evaluate(async()=>{for(let y=0;y<document.body.scrollHeight;y+=600){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,35));}});await page.waitForTimeout(2500);
 const assets=[];for(const r of responses){try{assets.push({path:new URL(r.url()).pathname,bytes:(await r.body()).length});}catch{}}
 report.push({name,width,total:assets.reduce((n,a)=>n+a.bytes,0),assets});await context.close();
}
await browser.close();await new Promise(r=>server.close(r));fs.writeFileSync('docs/pump-2026-10/network-weight.json',JSON.stringify(report,null,2));console.log(report.map(r=>({name:r.name,width:r.width,bytes:r.total,requests:r.assets.length})));
