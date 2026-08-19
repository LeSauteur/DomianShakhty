const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const navItems = [
  ["construction", "Новые дома", "construction.html"],
  ["houses", "Вторичный рынок", "houses.html"],
  ["locations", "География", "locations/index.html"],
  ["services", "Услуги", "services.html"],
  ["guides", "Гайды", "guides/index.html"],
  ["contacts", "Контакты", "contacts.html"]
];

export function createContext(site, data) {
  const base = site.mode === "prelaunch" ? (site.previewBasePath || "") : "";
  const cleanBase = base ? `/${base.replace(/^\/+|\/+$/g, "")}` : "";

  function href(value = "") {
    if (/^(?:https?:|mailto:|tel:)/iu.test(value)) return value;
    if (value.startsWith("#")) return value;
    const [pathname, hash = ""] = value.replace(/^\/+/, "").split("#");
    let target;
    if (!pathname || pathname === "index.html") target = `${cleanBase}/`;
    else if (pathname.endsWith("/index.html")) target = `${cleanBase}/${pathname.slice(0, -"index.html".length)}`;
    else target = `${cleanBase}/${pathname}`;
    return hash ? `${target}#${hash}` : target;
  }

  function absolute(pathname = "") {
    if (!site.productionOrigin) return "";
    return new URL(href(pathname).replace(cleanBase, ""), site.productionOrigin).href;
  }

  return { site, ...data, href, absolute, base: cleanBase };
}

function brand(ctx) {
  return `<a class="brand" href="${ctx.href("")}">
    <span class="brand__mark" aria-hidden="true">Д</span>
    <span class="brand__copy"><strong>Домиан</strong><small>Шахты · Маяковского 18А</small></span>
  </a>`;
}

function nav(ctx, active, mobile = false) {
  const links = navItems.map(([key, label, target]) => `<a href="${ctx.href(target)}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  if (mobile) {
    return `<div class="mobile-drawer" id="mobile-drawer" aria-hidden="true" inert>
      <div class="mobile-drawer__scrim" data-drawer-close></div>
      <div class="mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Меню сайта">
        <div class="mobile-drawer__top">${brand(ctx)}<button class="icon-button mobile-drawer__close" type="button" aria-label="Закрыть меню" data-drawer-close>×</button></div>
        <nav class="mobile-drawer__nav" aria-label="Мобильная навигация">${links}</nav>
        <div class="mobile-drawer__contact">
          <a class="button button--primary" href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a>
          <a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a>
          <span>${esc(ctx.site.address)}</span>
        </div>
      </div>
    </div>`;
  }
  return `<nav class="site-nav" aria-label="Основная навигация">${links}</nav>`;
}

function header(ctx, active) {
  return `<header class="site-header" data-site-header>
    <div class="container site-header__inner">
      ${brand(ctx)}
      ${nav(ctx, active)}
      <a class="header-phone" href="${ctx.site.phoneHref}" data-analytics="phone_click"><span>Позвонить</span><strong>${esc(ctx.site.phone)}</strong></a>
      <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-drawer" data-menu-toggle><span></span><span></span></button>
    </div>
  </header>${nav(ctx, active, true)}`;
}

function footer(ctx) {
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">${brand(ctx)}<p>Подбор новых частных домов и сопровождение сделок с недвижимостью в Шахтах и рядом.</p></div>
      <div><h2>Недвижимость</h2><a href="${ctx.href("construction.html")}">Новые дома</a><a href="${ctx.href("houses.html")}">Вторичные дома</a><a href="${ctx.href("apartments.html")}">Квартиры</a><a href="${ctx.href("lands.html")}">Участки</a></div>
      <div><h2>Клиентам</h2><a href="${ctx.href("sell.html")}">Продать</a><a href="${ctx.href("valuation.html")}">Оценка</a><a href="${ctx.href("mortgage.html")}">Ипотечный сценарий</a><a href="${ctx.href("guides/index.html")}">Полезные материалы</a></div>
      <div><h2>Офис</h2><a href="${ctx.href("team/maria-voronina.html")}">Мария Воронина</a><a href="${ctx.href("contacts.html")}">Контакты</a><a href="${ctx.href("details.html")}">Реквизиты</a><a href="${ctx.href("privacy.html")}">Обработка данных</a></div>
      <address><h2>Связаться</h2><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a><span>${esc(ctx.site.address)}</span></address>
    </div>
    <div class="container footer-bottom"><span>© ${new Date().getFullYear()} ${esc(ctx.site.displayName)}</span><span>${ctx.site.mode === "prelaunch" ? "PRELAUNCH · сайт закрыт от индексации" : "Информация не является публичной офертой"}</span></div>
  </footer>`;
}

function breadcrumbs(ctx, items) {
  if (!items?.length) return "";
  return `<nav class="breadcrumbs container" aria-label="Хлебные крошки"><ol>${items.map((item, index) => `<li>${index === items.length - 1 ? `<span aria-current="page">${esc(item.label)}</span>` : `<a href="${ctx.href(item.href)}">${esc(item.label)}</a>`}</li>`).join("")}</ol></nav>`;
}

function hero(ctx, page) {
  const facts = (page.heroFacts || []).map((item) => `<li>${esc(item)}</li>`).join("");
  return `<section class="page-hero page-hero--${esc(page.pageType || "standard")}">
    <div class="blueprint-grid" aria-hidden="true"></div>
    <div class="container page-hero__layout">
      <div class="page-hero__copy" data-reveal>
        <p class="eyebrow">${esc(page.eyebrow)}</p>
        <h1>${esc(page.h1)}</h1>
        <p class="hero-lead">${esc(page.lead)}</p>
        <div class="hero-actions">
          <a class="button button--primary" href="${ctx.href(page.primaryCta.href)}"${page.primaryCta.event ? ` data-analytics="${esc(page.primaryCta.event)}"` : ""}>${esc(page.primaryCta.label)}</a>
          <a class="button button--ghost" href="${ctx.href(page.secondaryCta.href)}">${esc(page.secondaryCta.label)}</a>
        </div>
        ${facts ? `<ul class="hero-facts">${facts}</ul>` : ""}
      </div>
      <div class="architectural-card" aria-label="Схема подбора нового дома" data-reveal>
        <span class="architectural-card__label">профиль дома</span>
        <div class="house-plan" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <div class="architectural-card__meta"><span>дом</span><span>участок</span><span>сделка</span></div>
        <strong>ШХ · 01</strong>
      </div>
    </div>
  </section>`;
}

function cardsSection(ctx, section) {
  return `<section class="section"><div class="container">
    ${sectionHeading(section)}
    <div class="card-grid" data-reveal-group>${section.items.map((item) => {
      const content = `<span class="card-index">${esc(item.index || "•")}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.href ? `<span class="text-link">Подробнее <span aria-hidden="true">↗</span></span>` : ""}`;
      return item.href ? `<a class="info-card info-card--link" href="${ctx.href(item.href)}" data-reveal>${content}</a>` : `<article class="info-card" data-reveal>${content}</article>`;
    }).join("")}</div>
  </div></section>`;
}

