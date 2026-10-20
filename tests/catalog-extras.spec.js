import {test,expect} from '@playwright/test';
import fs from 'node:fs';
import {SCENARIOS,filterCatalog} from '../src/catalog-pump.mjs';
const listings=JSON.parse(fs.readFileSync('src/data/listings.json','utf8'));
test('scenario links open actual catalog selections and stay filtered after reload',async({page})=>{
 for(const s of SCENARIOS){
  await page.goto('catalog.html?scenario='+s.key);
  const ids=await page.locator('[data-product-card]:visible').evaluateAll(ns=>ns.map(n=>n.dataset.listingId));
  expect(ids.sort()).toEqual(filterCatalog(listings,{scenario:s.key}).map(i=>i.id).sort());
  await expect(page.locator('[data-product-filters] [name="scenario"]')).toHaveValue(s.key);
 }
 await page.reload();await expect(page.locator('[data-product-filters] [name="scenario"]')).toHaveValue('own-land');
});
test('district card leads to the same three HBK objects in catalog',async({page})=>{
 await page.goto('/#district=hbk');
 await page.locator('[data-district-links]').getByRole('link',{name:'Все объекты в районе'}).click();
 await expect(page).toHaveURL(/catalog\.html\?district=hbk/u);
 await expect(page.locator('[data-product-card]:visible')).toHaveCount(3);
 const ids=await page.locator('[data-product-card]:visible').evaluateAll(ns=>ns.map(n=>n.dataset.listingId));
 expect(ids.sort()).toEqual(filterCatalog(listings,{district:'hbk'}).map(i=>i.id).sort());
});
test('empty catalog offers notification; criteria and manual comment reach mocked submission',async({page})=>{
 let payload;
 await page.addInitScript(()=>{window.__notifyEvents=[];window.DOMIAN_ANALYTICS_TEST_HOOK=(name,params)=>window.__notifyEvents.push({name,params});});
 await page.route('https://api.web3forms.com/submit',async route=>{payload=route.request().postData();await route.fulfill({status:422,contentType:'application/json',body:'{"success":false}'});});
 await page.goto('catalog.html?type=houses&district=hbk&priceMax=100000');
 await expect(page.locator('[data-product-empty]')).toBeVisible();
 const form=page.locator('[data-catalog-alert]');
 await expect(form.locator('[name="property_type"]')).toHaveValue('house');
 await expect(form.locator('[name="territory"]')).toHaveValue('ХБК');
 await expect(form.locator('[name="notify_budget"]')).toHaveValue('100000');
 await form.locator('[name="notify_budget"]').fill('3500000');
 await form.locator('[name="phone"]').fill('89991234567');
 await form.locator('[name="message"]').fill('Нужен гараж.');
 await form.locator('[name="privacy_consent"]').check();
 await form.getByRole('button',{name:'Сообщить о подходящем объекте'}).click();
 await expect.poll(()=>payload||'').toContain('catalog_notify');
 expect(payload).toContain('ХБК');expect(payload).toContain('Дом');expect(payload).toContain('3 500 000 ₽');expect(payload).toContain('Нужен гараж.');
 const analytics=JSON.stringify(await page.evaluate(()=>window.__notifyEvents));expect(analytics).not.toContain("89991234567");expect(analytics).not.toContain("Нужен гараж");
 await page.locator('[data-product-filters] [name="priceMax"]').fill('5000000');
 await expect(form.locator('[name="notify_budget"]')).toHaveValue('3500000');
});
