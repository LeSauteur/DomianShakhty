import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const data = JSON.parse(fs.readFileSync('src/data/listings.json', 'utf8'));
const byId = new Map(data.map(item => [item.id, item]));
const counts = { market_review: 0, office: 0 };
const patterns = {
  marketBadge: /Объект из обзора рынка/gu,
  officeBadge: /Объект офиса/gu,
  oldCaveats: /не гарант|не подтвержда|не заменя|не является|не являются|не означает|не обеща|не показывает|не подменяет|не отменяет|уточня(?:ет|ют)ся/giu
};
const files = fs.readdirSync('dist', { recursive: true }).filter(file => file.endsWith('.html'));
const rows = [];
let redirects = 0;
let verificationDocuments = 0;
for (const file of files) {
  const html = fs.readFileSync(`dist/${file}`, 'utf8');
  if (html.includes('http-equiv="refresh"')) { redirects++; continue; }
  if (!html.includes('<!doctype html>')) verificationDocuments++;
  for (const match of html.matchAll(/<article class="listing-card\b[^>]*>([\s\S]*?)<\/article>/gu)) {
    const id = match[1].match(/href="[^"\s]*\/listings\/([^/]+)\.html"/u)?.[1];
    const item = byId.get(id);
    if (item && !(item.verifiedAt && item.verifiedBy)) counts[item.provenance === 'market_review' ? 'market_review' : 'office']++;
  }
  const result = Object.fromEntries(Object.entries(patterns).map(([key, pattern]) => [key, [...html.matchAll(pattern)].length]));
  rows.push({ path: file.replaceAll('\\', '/'), ...result });
}
const changedData = execFileSync('git', ['diff', '--name-only', 'c255882', '--', 'src/data'], { encoding: 'utf8' }).trim();
const report = {
  checkedAt: '2026-10-19',
  scope: 'Все собранные HTML, включая metadata/JSON-LD. Redirect и документы верификации посчитаны отдельно.',
  canonicalAndTechnicalPages: rows.length - verificationDocuments,
  verificationDocuments,
  redirects,
  existingCardOccurrencesByDataOrigin: counts,
  counts: Object.fromEntries(Object.keys(patterns).map(key => [key, rows.reduce((sum, row) => sum + row[key], 0)])),
  pagesWithMatches: rows.filter(row => row.marketBadge || row.officeBadge || row.oldCaveats),
  sourceDataBaseline: 'c255882',
  sourceDataUnchanged: !changedData
};
fs.writeFileSync('docs/content-2026-10/c10-public-copy-review.json', `${JSON.stringify(report, null, 2)}\n`);
if (report.pagesWithMatches.length || !report.sourceDataUnchanged) throw new Error('Public copy or source preservation audit failed');
console.log(JSON.stringify(report));
