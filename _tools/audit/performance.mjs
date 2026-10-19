import fs from 'node:fs';
import {gzipSync} from 'node:zlib';
import lighthouse from 'lighthouse';
import {launch} from 'chrome-launcher';
import {chromium} from '@playwright/test';
import {out,site,read,json,csv} from './lib.mjs';
const pages=read(out+'/evidence/pages.json');
const files=process.env.AUDIT_LIGHTHOUSE_FILES?process.env.AUDIT_LIGHTHOUSE_FILES.split('|'):['index.html','houses.html','apartments.html','lands.html',pages.find(p=>p.type==='listing').file,pages.find(p=>p.type==='construction-project').file,'zhk-aleksandrovskiy-park.html','locations/kamenolomni.html','kadastrovye-raboty.html',pages.find(p=>p.type==='guide').file,'contacts.html','services.html'];
fs.mkdirSync(out+'/evidence/lighthouse',{recursive:true});const rows=[];
const chrome=await launch({chromePath:chromium.executablePath(),chromeFlags:['--headless','--no-sandbox','--disable-gpu']});
try{for(const file of files){const url=site.productionOrigin+'/'+(file==='index.html'?'':file),row={file,url};try{const {lhr}=await lighthouse(url,{port:chrome.port,output:'json',logLevel:'error',onlyCategories:['performance'],formFactor:'mobile'});fs.writeFileSync(out+'/evidence/lighthouse/'+file.replaceAll('/','__')+'.json.gz',gzipSync(JSON.stringify(lhr)));const a=lhr.audits;Object.assign(row,{performance:Math.round(lhr.categories.performance.score*100),lcp:a['largest-contentful-paint'].numericValue,cls:a['cumulative-layout-shift'].numericValue,tbt:a['total-blocking-time'].numericValue,bytes:a['total-byte-weight'].numericValue,requests:a['network-requests'].details.items.length,fetchTime:lhr.fetchTime,version:lhr.lighthouseVersion,warnings:lhr.runWarnings,runtimeError:lhr.runtimeError});}catch(e){row.error=String(e)}rows.push(row);json('evidence/performance.json',rows);console.log(row);}}finally{try { await chrome.kill(); } catch(e) { console.log('Chrome cleanup:',e.code); }}
csv('performance.csv',['url','Performance','LCP_ms','CLS','TBT_ms','bytes','requests','checked_utc','error'],rows.map(r=>[r.url,r.performance,r.lcp,r.cls,r.tbt,r.bytes,r.requests,r.fetchTime,r.error||r.runtimeError?.message]));
process.exit(0);
