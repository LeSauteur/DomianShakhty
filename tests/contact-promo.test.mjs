import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { promoModel } from '../src/promo.mjs';
import { createContext, renderListing } from '../src/templates.mjs';
const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const records = json('src/data/listings.json');
const site = json('site.config.json');
const data = Object.fromEntries(['team', 'locations', 'listings', 'guides', 'pages', 'projects', 'builders'].map(key => [key, json(`src/data/${key}.json`)]));
const ctx = createContext(site, data);
const manifest = id => { const folder = `dist/assets/promo/${id}`; const version = fs.readdirSync(folder)[0]; return json(`${folder}/${version}/manifest.json`); };

test('each local listing has two correctly sized images, an exact contact, and decodable QR codes', async () => {
  for (const item of records) {
    const model = manifest(item.id);
    assert.equal(model.price, Number.isFinite(item.price) ? `${item.price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу', item.id);
    assert.equal(model.canonical, `${site.productionOrigin}/listings/${item.id}.html`);
    assert.ok(fs.existsSync(`dist/promo/${item.id}.html`));
    assert.equal(model.contact.phone, site.listingContact.phone);
    assert.ok(model.photos.every(photo => [item.image, ...item.gallery || []].some(source => source?.src === photo.src)));
    for (const [format, width, height] of [['story', 1080, 1920], ['post', 1080, 1350]]) {
      const file = path.join('dist', model.assets[format]);
      const image = await sharp(file).metadata(); assert.deepEqual([image.width, image.height], [width, height], item.id);
      const qrSize = format === 'story' ? 216 : 174;
      const qrY = format === 'story' ? 1644 : 1122;
      const { data: raw, info } = await sharp(file).extract({ left: 1024 - qrSize, top: qrY, width: qrSize, height: qrSize }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      const decoded = jsQR(new Uint8ClampedArray(raw), info.width, info.height);
      assert.equal(decoded?.data, model.qrTarget, `${item.id} ${format}: QR must survive rendering`);
    }
  }
});

test('missing data and unassigned agents use central administrator fallback without changing source records', () => {
  const source = structuredClone(records[0]);
  Object.assign(source, { price: undefined, area: undefined, rooms: undefined, landArea: undefined, image: undefined, gallery: [], agentId: 'missing-person', title: 'Очень длинное название объекта '.repeat(10) });
  const before = structuredClone(source);
  const model = promoModel(ctx, source);
  assert.equal(model.price, 'Цена по запросу'); assert.equal(model.agentId, undefined);
  assert.deepEqual(model.facts, []); assert.deepEqual(model.photos, []);
  assert.equal(model.contact.phone, site.listingContact.phone); assert.deepEqual(source, before);
  assert.doesNotMatch(model.text, /undefined|NaN|null/u);
  const html = renderListing(ctx, source);
  assert.match(html, /Цена по запросу/u); assert.doesNotMatch(html, /NaN|value="undefined"/u);
  assert.match(html, /data-phone-reveal/u);
  assert.ok(html.includes(site.listingContact.phoneHref));
  assert.ok(!html.includes(site.phoneHref));
});

test('promo utility pages and short links remain outside indexation while listings have their own OG images', () => {
  const sitemap = fs.readFileSync('dist/sitemap.xml', 'utf8');
  assert.doesNotMatch(sitemap, /\/promo\/|\/s\//u);
  for (const item of records) {
    const model = manifest(item.id);
    const listing = fs.readFileSync(`dist/listings/${item.id}.html`, 'utf8');
    const promo = fs.readFileSync(`dist/promo/${item.id}.html`, 'utf8');
    assert.match(promo, /name="robots" content="noindex,follow"/u);
    assert.ok(listing.includes(`property="og:image" content="${site.productionOrigin}/${model.assets.post}"`));
    assert.ok(promo.includes('download="shakhty-'));
    const aliasPath = new URL(model.shortUrl).pathname.replace(new URL(site.productionOrigin).pathname.replace(/\/$/u, ''), '');
    const alias = fs.readFileSync(`dist${aliasPath}`, 'utf8');
    assert.ok(alias.includes(`rel="canonical" href="${model.canonical}"`));
    assert.match(alias, /data-promo-destination/u);
  }
});

test('GA4 is the only analytics transport and every new action is allowlisted', () => {
  const runtime = fs.readFileSync('dist/assets/js/site-config.js', 'utf8');
  const source = fs.readFileSync('assets/js/site.js', 'utf8');
  assert.doesNotMatch(runtime, /metrikaId/u); assert.doesNotMatch(source, /mc\.yandex|reachGoal|window\.ym/u);
  assert.ok(runtime.includes(`"ga4Id":${JSON.stringify(site.ga4Id)}`));
  for (const name of ['phone_reveal', 'phone_click', 'promo_open', 'promo_download', 'promo_copy_text', 'promo_copy_link', 'promo_qr_download']) assert.ok(source.includes(`"${name}"`));
});
