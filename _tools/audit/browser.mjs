import fs from 'node:fs';
import {chromium} from '@playwright/test';
import {out,read,json,csv} from './lib.mjs';
const pages=read(out+'/evidence/pages.json'), base='http://127.0.0.1:4186/';
const browser=await chromium.launch({headless:true});
const axe=fs.readFileSync('_tools/audit/runtime/node_modules/axe-core/axe.min.js','utf8');
fs.mkdirSync(out+'/screenshots',{recursive:true});fs.mkdirSync(out+'/evidence/browser',{recursive:true});
const representatives=new Map();for(const p of pages)if(!representatives.has(p.type))representatives.set(p.type,p.file);
representatives.set('catalog','apartments.html');representatives.set('service','kadastrovye-raboty.html');
let jobs=pages.flatMap(p=>[390,768,1440].map(width=>({p,width})));if(process.env.AUDIT_RESUME==='1')jobs=jobs.filter(({p,width})=>{const f=out+`/evidence/browser/${p.file.replaceAll('/','__')}-${width}.json`;if(!fs.existsSync(f))return true;const r=read(f);return r.exception||(width!==768&&!r.axe);});if(process.env.AUDIT_OCCLUSION==='1')jobs=jobs.filter(({p,width})=>read(out+`/evidence/browser/${p.file.replaceAll('/','__')}-${width}.json`).dom?.occluded.length);let cursor=0,done=0;
async function worker(){const context=await browser.newContext({reducedMotion:'reduce',deviceScaleFactor:1});
 await context.route('https://api.web3forms.com/**',r=>r.fulfill({status:503,contentType:'application/json',body:'{"success":false,"audit":true}'}));
 const page=await context.newPage();page.setDefaultTimeout(15000);
 for(;;){const job=jobs[cursor++];if(!job)break;const {p,width}=job;const previous=process.env.AUDIT_OCCLUSION==='1'?read(out+`/evidence/browser/${p.file.replaceAll('/','__')}-${width}.json`):{};const record={...previous,file:p.file,url:p.url,width,errors:[],failed:[],httpErrors:[]};
 const onConsole=m=>{if(m.type()==='error')record.errors.push(m.text())},onError=e=>record.errors.push(e.message),onFailed=r=>record.failed.push({url:r.url(),error:r.failure()?.errorText}),onResponse=r=>{if(r.status()>=400)record.httpErrors.push({url:r.url(),status:r.status()})};
 page.on('console',onConsole);page.on('pageerror',onError);page.on('requestfailed',onFailed);page.on('response',onResponse);
 try{await page.setViewportSize({width,height:width===390?844:width===768?1024:900});
  const response=await page.goto(base+p.file,{waitUntil:'load',timeout:25000});record.status=response?.status();await page.waitForTimeout(80);
  if(p.refresh)await page.waitForURL(u=>!u.pathname.endsWith('/'+p.file),{timeout:5000});record.finalUrl=page.url();
  await page.evaluate(async()=>{const imgs=[...document.images];imgs.forEach(i=>i.loading='eager');await Promise.all(imgs.map(i=>i.decode().catch(()=>{})));});
  record.dom=await page.evaluate(()=>{
   const visible=e=>{const d=e.closest('details:not([open])');if(d&&!e.closest('summary'))return false;if(e.closest('[hidden],[inert]'))return false;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none';};
   const selector=e=>e.id?'#'+e.id:e.tagName.toLowerCase()+(e.classList.length?'.'+[...e.classList].join('.'): '');
   const first=[...document.querySelectorAll('main h1,main .hero-actions a,header a,header button,main input,main button')].filter(e=>{const r=e.getBoundingClientRect();return visible(e)&&r.top>=0&&r.bottom<=innerHeight;});
   const occluded=first.flatMap(e=>{const r=e.getBoundingClientRect(),top=document.elementFromPoint(r.x+r.width/2,r.y+r.height/2);return top&&!e.contains(top)&&!top.contains(e)?[{selector:selector(e),by:selector(top),text:e.textContent.trim().slice(0,100)}]:[];});
   return {scrollWidth:document.documentElement.scrollWidth,clientWidth:document.documentElement.clientWidth,
    brokenImages:[...document.images].filter(i=>i.naturalWidth===0).map(i=>({src:i.currentSrc||i.src,selector:selector(i)})),
    images:[...document.images].map(i=>({src:i.currentSrc,w:i.naturalWidth,h:i.naturalHeight,renderedWidth:Math.round(i.getBoundingClientRect().width),widthAttr:i.getAttribute('width'),heightAttr:i.getAttribute('height')})),
    missingAnchors:[...document.querySelectorAll('a[href]')].flatMap(a=>{let u;try{u=new URL(a.href)}catch{return []}if(u.origin===location.origin&&u.pathname===location.pathname&&u.hash&&!document.getElementById(decodeURIComponent(u.hash.slice(1))))return [{href:a.getAttribute('href'),text:a.textContent.trim()}];return []}),occluded,
    firstScreenCTA:[...document.querySelectorAll('main a.button,main button')].filter(e=>visible(e)&&e.getBoundingClientRect().top<innerHeight).map(e=>({text:e.textContent.trim(),href:e.getAttribute('href')})),
    firstScreenPhone:[...document.querySelectorAll('a[href^="tel:"]')].some(e=>visible(e)&&e.getBoundingClientRect().top<innerHeight),
    forms:[...document.querySelectorAll('form[data-lead-form]')].map(f=>({compact:f.hasAttribute('data-lead-compact'),honeypot:!!f.elements.botcheck,consent:!!f.elements.privacy_consent,checked:f.elements.privacy_consent?.checked,required:f.elements.privacy_consent?.required,policy:!!f.querySelector('a[href$="privacy.html"]'),statusRole:f.querySelector('[data-form-status]')?.getAttribute('role'),statusLive:f.querySelector('[data-form-status]')?.getAttribute('aria-live'),labels:[...f.elements].filter(e=>e.type!=='hidden'&&e.type!=='submit'&&e.type!=='checkbox').map(e=>({name:e.name,label:e.labels?.length||0}))})),
    header:{present:!!document.querySelector('[data-site-header]')},focusRules:[...document.styleSheets].filter(s=>{try{return !!s.cssRules}catch{return false}}).flatMap(s=>[...s.cssRules].map(r=>r.cssText)).filter(t=>/focus-visible/.test(t)).slice(0,8)};
  });
  const menu=page.locator('[data-menu-toggle]');if(await menu.isVisible().catch(()=>false)){await menu.focus();await page.keyboard.press('Enter');await page.waitForTimeout(30);record.menu={open:await menu.getAttribute('aria-expanded')==='true',focusInside:await page.evaluate(()=>!!document.activeElement.closest('#mobile-drawer'))};await page.keyboard.press('Escape');record.menu.closed=await menu.getAttribute('aria-expanded')==='false';record.menu.focusReturned=await menu.evaluate(e=>e===document.activeElement);}
  if(width!==768&&!record.axe){await page.addScriptTag({content:axe});record.axe=await page.evaluate(async()=>{const r=await axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa']}});return {violations:r.violations.map(v=>({id:v.id,impact:v.impact,description:v.description,help:v.help,helpUrl:v.helpUrl,nodes:v.nodes.map(n=>({target:n.target,html:n.html,failureSummary:n.failureSummary}))})),incomplete:r.incomplete.map(v=>({id:v.id,nodes:v.nodes.length})),passes:r.passes.map(v=>v.id)};});}
  if(width!==768&&representatives.get(p.type)===p.file){await page.screenshot({path:out+`/screenshots/${p.type}-${width}.png`,fullPage:true,timeout:15000});}
 }catch(e){record.exception=String(e)}finally{page.off('console',onConsole);page.off('pageerror',onError);page.off('requestfailed',onFailed);page.off('response',onResponse);}
 fs.writeFileSync(out+`/evidence/browser/${p.file.replaceAll('/','__')}-${width}.json`,JSON.stringify(record));
 if(++done%20===0)console.log(`${done}/${jobs.length}`);
 }await context.close();}
await Promise.all(Array.from({length:Number(process.env.AUDIT_WORKERS||4)},worker));await browser.close();
const rows=fs.readdirSync(out+'/evidence/browser').filter(f=>f.endsWith('.json')).map(f=>read(out+'/evidence/browser/'+f));
csv('browser-checks.csv',['url','viewport','status','final_url','overflow','broken_images','console_errors','failed_requests','http_errors','overlap_candidates','missing_anchors','menu','exception'],rows.map(r=>[r.url,r.width,r.status,r.finalUrl,r.dom?r.dom.scrollWidth>r.dom.clientWidth:'UNK',JSON.stringify(r.dom?.brokenImages),JSON.stringify(r.errors),JSON.stringify(r.failed),JSON.stringify(r.httpErrors),JSON.stringify(r.dom?.occluded),JSON.stringify(r.dom?.missingAnchors),JSON.stringify(r.menu),r.exception]));
const groups=new Map();for(const r of rows)for(const v of r.axe?.violations||[]){const type=pages.find(p=>p.file===r.file)?.type,key=type+'|'+v.id;const g=groups.get(key)||{type,id:v.id,impact:v.impact,urls:new Set(),widths:new Set(),nodes:[],help:v.help,description:v.description,helpUrl:v.helpUrl};g.urls.add(r.url);g.widths.add(r.width);g.nodes.push(...v.nodes.map(n=>({url:r.url,...n})));groups.set(key,g);}
json('evidence/a11y-groups.json',[...groups.values()].map(g=>({...g,urls:[...g.urls],widths:[...g.widths]})));
csv('a11y.csv',['id','маркер','шаблон','правило','серьёзность_axe','страниц','viewport','url_пример','селектор','нарушение','доказательство'],[...groups.values()].map((g,i)=>['C-'+String(i+1).padStart(3,'0'),'FACT',g.type,g.id,g.impact,g.urls.size,[...g.widths].join(','),[...g.urls][0],g.nodes[0]?.target.join(' '),g.nodes[0]?.failureSummary,'evidence/browser/ + evidence/a11y-groups.json; '+g.helpUrl]));
console.log({scans:rows.length,exceptions:rows.filter(r=>r.exception).length,axe:rows.filter(r=>r.axe).length,groups:groups.size});