function criteriaSection(section) {
  return `<section class="section section--ink"><div class="container criteria-layout">
    <div>${sectionHeading(section)}</div>
    <ol class="criteria-list" data-reveal-group>${section.items.map((item, index) => `<li data-reveal><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong></li>`).join("")}</ol>
  </div></section>`;
}

function catalogSection(ctx, section) {
  return `<section class="section section--stone"><div class="container">
    ${sectionHeading(section)}
    <div class="catalog-shell" data-catalog-root>
      <form class="catalog-filters" data-catalog-filters aria-label="Фильтры будущего каталога">
        <label>Территория<select name="location"><option value="">Все территории</option>${ctx.locations.map((location) => `<option value="${esc(location.slug)}">${esc(location.name)}</option>`).join("")}</select></label>
        <label>Формат<select name="format"><option value="">Все форматы</option><option value="ready">Готовый дом</option><option value="builder">От застройщика</option><option value="land">Дом + участок</option></select></label>
        <button type="reset" class="button button--small button--ghost">Сбросить</button>
      </form>
      <p class="catalog-count" aria-live="polite">Подтверждённых публичных карточек: <strong data-catalog-count>0</strong></p>
      <div class="catalog-grid" data-catalog-grid></div>
      <div class="empty-state" data-catalog-empty>
        <span class="empty-state__mark" aria-hidden="true">0</span>
        <div><h3>${esc(section.emptyTitle)}</h3><p>${esc(section.emptyText)}</p><a class="button button--primary" href="#lead-form-section">${esc(section.cta)}</a></div>
      </div>
    </div>
  </div></section>`;
}

function locationsSection(ctx, section) {
  return `<section class="section"><div class="container">${sectionHeading(section)}<div class="location-grid" data-reveal-group>${ctx.locations.map((location, index) => `<a class="location-card" href="${ctx.href(`locations/${location.slug}.html`)}" data-location="${esc(location.slug)}" data-reveal><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(location.name)}</h3><p>${esc(location.administrativeName)}</p><strong>Открыть локацию ↗</strong></a>`).join("")}</div></div></section>`;
}

function processSection(section) {
  return `<section class="section section--stone"><div class="container">${sectionHeading(section)}<ol class="process-line" data-reveal-group>${section.items.map((item, index) => `<li data-reveal><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></li>`).join("")}</ol></div></section>`;
}

function splitSection(ctx, section) {
  return `<section class="section"><div class="container">${sectionHeading(section)}<div class="split-cards"><article class="split-card split-card--copper"><h3>${esc(section.left.title)}</h3><p>${esc(section.left.text)}</p><a class="text-link" href="${ctx.href(section.left.href)}">${esc(section.left.label)} ↗</a></article><article class="split-card"><h3>${esc(section.right.title)}</h3><p>${esc(section.right.text)}</p><a class="text-link" href="${ctx.href(section.right.href)}">${esc(section.right.label)} ↗</a></article></div></div></section>`;
}

function mortgageSection() {
  return `<section class="section section--ink" id="mortgage-calculator"><div class="container mortgage-layout">
    <div><p class="eyebrow">Ориентировочный расчёт</p><h2>Введите свои условия</h2><p>Ставка не подставлена намеренно: используйте значение, которое получили из актуального предложения банка. Расчёт не учитывает страховки, комиссии и изменение условий.</p></div>
    <form class="mortgage-calculator" data-mortgage-calculator>
      <label>Стоимость объекта, ₽<input name="price" type="number" min="100000" step="50000" value="5000000" inputmode="numeric"></label>
      <label>Первоначальный взнос, ₽<input name="downPayment" type="number" min="0" step="50000" value="1000000" inputmode="numeric"></label>
      <label>Ставка, % годовых<input name="rate" type="number" min="0.01" max="100" step="0.01" placeholder="Введите актуальную ставку" inputmode="decimal" required></label>
      <label>Срок, лет<input name="term" type="number" min="1" max="40" step="1" value="20" inputmode="numeric"></label>
      <div class="mortgage-result" aria-live="polite"><span>Ориентировочный платёж</span><strong data-mortgage-result>Введите ставку</strong><small>Аннуитетный расчёт, не оферта и не решение банка.</small></div>
    </form>
  </div></section>`;
}

