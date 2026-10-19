import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = path => fs.readFileSync(path, "utf8");
const data = JSON.parse(read("src/data/construction-projects.json"));
const builderPath = "construction/builders/postroim-dom.html";
const builder = read(`dist/${builderPath}`);
const expectedDays = {
  "postroim-dom-konstantinovsk-110": 180,
  "postroim-dom-rostov-stone-100-120": 120,
  "postroim-dom-rostov-brick-110": 180,
  "postroim-dom-rostov-brick-100-180": 180,
  "postroim-dom-rostov-brick-100-90": 90,
  "postroim-dom-rostov-stone-120": 200
};

test("completed-object durations match source IDs on cards and detail pages", () => {
  assert.deepEqual(Object.fromEntries(data.builtExamples.map(item => [item.id, item.constructionDays])), expectedDays);
  for (const item of data.builtExamples) {
    assert.equal(item.pricePackage, "Под ключ");
    for (const html of [builder, read("dist/construction.html")]) {
      const card = html.match(new RegExp(`<article[^>]+data-built-example="${item.id}"[\\s\\S]*?</article>`, "u"))?.[0];
      assert.ok(card, item.id);
      assert.ok(card.includes(`Срок строительства — ${expectedDays[item.id]} дней · под ключ`), item.id);
      assert.match(card, /Построенный дом из портфолио компании/u);
    }
    const detail = read(`dist/construction/projects/${item.slug}.html`);
    assert.ok(detail.includes(`Срок строительства — ${expectedDays[item.id]} дней · под ключ`));
    assert.ok(detail.includes(`href="/${builderPath}"`));
    assert.match(detail, /Построенный дом из портфолио компании/u);
  }
});

test("builder has six linked examples, office attribution and incoming indexed links", () => {
  assert.equal((builder.match(/data-built-example=/gu) || []).length, 6);
  assert.match(builder, /data-source-cta="builder_postroim_dom"/u);
  assert.ok(builder.includes(`data-origin-page="${builderPath}"`));
  assert.match(builder, /Заявка поступает в офис Домиан на Маяковского, а не напрямую строителям/u);
  assert.match(builder, /работает на участках в Шахтах/u);
  assert.ok(data.builtExamples.every(item => item.serviceAreaConfirmedAt === "2026-10-14"));
  for (const text of ["Строительство домов", "Строительство по своему проекту", "Индивидуальное проектирование", "Что нужно для расчёта", "Участок", "Площадь", "Бюджет"]) assert.ok(builder.includes(text), text);
  for (const item of data.builtExamples) assert.ok(builder.includes(`href="/construction/projects/${item.slug}.html"`));
  for (const path of ["construction.html", "houses.html"]) assert.ok(read(`dist/${path}`).includes(`href="/${builderPath}"`));
  assert.match(read("dist/houses.html"), /<h2>Построить дом<\/h2>/u);
  assert.ok(read("dist/sitemap.xml").includes(`/${builderPath}</loc>`));
  assert.match(builder, /name="robots" content="index,follow"/u);
  assert.doesNotMatch(builder, /"@type":"(?:Offer|Product)"|\d[\d\s]*\s₽|лучшие|гарантируем/iu);
});

test("all seven mortgage blocks invite a financing discussion without unsupported numbers", () => {
  for (const path of [builderPath, ...data.builtExamples.map(item => `construction/projects/${item.slug}.html`)]) {
    const section = read(`dist/${path}`).match(/<section[^>]+id="construction-family-mortgage"[\s\S]*?<\/section>/u)?.[0];
    assert.ok(section, path);
    assert.match(section, /Семейная ипотека на строительство дома/u);
    assert.doesNotMatch(section, /Дата проверки|19 октября 2026/u);
    assert.match(section, /Поможем обсудить строительство дома/u);
    assert.match(section, /Подготовим вопросы по финансированию/u);
    assert.doesNotMatch(section, /%|\bмлн\b|href="https?:/u);
  }
});
