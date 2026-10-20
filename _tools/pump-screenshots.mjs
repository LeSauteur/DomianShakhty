import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';
const out='docs/pump-2026-10';fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch();const report=[];
for(const width of [1440,375]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});const errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 for(const [name,url] of [['home','/'],['listing','/listings/shk-a05-center-renovated-1k.html'],['collection','/apartments.html?scenario=first'],['empty-catalog','/catalog.html?type=houses&district=hbk&priceMax=100000']]){
  await page.goto('http://127.0.0.1:4173'+url);await page.locator('main').waitFor();if(await page.getByRole('button',{name:'Отказаться',exact:true}).isVisible())await page.getByRole('button',{name:'Отказаться',exact:true}).click();
  await page.evaluate(async()=>{document.activeElement.blur();document.querySelectorAll("img").forEach(i=>i.loading="eager");for(let y=0;y<document.body.scrollHeight;y+=700){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,35));}window.scrollTo(0,0);await Promise.race([Promise.all([...document.images].filter(i=>i.getBoundingClientRect().width>0).map(i=>i.decode().catch(()=>{}))),new Promise(r=>setTimeout(r,3000))])});
  await page.screenshot({path:path.join(out,`${name}-${width}.jpg`),fullPage:true,type:"jpeg",quality:85,style:".skip-link{visibility:hidden!important}"});
  if(name==='home'){await page.locator('.office-discovery').screenshot({path:path.join(out,`reviews-${width}.png`),style:".site-header,.skip-link{visibility:hidden!important}"});await page.locator('.site-header').screenshot({path:path.join(out,`header-${width}.png`)});}
  if(name==='empty-catalog')await page.locator('#catalog-alert').screenshot({path:path.join(out,`notify-${width}.png`),style:'.site-header,.skip-link{visibility:hidden!important}'});
  report.push({name,width,...await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth,portrait:[...document.images].filter(i=>i.src.includes('maria-voronina')).map(i=>i.currentSrc),hero:document.querySelector('.listing-detail__media img')?.currentSrc,broken:[...document.images].filter(i=>i.getBoundingClientRect().width>0&&!i.naturalWidth).map(i=>i.src)})),errors:[...errors]});
 }
 await page.close();
}
await browser.close();fs.writeFileSync(path.join(out,'browser-report.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
