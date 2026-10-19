import {test,expect} from '@playwright/test';
for(const width of [390,1440]){
  test(`public cards and descriptions use agency copy at ${width}px`,async({page},testInfo)=>{
    await page.route('https://**',route=>route.fulfill({status:200,contentType:'text/plain',body:''}));
    await page.setViewportSize({width,height:950});
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const path of ['index.html','apartments.html','locations/kamenolomni.html','listings/shk-h06-city-designer-house.html','listings/shk-l01-snt-plot.html','newbuilds/dvizhenie-61.html']){
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      const text=await page.locator('body').innerText();
      expect(text,path).not.toMatch(/Объект из обзора рынка|Объект офиса|не гарант|не подтвержда|уточня(?:ет|ют)ся/iu);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),path).toBe(true);
      if(path==='index.html'){
        await expect(page.locator('#hot-offers .listing-card')).toHaveCount(6);
        await expect(page.locator('#hot-offers .listing-card__media > span')).toHaveCount(0);
        await page.locator('#hot-offers').screenshot({path:testInfo.outputPath(`c10-cards-${width}.png`)});
      }
      if(path==='listings/shk-h06-city-designer-house.html')await expect(page.locator('main')).toContainText('Тип канализации — уточните у агента');
    }
    expect(errors).toEqual([]);
  });
}
