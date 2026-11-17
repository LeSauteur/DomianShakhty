import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import qrcode from 'qrcode-generator';
import { promoModel, promoFormats } from './promo.mjs';

const xml = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const ink = '#29383a', paper = '#f7f9f7', muted = '#586966', gold = '#c7a66a';
const approximateWidth = (value, size) => [...value].reduce((sum, letter) => sum + (/\s/u.test(letter) ? .29 : /[iIl1.,:;!|]/u.test(letter) ? .3 : /[ЖШЩМW@]/u.test(letter) ? .88 : .57) * size, 0);
function wrap(value, width, size) {
  const words = String(value).split(/\s+/u); const lines = []; let line = '';
  for (const word of words) {
    if (line && approximateWidth(`${line} ${word}`, size) > width) { lines.push(line); line = ''; }
    line = line ? `${line} ${word}` : word;
  }
  if (line) lines.push(line);
  return lines;
}
function text(value, x, y, width, size, { color = ink, family = 'Arial, sans-serif', weight = 400, maxLines = 1, minSize = size } = {}) {
  let lines;
  do { lines = wrap(value, width, size); if (lines.length <= maxLines || size <= minSize) break; size -= 2; } while (true);
  if (lines.length > maxLines) { lines = lines.slice(0, maxLines); lines[maxLines - 1] = lines[maxLines - 1].replace(/\s+\S*$/u, '') + '…'; }
  return `<text fill="${color}" font-family="${family}" font-size="${size}" font-weight="${weight}">${lines.map((line, index) => `<tspan x="${x}" y="${y + index * size * 1.19}">${xml(line)}</tspan>`).join('')}</text>`;
}
export function qrSvg(target, size = 512) {
  const qr = qrcode(0, 'M'); qr.addData(target, 'Byte'); qr.make();
  const modules = qr.getModuleCount(), quiet = 4, total = modules + quiet * 2;
  let blocks = '';
  for (let y = 0; y < modules; y++) for (let x = 0; x < modules; x++) if (qr.isDark(y, x)) blocks += `M${x + quiet},${y + quiet}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="white"/><path d="${blocks}" fill="#111"/></svg>`;
}
function overlaySvg(model, format, logo, qr) {
  const { width, height, photo: p } = promoFormats[format]; const story = format === 'story';
  const band = story ? 1136 : 650;
  const titleY = story ? 1350 : 856;
  const factsY = story ? 1500 : 1004;
  const agentY = story ? 1730 : 1220;
  const qrY = story ? 1644 : 1122;
  const qrSize = story ? 216 : 174;
  const logoBody = logo.replace(/^<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
  const qrBody = qr.replace(/^<svg[^>]*>/u, '').replace(/<\/svg>\s*$/u, '');
  const qrViewBox = qr.match(/viewBox="([^"]+)"/u)[1];
  const features = model.features.slice(0, 2);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs><mask id="photo"><rect width="1080" height="${height}" fill="white"/><rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rx="28" fill="black"/></mask></defs>
  <rect width="1080" height="${height}" fill="${paper}" mask="url(#photo)"/>
  <svg x="56" y="51" width="62" height="66" viewBox="0 0 269.2 281.0">${logoBody}</svg>
  ${text('Домиан', 140, 93, 390, 48, { weight: 700 })}
  ${text('ШАХТЫ · МАЯКОВСКОГО 18А', 143, 126, 560, 20, { color: muted, weight: 600 })}
  ${text(model.type.toUpperCase(), 660, 83, 360, 23, { weight: 600, maxLines: 2, minSize: 19 })}
  ${text(model.agentName || 'НЕДВИЖИМОСТЬ РЯДОМ', 660, 133, 360, 18, { color: muted })}
  <rect x="56" y="${band}" width="968" height="${story ? 156 : 136}" rx="22" fill="${ink}"/>
  <rect x="56" y="${band + 28}" width="5" height="${story ? 98 : 80}" rx="2" fill="${gold}"/>
  ${text(model.price, 92, band + (story ? 103 : 91), 890, story ? 86 : 78, { color: '#fffefd', weight: 600, minSize: 56 })}
  ${text(model.title, 56, titleY, 968, story ? 54 : 44, { family: 'Georgia, serif', maxLines: 2, minSize: 34 })}
  ${text(model.location, 58, story ? 1459 : 950, 960, 25, { color: muted, minSize: 20, maxLines: 1 })}
  ${model.facts.map((fact, index) => `<rect x="${56 + index * 320}" y="${factsY - 32}" width="${Math.min(300, 968 / Math.max(1, model.facts.length) - 20)}" height="58" rx="15" fill="#e8f0ed"/>${text(fact, 76 + index * 320, factsY + 7, 270, 30, { weight: 600 })}`).join('')}
  ${features.map((feature, index) => `<circle cx="64" cy="${factsY + 72 + index * 39}" r="4" fill="${gold}"/>${text(feature, 82, factsY + 80 + index * 39, 925, 25, { minSize: 21 })}`).join('')}
  <path d="M56 ${story ? 1650 : 1150}H${story ? 760 : 790}" stroke="#ced8d4"/>
  ${text('АДМИНИСТРАТОР', 56, agentY - (story ? 53 : 45), 720, 19, { color: muted, weight: 600 })}
  ${text(model.contact.name, 56, agentY, story ? 720 : 745, story ? 38 : 32, { maxLines: 1, minSize: 24, weight: 600 })}
  ${text(model.contact.phone, 56, agentY + (story ? 66 : 48), 740, story ? 45 : 38, { weight: 600, minSize: 30 })}
  ${text(model.displayUrl, 56, height - (story ? 58 : 36), 690, 24, { color: muted })}
  <svg x="${1024 - qrSize}" y="${qrY}" width="${qrSize}" height="${qrSize}" viewBox="${qrViewBox}" shape-rendering="crispEdges">${qrBody}</svg>
  ${text('ФОТО И ПОДРОБНОСТИ', 1024 - qrSize - 4, qrY + qrSize + 28, qrSize + 12, 15, { color: muted })}
  </svg>`;
}

export async function buildPromoAssets(ctx, root, dist, listings) {
  const logo = fs.readFileSync(path.join(root, 'assets/brand/domian-d.svg'), 'utf8');
  const renderer = fs.readFileSync(new URL('./promo-render.mjs', import.meta.url));
  const result = new Map(); const keys = new Set();
  for (const item of listings.filter(value => value.verified === true)) {
    const model = promoModel(ctx, item);
    const shortPath = model.displayUrl;
    if (keys.has(shortPath)) throw new Error(`Duplicate promo short link: ${shortPath}`);
    keys.add(shortPath);
    for (const image of model.photos) {
      const resolved = path.resolve(root, image.src);
      if (!resolved.startsWith(path.resolve(root, 'assets/images') + path.sep) || !fs.existsSync(resolved)) throw new Error(`Invalid listing photo: ${image.src}`);
      const actual = await sharp(resolved).metadata(); image.width = actual.width; image.height = actual.height;
    }
    const cover = model.photos[0];
    const hash = createHash('sha256').update(renderer).update(logo).update(JSON.stringify(model));
    if (cover) hash.update(fs.readFileSync(path.join(root, cover.src)));
    const version = hash.digest('hex').slice(0, 14);
    const relative = `assets/promo/${model.id}/${version}`;
    const cache = path.join(root, '.promo-cache', model.id, version); fs.mkdirSync(cache, { recursive: true });
    const qr = qrSvg(model.qrTarget);
    if (!fs.existsSync(path.join(cache, 'manifest.json'))) {
      await sharp(Buffer.from(qr)).png().toFile(path.join(cache, 'qr.png'));
      for (const [format, dimensions] of Object.entries(promoFormats)) {
        const overlay = Buffer.from(overlaySvg(model, format, logo, qr));
        await sharp(overlay).png().toFile(path.join(cache, `${format}-overlay.png`));
        const layers = [];
        if (cover) {
          const photo = await sharp(path.join(root, cover.src)).rotate().resize(dimensions.photo.width, dimensions.photo.height, { fit: 'cover', position: 'centre' }).png().toBuffer();
          layers.push({ input: photo, left: dimensions.photo.x, top: dimensions.photo.y });
        }
        layers.push({ input: overlay, left: 0, top: 0 });
        await sharp({ create: { width: dimensions.width, height: dimensions.height, channels: 3, background: '#dce7e3' } }).composite(layers).png({ compressionLevel: 8 }).toFile(path.join(cache, `${format}.png`));
      }
      fs.writeFileSync(path.join(cache, 'manifest.json'), JSON.stringify({ ...model, version, assets: Object.fromEntries(['story', 'post', 'story-overlay', 'post-overlay', 'qr'].map(key => [key, `${relative}/${key}.png`])) }, null, 2));
    }
    fs.mkdirSync(path.join(dist, relative), { recursive: true });
    fs.cpSync(cache, path.join(dist, relative), { recursive: true });
    result.set(model.id, JSON.parse(fs.readFileSync(path.join(cache, 'manifest.json'), 'utf8')));
  }
  return result;
}
