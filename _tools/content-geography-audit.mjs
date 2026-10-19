import fs from "node:fs";
import { execFileSync } from "node:child_process";

const json = file => JSON.parse(fs.readFileSync(file, "utf8"));
const strip = value => (value || "").replace(/<[^>]*>/gu, " ").replace(/&#(\d+);/gu, (_, n) => String.fromCodePoint(Number(n))).replace(/&(?:nbsp|amp|quot|lt|gt|#39|apos);/gu, code => ({ "&nbsp;": " ", "&amp;": "&", "&quot;": '"', "&lt;": "<", "&gt;": ">", "&#39;": "'", "&apos;": "'" })[code]).replace(/\s+/gu, " ").trim();
const output = "docs/content-2026-10";
const origin = json("site.config.json").productionOrigin;
const locations = json("src/data/locations.json");
const newbuilds = json("src/data/newbuilds.json").items;
const examples = json("src/data/construction-projects.json").builtExamples;
const urls = [...fs.readFileSync("dist/sitemap.xml", "utf8").matchAll(/<loc>(.*?)<\/loc>/gu)].map(match => match[1]);
const cityPattern = /(?<![\p{L}])(?:ростове-на-дону|ростова-на-дону|ростов-на-дону|новошахтинске|новошахтинска|новошахтинск|красном сулине|красного сулина|красный сулин|каменоломнях|каменоломни|каменоломен|батайске|батайска|батайск|константиновске|константиновск|аксая|аксае|аксай|шахтах|шахты|шахт|аюте|аюта|аютинский)(?![\p{L}])/giu;
const paragraphs = new Map();
const rows = [];
const failures = [];
for (const url of urls) {
  const pathname = new URL(url).pathname.slice(1);
  const route = !pathname ? "index.html" : pathname.endsWith("/") ? `${pathname}index.html` : pathname;
  const html = fs.readFileSync(`dist/${route}`, "utf8");
  const title = strip(html.match(/<title>([\s\S]*?)<\/title>/u)?.[1]);
  const h1 = strip(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/u)?.[1]);
  const complex = newbuilds.find(item => route === `newbuilds/${item.slug}.html`);
  const location = locations.find(item => route === `locations/${item.slug}.html`);
  const example = examples.find(item => route === `construction/projects/${item.slug}.html`);
  const role = complex ? "regional_complex" : example ? "completed_portfolio" : location ? "location" : route === "newbuilds.html" ? "regional_catalog" : route.startsWith("guides/") ? "guide" : "office_or_local_landing";
  const expected = complex?.city || example?.location || location?.namePrepositional || (role === "regional_catalog" ? "Ростов и Ростовская область" : "Шахты / офис / явно обозначенная смешанная тема");
  let issue = "";
  if (role === "office_or_local_landing" && /(?:^|\s)в Ростове(?:-на-Дону)?(?:\s|$)/iu.test(`${title} ${h1}`)) issue = "Ростов в title/H1 локальной страницы";
  if (complex && !/Ростов/iu.test(complex.city || "") && /(?:^|\s)в Ростове(?:-на-Дону)?(?:\s|$)/iu.test(`${title} ${h1}`)) issue = "Город заголовка не соответствует городу комплекса";
  if (location && !h1.includes(location.namePrepositional)) issue = "Название территории отсутствует в H1";
  if (example && !html.includes("построенный объект")) issue = "Нет маркировки портфолио";
  if (issue) failures.push({ route, issue, title, h1 });
  rows.push({ route, role, expected, title, h1, result: issue || "passed" });
  const main = (html.match(/<main[^>]*>([\s\S]*?)<\/main>/u)?.[1] || "").replace(/<section[^>]+id="lead-form-section"[\s\S]*?<\/section>/gu, "");
  for (const match of main.matchAll(/<p(?:\s[^>]*)?>([\s\S]*?)<\/p>/gu)) {
    const text = strip(match[1]);
    cityPattern.lastIndex = 0;
    if (text.split(/\s+/u).length < 25 || !cityPattern.test(text)) continue;
    cityPattern.lastIndex = 0;
    const normalized = text.toLocaleLowerCase("ru-RU").replace(cityPattern, "{city}");
    const entries = paragraphs.get(normalized) || [];
    entries.push({ route, text }); paragraphs.set(normalized, entries);
  }
}
const substitutions = [...paragraphs.entries()].filter(([, entries]) => new Set(entries.map(entry => entry.route)).size > 1 && new Set(entries.map(entry => entry.text)).size > 1).map(([normalized, entries]) => ({ normalized, entries }));
const protectedFinancialData = ["src/data/listings.json", "src/data/construction-projects.json"].map(file => {
  const baseline = JSON.parse(execFileSync("git", ["show", `4e63b3e:${file}`], { encoding: "utf8" }));
  const unchanged = JSON.stringify(baseline) === JSON.stringify(json(file));
  if (!unchanged) failures.push({ route: file, issue: "Изменены исходные данные объектов/финансовых примеров" });
  return { file, unchanged };
});
const csv = (headers, data) => [headers, ...data.map(row => headers.map(header => row[header] ?? ""))].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(";")).join("\n") + "\n";
fs.mkdirSync(output, { recursive: true });
fs.writeFileSync(`${output}/geography-review.csv`, csv(["route", "role", "expected", "title", "h1", "result"], rows));
fs.writeFileSync(`${output}/city-substitution-candidates.json`, JSON.stringify(substitutions, null, 2) + "\n");
const result = { checkedAt: "2026-10-19", canonicalPages: rows.length, titleH1Failures: failures, cityOnlySubstitutionGroups: substitutions.length, protectedFinancialData, method: "Все sitemap URL; роль регионального каталога, комплексов других городов и завершённого портфолио учитывается отдельно. Абзацы main от 25 слов: различие только в перечисленных формах города, без header/footer и основного lead-form. Одинаковые общие служебные строки и разные названия проектов не объявляются доказанной каннибализацией." };
fs.writeFileSync(`${output}/geography-review.json`, JSON.stringify(result, null, 2) + "\n");
console.log(JSON.stringify(result));
if (failures.length) process.exitCode = 1;
