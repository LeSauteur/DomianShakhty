import pricing from "./data/pricing.json" with { type: "json" };
import pending from './data/office-pending.json' with { type: 'json' };
import { QUICK_FILTERS, filterCatalog, newestListings } from './catalog-pump.mjs';
import { categoryForListing } from './listing-search.mjs';
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const money = value => `${Number(value).toLocaleString('ru-RU')} ₽`;
const heading = (title, text = '') => `<div class="section-heading"><div><p class="eyebrow">Домиан · Шахты</p><h2>${title}</h2></div>${text ? `<p>${text}</p>` : ''}</div>`;
const section = (key, title, content, text = '') => `<section class="section pump-section" data-home-section="${key}" id="home-${key}"><div class="container">${heading(title, text)}${content}</div></section>`;

export function homeBuyerPaths(ctx) {
  const paths = [
    ['Купить квартиру', 'Вторичный рынок и новостройки под ваш бюджет.', 'apartments.html'],
    ['Подобрать дом', 'Планировка, участок и коммуникации для жизни семьи.', 'houses.html'],
    ['Выбрать участок', 'Назначение земли, границы и подъезд до покупки.', 'lands.html'],
    ['Новостройка или вторичка', 'Сравните готовность к переезду и расходы на обустройство.', 'novostroyki-shakhty.html'],
    ['Проверить объект и документы', 'Разберём право, обременения и условия расчётов.', 'services.html#service-prices'],
    ['Построить дом', 'Проекты и построенные дома компании «Построим Дом».', 'construction/builders/postroim-dom.html']
  ];
  return section('buyer-paths', 'С какой задачей вы пришли?', `<div class="pump-paths">${paths.map(([title, text, href], i) => `<a href="${ctx.href(href)}"><span class="eyebrow">0${i + 1}</span><h3>${title}</h3><p>${text}</p><strong>Выбрать направление ↗</strong></a>`).join('')}</div>`);
}
export function homeNewest(ctx, card) {
  const items = newestListings(ctx.listings);
  return `<section class="section home-hot-offers" id="hot-offers" data-home-section="new-objects"><div class="container">${heading('Новые объекты', 'Последние обновлённые предложения офиса. Выберите вариант и договоритесь о просмотре.')}<div class="home-hot-offers__grid listing-grid">${items.map(item => card(ctx, item)).join('')}</div></div></section>`;
}
export function homeSpecials(ctx, card) {
  const available = newestListings(ctx.listings, ctx.listings.length);
  const groups = [
    ['apartments', 'Квартиры', available.filter(i => categoryForListing(i) === 'apartments' && i.type !== 'apartment-newbuild'), 'apartments.html'],
    ['houses-land', 'Дома и участки', [...available.filter(i => categoryForListing(i) === 'houses').slice(0, 2), ...available.filter(i => categoryForListing(i) === 'lands').slice(0, 2)], 'catalog.html?type=houses'],
    ['newbuilds', 'Новостройки', available.filter(i => i.type === 'apartment-newbuild'), 'novostroyki-shakhty.html']
  ];
  return section('specials', 'Специальные предложения', `<div data-pump-tabs><div class="pump-tabs" role="tablist" aria-label="Тип недвижимости">${groups.map(([key, label], i) => `<button type="button" role="tab" id="tab-${key}" aria-controls="panel-${key}" aria-selected="${i === 0}">${label}</button>`).join('')}</div>${groups.map(([key, label, items, href]) => `<div id="panel-${key}" role="tabpanel" aria-labelledby="tab-${key}" tabindex="0"><h3 class="pump-panel-title">${label}</h3><div class="listing-grid pump-cards">${items.slice(0, 4).map(item => card(ctx, item)).join('')}</div><a class="text-link" href="${ctx.href(href)}">Смотреть раздел ↗</a>${key === 'houses-land' ? `<a class="text-link" href="${ctx.href('lands.html')}">Все участки ↗</a>` : ''}</div>`).join('')}</div>`, 'Несколько вариантов из каталога для сравнения по цене, площади и расположению.');
}
export function homeQuickSearch(ctx) {
  const tiles = QUICK_FILTERS.map(f => ({ ...f, count: filterCatalog(ctx.listings, { quick: f.key }).length })).filter(f => f.count >= 2);
  return section('quick-search', 'Быстрый поиск', `<div class="pump-quick">${tiles.map(f => `<a data-quick-link="${f.key}" href="${ctx.href(`catalog.html?quick=${f.key}`)}"><strong>${f.label}</strong><span>${f.count} объектов ↗</span></a>`).join('')}</div>`);
}
export function homeServices(ctx) {
  const price = (ctx.pricing || pricing).items.find(i => i.id === 'legal');
  const items = [
    ['Юридическое сопровождение', Number.isFinite(price?.value) ? `${money(price.value)} · оплачивает покупатель` : 'Обсудим состав работ', 'services.html#service-prices'],
    ['Ипотека', 'Поможем подобрать программу и банк.', 'mortgage.html'],
    ['Оценка недвижимости', 'Обсудим характеристики и бюджет продажи.', 'valuation.html'],
    ['Кадастровые работы', 'Межевание, границы и документы на объект.', 'kadastrovye-raboty.html'],
    ['Строительство с «Построим Дом»', 'Подберём проект и обсудим смету для вашего участка.', 'construction/builders/postroim-dom.html']
  ];
  return section('services', 'Сервисы для сделки', `<div class="pump-paths">${items.map(([title, text, href]) => `<a href="${ctx.href(href)}"><h3>${title}</h3><p>${text}</p><strong>Подробнее ↗</strong></a>`).join('')}</div>`);
}
export function homeProcess() {
  return section('process', 'Как мы работаем', `<ol class="pump-process">${[['Консультация', 'Обсуждаем задачу, бюджет и приоритеты.'], ['Подбор', 'Сравниваем варианты и организуем просмотры.'], ['Проверка', 'Разбираем объект и документы перед сделкой.'], ['Сделка и расчёты', 'Согласуем договор и порядок передачи денег.'], ['Ключи', 'Помогаем оформить передачу недвижимости.']].map(([title, text], i) => `<li><span>0${i + 1}</span><h3>${title}</h3><p>${text}</p></li>`).join('')}</ol>`);
}
export function homeRules() {
  return section('rules', 'Наши правила', `<div class="pump-paths">${[['Работаем по договору', 'Фиксируем состав работ и обязательства сторон.'], ['Проверяем Росреестр', 'Изучаем права и обременения объекта перед сделкой.'], ['Называем стоимость заранее', 'Согласуем цену услуг до начала работы.']].map(([title, text]) => `<article><h3>${title}</h3><p>${text}</p></article>`).join('')}</div>`);
}
export function homeFaq(ctx) {
  const legal = (ctx.pricing || pricing).items.find(i => i.id === 'legal');
  const answers = {
    price: `Юридическое сопровождение сделки — ${money(legal.value)}, оплачивает покупатель. Стоимость остальных услуг назовём на консультации. <a href="${ctx.href('services.html#service-prices')}">Стоимость услуг</a>.`,
    mortgage: `Да, помогаем подобрать программу и банк для покупки недвижимости. <a href="${ctx.href('mortgage.html')}">Помощь с ипотекой</a>.`
  };
  const items = pending.faq.filter(f => f.publish === true && (answers[f.id] || f.answer));
  return section('faq', 'Частые вопросы', `<div class="faq-list">${items.map(f => `<details><summary>${esc(f.question)}<span aria-hidden="true">+</span></summary><p>${answers[f.id] || esc(f.answer)}</p></details>`).join('')}</div>`);
}
export function homePending(ctx, data = pending) {
  let result = '';
  if (data.stats.publish === true && Number.isFinite(data.stats.years) && Number.isFinite(data.stats.deals)) result += section('office-stats', 'Наш офис в цифрах', `<div class="pump-quick"><article><strong>${data.stats.years}</strong><span>лет работы</span></article><article><strong>${data.stats.deals}</strong><span>сделок</span></article></div>`);
  if (data.banks.publish === true && data.banks.items.length) result += section('banks', 'Банки-партнёры', `<div class="pump-quick">${data.banks.items.map(i => `<article><strong>${esc(i.name)}</strong></article>`).join('')}</div>`);
  if (data.certificates.publish === true && data.certificates.items.length) result += section('certificates', 'Сертификаты', `<div class="pump-quick">${data.certificates.items.map(i => `<a href="${esc(ctx.href(i.file))}">${esc(i.name)} ↗</a>`).join('')}</div>`);
  return result;
}
