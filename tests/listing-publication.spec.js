import {test,expect} from '@playwright/test';
import fs from 'node:fs';
const records=JSON.parse(fs.readFileSync('src/data/listings.json','utf8'));
for(const width of [390,1440])test(`published apartment, house and land expose descriptions without JavaScript at ${width}`,async({browser,baseURL},info)=>{
  const context=await browser.newContext({javaScriptEnabled:false,viewport:{width,height:900}});
  const page=await context.newPage();
  await page.route('https://**',route=>route.fulfill({status:204,body:''}));
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  for(const id of ['shk-a16-2k-50-individual','shk-h03-artem-brick-house','shk-l02-budget-izhs']){
    await page.goto(baseURL+'listings/'+id+'.html');
    await expect(page.locator('h1')).toBeVisible();
    const facts=page.locator('.listing-detail__facts');await expect(facts).toContainText('Актуально');
    await expect(page.locator('main')).toContainText(records.find(x=>x.id===id).description.slice(0,80));
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const image=page.locator('.listing-detail__media img');
    await expect.poll(()=>image.evaluate(i=>i.complete&&i.naturalWidth>0)).toBe(true);
    await page.screenshot({path:info.outputPath(`${id}-${width}.png`)});
  }
  expect(errors).toEqual([]);await context.close();
});