function sectionHeading(section) {
  return `<div class="section-heading" data-reveal><div><p class="eyebrow">${esc(section.kicker || "")}</p><h2>${esc(section.title || "")}</h2></div>${section.intro ? `<p>${esc(section.intro)}</p>` : ""}</div>`;
}

function renderSection(ctx, section) {
  if (section.kind === "cards") return cardsSection(ctx, section);
  if (section.kind === "criteria") return criteriaSection(section);
  if (section.kind === "catalog") return catalogSection(ctx, section);
  if (section.kind === "locations") return locationsSection(ctx, section);
  if (section.kind === "process") return processSection(section);
  if (section.kind === "split") return splitSection(ctx, section);
  if (section.kind === "mortgage") return mortgageSection();
  return "";
}

function leadForm(ctx, form = {}) {
  const options = [
    ["construction", "Новый дом / дом от застройщика"],
    ["house", "Вторичный дом"],
    ["apartment", "Квартира"],
    ["land", "Участок"],
    ["sell", "Продажа недвижимости"],
    ["valuation", "Оценка"],
    ["mortgage", "Ипотечный сценарий"],
    ["service", "Другая задача"]
  ];
  return `<section class="lead-section" id="lead-form-section"><div class="container lead-layout">
    <div><p class="eyebrow">Короткий первый шаг</p><h2>${esc(form.title || "Обсудить задачу")}</h2><p>${esc(form.text || "Расскажите, что нужно решить.")}</p><div class="direct-contact"><span>${ctx.site.mode === "prelaunch" ? "В PRELAUNCH форма не отправляет данные наружу." : "Можно также связаться с офисом напрямую."}</span><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></div></div>
    <form class="lead-form" data-lead-form data-source-cta="${esc(form.type || "contact")}" novalidate>
      <div class="honeypot" aria-hidden="true"><label>Не заполняйте<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off"></label></div>
      <label>Имя<input name="name" type="text" autocomplete="name" minlength="2" required placeholder="Как к вам обращаться"></label>
      <label>Телефон<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 999 123-45-67"></label>
      <label>Тип запроса<select name="service" required><option value="">Выберите задачу</option>${options.map(([value, label]) => `<option value="${value}"${value === form.type ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Комментарий <span>необязательно</span><textarea name="message" rows="4" placeholder="Территория, бюджет, площадь или ваша ситуация"></textarea></label>
      <label class="consent"><input name="privacy_consent" type="checkbox" required><span>Согласен(на) на обработку данных по <a href="${ctx.href("privacy.html")}">политике</a>.</span></label>
      <p class="form-status" data-form-status role="status" hidden></p>
      <button class="button button--primary" type="submit">Отправить заявку</button>
      <p class="form-note">${ctx.site.mode === "prelaunch" ? "Отправка включится после отдельной проверки провайдера. Сейчас используйте телефон или email." : "Не отправляйте паспортные, банковские и иные чувствительные сведения."}</p>
    </form>
  </div></section>`;
}

function schemaFor(ctx, page, breadcrumbsItems) {
  const organization = {
    "@type": "RealEstateAgent",
    name: ctx.site.displayName,
    telephone: ctx.site.phone,
    email: ctx.site.email,
    address: { "@type": "PostalAddress", addressLocality: "Шахты", streetAddress: "ул. Маяковского 18А", addressRegion: "Ростовская область", addressCountry: "RU" },
    areaServed: ctx.site.serviceAreas.map((name) => ({ "@type": "Place", name }))
  };
  if (ctx.site.mode === "production") {
    organization["@id"] = `${ctx.site.productionOrigin.replace(/\/$/u, "")}/#organization`;
    organization.url = ctx.absolute("");
  }
  const nodes = [organization];
  if (page.pageType === "person") {
    const person = { "@type": "Person", name: ctx.site.owner.name, jobTitle: ctx.site.owner.role, telephone: ctx.site.phone, email: ctx.site.email, worksFor: ctx.site.mode === "production" ? { "@id": organization["@id"] } : { "@type": "RealEstateAgent", name: ctx.site.displayName } };
    if (ctx.site.mode === "production") person["@id"] = `${ctx.absolute("team/maria-voronina.html")}#person`;
    nodes.push(person);
  } else if (page.pageType === "guide") {
    const article = { "@type": "Article", headline: page.h1 || page.title, description: page.description, datePublished: page.publishedAt, dateModified: page.updatedAt, author: { "@type": "Organization", name: `Редакция ${ctx.site.displayName}` }, editor: { "@type": "Person", name: ctx.site.owner.name } };
    if (ctx.site.mode === "production") { article.url = ctx.absolute(page.path); article.publisher = { "@id": organization["@id"] }; }
    nodes.push(article);
  } else if (["construction", "service", "mortgage", "catalog", "location"].includes(page.pageType)) {
    const service = { "@type": "Service", name: page.h1, description: page.description, areaServed: ctx.site.serviceAreas.map((name) => ({ "@type": "Place", name })), provider: ctx.site.mode === "production" ? { "@id": organization["@id"] } : { "@type": "RealEstateAgent", name: ctx.site.displayName } };
    if (ctx.site.mode === "production") service.url = ctx.absolute(page.path);
    nodes.push(service);
  }
  if (ctx.site.mode === "production" && breadcrumbsItems?.length) {
    nodes.push({ "@type": "BreadcrumbList", itemListElement: breadcrumbsItems.map((item, index) => ({ "@type": "ListItem", position: index + 1, name: item.label, item: ctx.absolute(item.href || page.path) })) });
  }
  return `<script type="application/ld+json">${JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replaceAll("<", "\\u003c")}</script>`;
}

function documentHead(ctx, page, breadcrumbsItems) {
  const canonical = ctx.site.mode === "production" ? ctx.absolute(page.path || "") : "";
  const ogImage = ctx.site.mode === "production" ? ctx.absolute("assets/images/og.png") : "";
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${ctx.site.mode === "prelaunch" ? "noindex,nofollow" : "index,follow"}">
  <meta name="description" content="${esc(page.description)}">
  <meta name="theme-color" content="#1c2427">
  <link rel="icon" href="data:,">
  <title>${esc(page.title)}</title>
  ${canonical ? `<link rel="canonical" href="${canonical}">` : ""}
  <meta property="og:locale" content="ru_RU">
  <meta property="og:type" content="${page.pageType === "guide" ? "article" : "website"}">
  <meta property="og:site_name" content="${esc(ctx.site.displayName)}">
  <meta property="og:title" content="${esc(page.title)}">
  <meta property="og:description" content="${esc(page.description)}">
  ${canonical ? `<meta property="og:url" content="${canonical}">` : ""}
  ${ogImage ? `<meta property="og:image" content="${ogImage}">
  <meta property="og:image:width" content="1536">
  <meta property="og:image:height" content="1024">
  <meta property="og:image:alt" content="Архитектурная схема дома и участка в фирменной палитре офиса">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}
  <link rel="stylesheet" href="${ctx.href("assets/css/site.css")}">
  <script src="${ctx.href("assets/js/site-config.js")}" defer></script>
  <script src="${ctx.href("assets/js/site.js")}" defer></script>
  <script src="${ctx.href("assets/js/form-handler.js")}" defer></script>
  ${schemaFor(ctx, page, breadcrumbsItems)}`;
}

function layout(ctx, page, body, { active = "", breadcrumbs: crumbs = [] } = {}) {
  return `<!doctype html><html lang="ru"><head>${documentHead(ctx, page, crumbs)}</head><body data-page-type="${esc(page.pageType || "standard")}">
  <a class="skip-link" href="#main-content">Перейти к содержанию</a>
  ${header(ctx, active)}
  ${breadcrumbs(ctx, crumbs)}
  <main id="main-content">${body}</main>
  ${footer(ctx)}
  </body></html>`;
}

export function renderCommercialPage(ctx, page) {
  const crumbs = [{ label: "Главная", href: "" }, { label: page.h1, href: page.path }];
  const body = `${hero(ctx, page)}${page.sections.map((section) => renderSection(ctx, section)).join("")}${leadForm(ctx, page.form)}`;
  const active = ["construction", "houses", "services"].includes(page.slug) ? page.slug : page.pageType === "catalog" ? "houses" : "services";
  return layout(ctx, page, body, { active, breadcrumbs: crumbs });
}

export function renderHome(ctx, guides) {
  const page = { path: "", pageType: "home", title: "Домиан · Шахты на Маяковского — новые дома и недвижимость", description: "Подбор домов от застройщика, новых частных домов, участков и вторичной недвижимости в Шахтах, Аютинском, Новошахтинске, Красном Сулине и Каменоломнях.", eyebrow: "Домиан · Шахты", h1: "Новый дом — под вашу жизнь, участок и бюджет", lead: "Подбираем дома от застройщика и готовые новые частные дома в Шахтах и рядом. Сравниваем варианты, землю, комплектации и документы — без вымышленных объектов и рекламных обещаний.", primaryCta: { label: "Подобрать дом", href: "construction.html#lead-form-section", event: "construction_interest" }, secondaryCta: { label: "Продать недвижимость", href: "sell.html" }, heroFacts: ["Шахты и 4 территории рядом", "агентство, а не строительная компания", "подбор по подтверждённым данным"] };
  const construction = { kind: "cards", kicker: "Главный продукт", title: "Три способа прийти к новому дому", intro: "Сразу разделяем готовый объект, предложение застройщика и связку дом + участок.", items: [
    { index: "01", title: "Готовый новый дом", text: "Увидеть объект, проверить готовность, участок и объём работ после покупки.", href: "construction.html" },
    { index: "02", title: "Дом от застройщика", text: "Сравнить варианты и комплектации без неподтверждённых партнёрств.", href: "construction.html" },
    { index: "03", title: "Дом + участок", text: "Связать землю, проект и полный бюджет до решения.", href: "lands.html" }
  ] };
  const process = { kind: "process", kicker: "Понятный маршрут", title: "Сначала критерии — потом просмотры", items: [
    { title: "Запрос", text: "Бюджет, площадь, участок, готовность и территория." },
    { title: "Сравнение", text: "Единый формат для комплектаций, документов и расходов." },
    { title: "Проверка", text: "Объект, земля, существенные условия и вопросы без ответа." },
    { title: "Сделка", text: "Согласованный порядок действий и расчётов." }
  ] };
  const secondary = { kind: "split", kicker: "Другие задачи", title: "Вторичный рынок и сценарий собственника", left: { title: "Дома, квартиры, участки", text: "Получите актуальную подборку без фиктивных карточек и устаревших цен.", href: "houses.html", label: "Вторичный рынок" }, right: { title: "Продать или оценить", text: "Подготовим объект и свяжем продажу со следующей покупкой.", href: "sell.html", label: "Сценарий продавца" } };
  const guideCards = { kind: "cards", kicker: "Полезные материалы", title: "Подготовьтесь к выбору за один вечер", intro: "Практические чек-листы без SEO-воды и неподтверждённых ставок.", items: guides.slice(0, 3).map((guide, index) => ({ index: String(index + 1).padStart(2, "0"), title: guide.title, text: guide.answer, href: `guides/${guide.slug}.html` })) };
  const owner = `<section class="section owner-section"><div class="container owner-layout"><div class="owner-mark" aria-label="Портрет Марии будет добавлен после получения фотографии"><span>МВ</span><small>портрет будет добавлен</small></div><div><p class="eyebrow">Собственник офиса</p><h2>Мария Воронина</h2><p>Личная страница собрана только из подтверждённых данных: роль, офис, телефон, email и адрес. Стаж, цифры, награды и фотографии других людей не используются.</p><div class="owner-actions"><a class="button button--primary" href="${ctx.href("team/maria-voronina.html")}">Познакомиться с Марией</a><a class="text-link" href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)} ↗</a></div></div></div></section>`;
  const office = `<section class="section section--stone"><div class="container office-layout"><div><p class="eyebrow">Офис в Шахтах</p><h2>Маяковского 18А</h2><p>Можно начать с короткого звонка или письма. Часы работы и мессенджеры появятся только после подтверждения владельца.</p></div><address><strong>${esc(ctx.site.displayName)}</strong><span>${esc(ctx.site.address)}</span><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a><a class="button button--ghost" href="${ctx.href("contacts.html")}">Все контакты</a></address></div></section>`;
  const body = `${hero(ctx, page)}${renderSection(ctx, construction)}${locationsSection(ctx, { kicker: "География работы", title: "Выберите конкретную территорию", intro: "Каждая страница объясняет отдельный сценарий выбора и использует корректное административное название." })}${renderSection(ctx, process)}${splitSection(ctx, { kicker: "Финансирование", title: "Рассчитать свой сценарий", left: { title: "Ипотечный калькулятор", text: "Ставку вводите самостоятельно; результат ориентировочный.", href: "mortgage.html", label: "Открыть расчёт" }, right: { title: "Участок под дом", text: "Проверить землю, ограничения, подъезд и коммуникации.", href: "lands.html", label: "Подбор участка" } })}${renderSection(ctx, secondary)}${renderSection(ctx, guideCards)}${owner}${office}${leadForm(ctx, { type: "construction", title: "Расскажите, какой дом ищете", text: "Территория, бюджет и примерная площадь — достаточно, чтобы начать разговор." })}`;
  return layout(ctx, page, body, { active: "" });
}

export function renderLocationsIndex(ctx) {
  const page = { path: "locations/index.html", pageType: "location", title: "География работы — Шахты и соседние территории", description: "Шахты, Аютинский, Новошахтинск, Красный Сулин и Каменоломни: отдельные сценарии выбора нового или вторичного дома.", eyebrow: "Пять территорий", h1: "География выбора частного дома", lead: "Не превращаем локации в одинаковые SEO-страницы. Для каждой территории объясняем административный статус, сценарий дома и вопросы, которые стоит проверить.", primaryCta: { label: "Выбрать территорию", href: "#locations" }, secondaryCta: { label: "Подобрать новый дом", href: "construction.html" }, heroFacts: ["корректные названия", "конкретные критерии", "без выдуманной инфраструктуры"] };
  const cards = `<section class="section" id="locations"><div class="container"><div class="location-grid location-grid--detailed">${ctx.locations.map((location, index) => `<a class="location-card" href="${ctx.href(`locations/${location.slug}.html`)}"><span>${String(index + 1).padStart(2, "0")}</span><h2>${esc(location.name)}</h2><p>${esc(location.context)}</p><strong>${esc(location.kicker)} ↗</strong></a>`).join("")}</div></div></section>`;
  const method = criteriaSection({ kicker: "Как сравнивать", title: "Одинаковая таблица — разные выводы", intro: "Сравнивайте конкретные адреса, а не названия городов.", items: ["ежедневные маршруты семьи", "тип и готовность дома", "участок и подъезд", "коммуникации", "документы", "полный бюджет после покупки"] });
  const body = `${hero(ctx, page)}${cards}${method}${leadForm(ctx, { type: "construction", title: "Сравнить территории под ваш запрос", text: "Назовите ключевые маршруты и требования к дому — офис поможет сузить географию." })}`;
  return layout(ctx, page, body, { active: "locations", breadcrumbs: [{ label: "Главная", href: "" }, { label: "География", href: page.path }] });
}

export function renderLocation(ctx, location) {
  const page = { path: `locations/${location.slug}.html`, pageType: "location", title: `${location.name}: дома и участки — Домиан Шахты`, description: `${location.name}: подбор нового или вторичного частного дома и участка. Что проверить до просмотра и сделки; территория — ${location.administrativeName}.`, eyebrow: location.kicker, h1: location.title, lead: location.intro, primaryCta: { label: "Подобрать дом", href: "#lead-form-section" }, secondaryCta: { label: "Новые дома", href: "construction.html" }, heroFacts: [location.administrativeName, ...location.types.slice(0, 2)] };
  const context = `<section class="section"><div class="container location-story"><div><p class="eyebrow">Административный контекст</p><h2>${esc(location.administrativeName)}</h2><p>${esc(location.context)}</p></div><aside><span>Сценарий частного дома</span><p>${esc(location.houseScenario)}</p></aside></div></section>`;
  const who = cardsSection(ctx, { kicker: "Кому подходит", title: "Сценарии для этой территории", intro: "Это не готовые объекты, а ситуации покупателя.", items: location.idealFor.map((item, index) => ({ index: String(index + 1).padStart(2, "0"), title: item, text: index === 0 ? location.houseScenario : `Критерии уточняются по конкретному адресу в ${location.name}.` })) });
  const checks = criteriaSection({ kicker: "Что проверить", title: "Вопросы к конкретному адресу", intro: "Общие сведения о территории не заменяют проверку объекта.", items: location.checks });
  const types = `<section class="section section--stone"><div class="container"><div class="section-heading"><div><p class="eyebrow">Что рассматриваем</p><h2>${location.types.map(esc).join(" · ")}</h2></div><p>Публичных карточек пока нет. Актуальность и характеристики подтверждаются офисом на дату обращения.</p></div><div class="hero-actions"><a class="button button--ghost" href="${ctx.href("houses.html")}">Вторичные дома</a><a class="button button--ghost" href="${ctx.href("apartments.html")}">Квартиры</a><a class="button button--ghost" href="${ctx.href("lands.html")}">Участки</a></div></div></section>`;
  const related = splitSection(ctx, { kicker: "Связанные маршруты", title: "Продолжить выбор", left: { title: "Новые дома", text: "Сравнить готовые дома, предложения застройщиков и дом + участок.", href: "construction.html", label: "Главный каталог" }, right: { title: "Практический гайд", text: "Открыть материал, связанный с проверкой этой локации.", href: `guides/${location.relatedGuide}.html`, label: "Читать гайд" } });
  const body = `${hero(ctx, page)}${context}${who}${checks}${types}${related}${leadForm(ctx, { type: "construction", title: `Подобрать дом: ${location.name}`, text: "Укажите бюджет, площадь и обязательные параметры. Офис проверит актуальные варианты." })}`;
  return layout(ctx, page, body, { active: "locations", breadcrumbs: [{ label: "Главная", href: "" }, { label: "География", href: "locations/index.html" }, { label: location.name, href: page.path }] });
}

export function renderGuidesIndex(ctx, guides) {
  const page = { path: "guides/index.html", pageType: "guides", title: "Гайды о домах и сделках в Шахтах — Домиан", description: "Практические материалы о новых домах, участках, локациях и подготовке недвижимости к продаже в Шахтах.", eyebrow: "Полезные материалы", h1: "Короткие ответы и рабочие чек-листы", lead: "Шесть материалов для покупателя и собственника: без SEO-воды, фиктивных ставок и скрытой рекламы объектов.", primaryCta: { label: "Выбрать материал", href: "#guide-list" }, secondaryCta: { label: "Подобрать дом", href: "construction.html" }, heroFacts: ["answer-first", "локальный контекст", "дата обновления"] };
  const list = `<section class="section" id="guide-list"><div class="container guide-grid">${guides.map((guide, index) => `<article class="guide-card"><span>${String(index + 1).padStart(2, "0")} · ${esc(guide.readTime)}</span><h2><a href="${ctx.href(`guides/${guide.slug}.html`)}">${esc(guide.title)}</a></h2><p>${esc(guide.answer)}</p><a class="text-link" href="${ctx.href(`guides/${guide.slug}.html`)}">Читать материал ↗</a></article>`).join("")}</div></section>`;
  const body = `${hero(ctx, page)}${list}${leadForm(ctx, { type: "construction", title: "Нужна помощь после чтения?", text: "Опишите дом, участок или ситуацию — офис поможет определить следующий шаг." })}`;
  return layout(ctx, page, body, { active: "guides", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Гайды", href: page.path }] });
}

export function renderGuide(ctx, guide) {
  const page = { ...guide, path: `guides/${guide.slug}.html`, pageType: "guide", h1: guide.title, title: `${guide.title} — Домиан` };
  const toc = `<nav class="guide-toc" aria-label="Оглавление"><strong>В материале</strong><ol>${guide.sections.map((section) => `<li><a href="#${esc(section.id)}">${esc(section.title)}</a></li>`).join("")}</ol></nav>`;
  const content = guide.sections.map((section) => `<section class="guide-section" id="${esc(section.id)}"><h2>${esc(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}${section.checklist ? `<div class="guide-checklist"><h3>Проверить</h3><ul>${section.checklist.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>` : ""}</section>`).join("");
  const sources = guide.sources.length ? `<section class="guide-sources"><h2>Источники и дата проверки</h2><ul>${guide.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a></li>`).join("")}</ul></section>` : "";
  const body = `<article class="guide-article"><header class="guide-hero"><div class="container guide-hero__layout"><div><p class="eyebrow">Гайд · ${esc(guide.readTime)}</p><h1>${esc(guide.title)}</h1><p class="guide-answer">${esc(guide.answer)}</p><div class="guide-meta"><span>Автор: редакция офиса</span><span>Редактор: Мария Воронина</span><time datetime="${guide.publishedAt}">19 августа 2026</time><span>Обновлено: 19 августа 2026</span></div></div>${toc}</div></header><div class="container guide-layout"><div class="guide-content">${content}<aside class="local-note"><span>Локальный контекст</span><p>${esc(guide.localContext)}</p></aside>${sources}</div><aside class="guide-rail"><p>Примените чек-лист к реальному объекту.</p><a class="button button--primary" href="${ctx.href(guide.cta.href)}" data-analytics="guide_to_catalog">${esc(guide.cta.label)}</a><a class="text-link" href="${ctx.href("guides/index.html")}">Все материалы</a></aside></div></article>${leadForm(ctx, { type: "construction", title: "Обсудить конкретный объект", text: "Ссылка, адрес или короткое описание помогут начать предметно." })}`;
  return layout(ctx, page, body, { active: "guides", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Гайды", href: "guides/index.html" }, { label: guide.title, href: page.path }] });
}

export function renderPerson(ctx) {
  const page = { path: "team/maria-voronina.html", pageType: "person", title: "Мария Воронина — собственник офиса Домиан в Шахтах", description: "Мария Воронина, собственник офиса «Домиан · Шахты на Маяковского»: подтверждённые контакты и направления работы.", eyebrow: "Собственник офиса", h1: "Мария Воронина", lead: "Собственник офиса «Домиан · Шахты на Маяковского». На странице нет выдуманного стажа, рейтингов, наград или фотографии другого человека.", primaryCta: { label: "Позвонить Марии", href: ctx.site.phoneHref }, secondaryCta: { label: "Контакты офиса", href: "contacts.html" }, heroFacts: ["Шахты", "Маяковского 18А", "прямой контакт"] };
  const profile = `<section class="section"><div class="container profile-layout"><div class="owner-mark owner-mark--large"><span>МВ</span><small>место для реального портрета</small></div><div><p class="eyebrow">Подтверждённые данные</p><h2>Собственник офиса в Шахтах</h2><p>Мария представляет офис по адресу ${esc(ctx.site.address)}. Через сайт можно обратиться по вопросам подбора новых домов, вторичной недвижимости, продажи, оценки и ипотечного сценария.</p><dl class="profile-facts"><div><dt>Офис</dt><dd>${esc(ctx.site.displayName)}</dd></div><div><dt>Телефон</dt><dd><a href="${ctx.site.phoneHref}">${esc(ctx.site.phone)}</a></dd></div><div><dt>Email</dt><dd><a href="mailto:${esc(ctx.site.email)}">${esc(ctx.site.email)}</a></dd></div><div><dt>Город</dt><dd>Шахты</dd></div></dl></div></div></section>`;
  const roles = cardsSection(ctx, { kicker: "С чем обратиться", title: "Основные сценарии офиса", intro: "Конкретный состав работы уточняется после знакомства с задачей.", items: [
    { index: "01", title: "Новый частный дом", text: "Подбор и сравнение подтверждённых вариантов.", href: "construction.html" },
    { index: "02", title: "Продажа недвижимости", text: "Подготовка объекта и последовательности сделки.", href: "sell.html" },
    { index: "03", title: "Консультация", text: "Определить точку старта и список необходимых данных.", href: "contacts.html" }
  ] });
  return layout(ctx, page, `${hero(ctx, page)}${profile}${roles}${leadForm(ctx, { type: "service", title: "Написать в офис", text: "Форма пока не подключена к внешнему сервису; используйте телефон или email." })}`, { active: "contacts", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Мария Воронина", href: page.path }] });
}

export function renderContacts(ctx) {
  const page = { path: "contacts.html", pageType: "contact", title: "Контакты — Домиан · Шахты на Маяковского", description: "Адрес, телефон и email офиса «Домиан · Шахты на Маяковского», собственник Мария Воронина.", eyebrow: "Связаться с офисом", h1: "Начните с короткого разговора", lead: "Позвоните или напишите на email. Часы работы, мессенджеры и карты не опубликованы, пока владелец их не подтвердил.", primaryCta: { label: `Позвонить ${ctx.site.phone}`, href: ctx.site.phoneHref }, secondaryCta: { label: "Написать письмо", href: `mailto:${ctx.site.email}` }, heroFacts: ["Мария Воронина", "Шахты", "ул. Маяковского 18А"] };
  const contact = `<section class="section"><div class="container contact-grid"><article><span>01 · Телефон</span><h2><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></h2><p>Самый прямой способ обсудить задачу.</p></article><article><span>02 · Email</span><h2><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></h2><p>Подходит, если нужно отправить описание без чувствительных документов.</p></article><article><span>03 · Адрес</span><h2>${esc(ctx.site.address)}</h2><p>Часы посещения уточните по телефону.</p></article><article><span>04 · Собственник</span><h2><a href="${ctx.href("team/maria-voronina.html")}">Мария Воронина</a></h2><p>Собственник офиса в Шахтах.</p></article></div></section>`;
  const prepare = criteriaSection({ kicker: "Перед обращением", title: "Достаточно трёх вводных", intro: "Не отправляйте паспортные, банковские или иные чувствительные данные через форму.", items: ["что хотите купить, продать или оценить", "какая территория важна", "бюджет или желаемая последовательность"] });
  return layout(ctx, page, `${hero(ctx, page)}${contact}${prepare}${leadForm(ctx, { type: "service", title: "Оставить контакт для ответа", text: "В PRELAUNCH форма безопасно покажет прямые контакты вместо фиктивной отправки." })}`, { active: "contacts", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Контакты", href: page.path }] });
}

export function renderDetails(ctx) {
  const page = { path: "details.html", pageType: "legal", title: "Реквизиты — ИП Воронина Мария Петровна", description: "Юридические и банковские реквизиты ИП Ворониной Марии Петровны, офис Домиан в Шахтах.", h1: "Реквизиты", publishedAt: ctx.site.publishedAt, updatedAt: ctx.site.updatedAt };
  const body = `<section class="legal-hero"><div class="container"><p class="eyebrow">Юридическая информация</p><h1>Реквизиты</h1><p>Данные размещены на отдельной странице и не используются в маркетинговых блоках.</p></div></section><section class="section"><div class="container details-grid"><dl><div><dt>Наименование</dt><dd>${esc(ctx.site.legal.name)}</dd></div><div><dt>ИНН</dt><dd>${esc(ctx.site.legal.inn)}</dd></div><div><dt>ОГРНИП</dt><dd>${esc(ctx.site.legal.ogrnip)}</dd></div><div><dt>Адрес</dt><dd>${esc(ctx.site.address)}</dd></div><div><dt>Телефон</dt><dd><a href="${ctx.site.phoneHref}">${esc(ctx.site.phone)}</a></dd></div><div><dt>Email</dt><dd><a href="mailto:${esc(ctx.site.email)}">${esc(ctx.site.email)}</a></dd></div></dl><dl><div><dt>Расчётный счёт</dt><dd>${esc(ctx.site.bank.account)}</dd></div><div><dt>Банк</dt><dd>${esc(ctx.site.bank.name)}</dd></div><div><dt>Корреспондентский счёт</dt><dd>${esc(ctx.site.bank.correspondentAccount)}</dd></div><div><dt>БИК</dt><dd>${esc(ctx.site.bank.bic)}</dd></div></dl></div></section>`;
  return layout(ctx, page, body, { active: "contacts", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Реквизиты", href: page.path }] });
}

export function renderPrivacy(ctx) {
  const page = { path: "privacy.html", pageType: "legal", title: "Политика обработки персональных данных — Домиан Шахты", description: "Политика обработки персональных данных ИП Ворониной Марии Петровны для сайта офиса Домиан в Шахтах.", h1: "Политика обработки персональных данных", publishedAt: ctx.site.publishedAt, updatedAt: ctx.site.updatedAt };
  const sections = [
    ["1. Оператор", `${ctx.site.legal.name}, ИНН ${ctx.site.legal.inn}, ОГРНИП ${ctx.site.legal.ogrnip}. Контакты оператора: ${ctx.site.email}, ${ctx.site.phone}; адрес: ${ctx.site.address}.`],
    ["2. Какие данные предусмотрены формой", "Имя, номер телефона, тип запроса и необязательный комментарий. Не направляйте через форму паспортные данные, банковские реквизиты, документы на объект или специальные категории персональных данных."],
    ["3. Цель и основание обработки", "Данные запрашиваются для ответа на обращение, подготовки консультации и связи по выбранной пользователем задаче. Основание — согласие пользователя, выраженное отдельной отметкой перед отправкой формы."],
    ["4. PRELAUNCH-режим", "На этапе предварительного просмотра внешний провайдер формы не настроен. Введённые данные не отправляются с сайта и не сохраняются в браузере как клиентская база. Пользователю предлагаются телефон и email."],
    ["5. После подключения формы", "До включения внешнего провайдера владелец должен проверить договор, место хранения, трансграничную передачу и требования локализации по действующему законодательству. Политика и текст согласия должны быть обновлены под фактический процесс."],
    ["6. Срок и прекращение обработки", "После запуска данные должны храниться не дольше, чем требуется для цели обращения или исполнения обязанностей по закону. Пользователь вправе отозвать согласие и запросить сведения об обработке по контактам оператора."],
    ["7. Безопасность", "Оператор принимает необходимые правовые, организационные и технические меры для защиты персональных данных. Сайт не должен передавать персональные данные в аналитику."],
    ["8. Обновления", "Актуальная версия размещается на этой странице. Дата публикации и обновления: 19 августа 2026 года." ]
  ];
  const body = `<section class="legal-hero"><div class="container"><p class="eyebrow">Персональные данные</p><h1>${esc(page.h1)}</h1><p>PRELAUNCH-редакция с учётом того, что внешний сервис заявок пока не подключён.</p></div></section><article class="legal-content container">${sections.map(([title, text]) => `<section><h2>${esc(title)}</h2><p>${esc(text)}</p></section>`).join("")}<section><h2>Правовая основа</h2><p>Федеральный закон от 27.07.2006 № 152-ФЗ «О персональных данных» в актуальной редакции.</p><a href="https://ips.pravo.gov.ru/api/ips/legislation/document?baseid=None&amp;hash=98490812b3409e2a8d78a11ca9010f434ea3d9250a11dbbdb78690cd5551bdd6" target="_blank" rel="noopener noreferrer">Официальный текст закона</a></section></article>`;
  return layout(ctx, page, body, { breadcrumbs: [{ label: "Главная", href: "" }, { label: "Политика обработки данных", href: page.path }] });
}

export function renderThanks(ctx) {
  const page = { path: "thanks.html", pageType: "thanks", title: "Спасибо за обращение — Домиан Шахты", description: "Подтверждение обращения в офис Домиан в Шахтах и полезные следующие шаги.", h1: "Спасибо за обращение" };
  const body = `<section class="status-page"><div class="container status-card"><span class="status-code">✓</span><p class="eyebrow">Обращение принято</p><h1>Спасибо за обращение</h1><p>Эта страница используется только после подтверждённой отправки провайдером. В PRELAUNCH форма сюда не перенаправляет.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("")}">На главную</a><a class="button button--ghost" href="${ctx.href("guides/index.html")}">Открыть гайды</a></div></div></section>`;
  return layout(ctx, page, body);
}

export function render404(ctx) {
  const page = { path: "404.html", pageType: "error", title: "Страница не найдена — Домиан Шахты", description: "Запрошенная страница офиса «Домиан · Шахты на Маяковского» не найдена. Перейдите на главную или откройте раздел новых домов.", h1: "Страница не найдена" };
  const body = `<section class="status-page"><div class="container status-card"><span class="status-code">404</span><p class="eyebrow">Такой страницы нет</p><h1>Вернёмся к выбору недвижимости</h1><p>Ссылка могла измениться. Перейдите на главную, к новым домам или свяжитесь с офисом.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("")}">На главную</a><a class="button button--ghost" href="${ctx.href("construction.html")}">Новые дома</a></div><a class="text-link" href="${ctx.site.phoneHref}">${esc(ctx.site.phone)} ↗</a></div></section>`;
  return layout(ctx, page, body);
}

export { esc };
