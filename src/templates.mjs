import {
  NEARBY_AUTO_THRESHOLD,
  SEARCH_CATEGORIES,
  categoryForListing,
  isAvailableListing,
  localLocationSlugs,
  searchLocationInventory
} from "./listing-search.mjs";

const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const formatDate = (value) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));
const formatPrice = (value) => `${new Intl.NumberFormat("ru-RU").format(Number(value))} ₽`;

const primaryNavigation = [
  { key: "apartments", label: "Квартиры", children: [
    ["Все квартиры", "apartments.html", "apartments"],
    ["Вторичные квартиры", "secondary-apartments.html", "secondary-apartments"],
    ["Квартиры в новостройках", "new-build-apartments.html", "new-build-apartments"]
  ] },
  { key: "houses", label: "Дома", children: [
    ["Все дома", "houses.html", "houses"],
    ["Вторичные дома", "secondary-houses.html", "secondary-houses"],
    ["Новые готовые дома", "construction.html", "construction"],
    ["Дома от застройщиков", "builder-houses.html", "builder-houses"]
  ] },
  { key: "lands", label: "Участки", href: "lands.html" },
  { key: "new-build-apartments", label: "Новостройки", href: "new-build-apartments.html" },
  { key: "commercial", label: "Коммерция", href: "commercial.html" },
  { key: "garages-parking", label: "Гаражи и парковка", href: "garages-parking.html" },
  { key: "services", label: "Услуги", children: [
    ["Продажа недвижимости", "sell.html", "sell"],
    ["Предварительная оценка", "valuation.html", "valuation"],
    ["Помощь с ипотекой", "mortgage.html", "mortgage"],
    ["Подбор недвижимости", "index.html#request", "request"]
  ] }
];

function utilityNavigation(ctx) {
  return [
    { key: "locations", label: "Города и районы", children: [
      ...ctx.locations.map((location) => [location.name, `locations/${location.slug}.html`, location.slug]),
      ["Все территории", "locations/index.html", "locations"]
    ] },
    { key: "guides", label: "Полезные статьи", href: "guides/index.html" },
    { key: "company", label: "О компании", children: [
      ["Мария Воронина", "team/maria-voronina.html", "company"],
      ["Контакты офиса", "contacts.html", "contacts"],
      ["Реквизиты", "details.html", "details"]
    ] },
    { key: "contacts", label: "Контакты", href: "contacts.html" }
  ];
}

const socialChannels = [
  ["whatsapp", "WhatsApp", "whatsapp_click"],
  ["telegram", "Telegram", "telegram_click"],
  ["max", "MAX", "max_click"],
  ["instagram", "Instagram", "instagram_click"]
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

function socialLinks(ctx, className = "social-links") {
  const links = socialChannels
    .filter(([key]) => ctx.site.socials?.[key])
    .map(([key, label, event]) => `<a href="${esc(ctx.site.socials[key])}" target="_blank" rel="noopener noreferrer" data-analytics="${event}"><span>${label}</span><span aria-hidden="true">↗</span></a>`)
    .join("");
  return links ? `<div class="${className}" aria-label="Мессенджеры и социальные сети">${links}</div>` : "";
}

function ownerPortrait(ctx, modifier = "") {
  const person = ctx.team.find((item) => item.id === "maria-voronina");
  const image = person?.image;
  if (!image) return "";
  const srcset = image.srcset.map((source) => `${ctx.href(source.src)} ${source.width}w`).join(", ");
  return `<figure class="owner-portrait${modifier ? ` owner-portrait--${modifier}` : ""}">
    <picture><source type="image/webp" srcset="${srcset}" sizes="${modifier === "compact" ? "(max-width: 700px) 44vw, 220px" : "(max-width: 760px) calc(100vw - 48px), 520px"}"><img src="${ctx.href(image.fallback)}" width="${image.width}" height="${image.height}" alt="${esc(image.alt)}" loading="lazy" decoding="async"></picture>
    <figcaption><span>${esc(person.name)}</span><small>${esc(person.role)}</small></figcaption>
  </figure>`;
}

const editorialImages = {
  "main-hero": { widths: [720, 1200], width: 1200, height: 900, mobile: { src: "main-hero-mobile-600.webp", width: 600, height: 750 } },
  "apartments-editorial": { widths: [640, 960], width: 960, height: 720 },
  "modern-house": { widths: [640, 960], width: 960, height: 720 },
  "land-plots": { widths: [640, 960], width: 960, height: 720 },
  "new-buildings": { widths: [640, 960], width: 960, height: 720 },
  "secondary-apartment": { widths: [640, 960], width: 960, height: 720 },
  "commercial-space": { widths: [640, 960], width: 960, height: 720 },
  "family-house": { widths: [640, 960], width: 960, height: 720 },
  "mortgage-housing": { widths: [720, 1200], width: 1200, height: 675 },
  "sale-interior": { widths: [720, 1200], width: 1200, height: 675 },
  "real-land-plot": { widths: [720, 1200], width: 1200, height: 675 },
  "neighborhood": { widths: [720, 1200], width: 1200, height: 675 },
  "sell-property-cta": { widths: [960, 1440], width: 1440, height: 617 },
  "house-dark-cta": { widths: [960, 1440], width: 1440, height: 617 },
  "architecture-detail": { widths: [480, 800], width: 800, height: 800 },
  "house-yard": { widths: [640, 960], width: 960, height: 720 },
  "suburban-house": { widths: [640, 960], width: 960, height: 720 },
  "secondary-apartment-interior": { widths: [640, 960, 1440], width: 1440, height: 1080 },
  "modern-apartment-house": { widths: [640, 960], width: 960, height: 720 },
  "premium-living": { widths: [640, 960], width: 960, height: 720 },
  "keys-handover": { widths: [640, 960], width: 960, height: 720 },
  "client-meeting": { widths: [640, 960], width: 960, height: 720 },
  "newbuild-green": { widths: [640, 960], width: 960, height: 720 },
  "hero-modern-city-living": { widths: [720, 1200], width: 1200, height: 900, mobile: { src: "hero-modern-city-living-mobile-600.webp", width: 600, height: 750 } },
  "category-apartments": { widths: [640, 960], width: 960, height: 720 },
  "category-houses": { widths: [640, 960], width: 960, height: 720 },
  "category-new-buildings": { widths: [640, 960], width: 960, height: 720 },
  "category-land": { widths: [640, 960], width: 960, height: 720 },
  "category-commercial": { widths: [640, 960], width: 960, height: 720 },
  "category-parking": { widths: [640, 960], width: 960, height: 720 },
  "feature-new-homes": { widths: [720, 1200], width: 1200, height: 600 },
  "seller-valuation": { widths: [640, 960], width: 960, height: 720 },
  "garage-row": { widths: [640, 960], width: 960, height: 720 },
  "novoshakhtinsk-entry-sign": { widths: [640, 960], width: 960, height: 720 },
  "apartment-open-plan": { widths: [640, 960], width: 960, height: 720 },
  "land-plot-izhs": { widths: [640, 960], width: 960, height: 720 },
  "ayuta-entry-sign": { widths: [640, 960], width: 960, height: 720 },
  "regional-apartment-street": { widths: [640, 960], width: 960, height: 720 },
  "residential-parking": { widths: [640, 960], width: 960, height: 720 },
  "detached-brick-house": { widths: [640, 960], width: 960, height: 720 },
  "warehouse-loading-yard": { widths: [640, 960], width: 960, height: 720 },
  "krasny-sulin-entry-sign": { widths: [640, 960], width: 960, height: 720 },
  "kamenolomni-entry-sign": { widths: [640, 960], width: 960, height: 720 },
  "commercial-street-retail": { widths: [640, 960], width: 960, height: 720 },
  "ayuta-railway-station": { widths: [640, 960], width: 960, height: 720 },
  "secondary-houses-street": { widths: [640, 960], width: 960, height: 720 },
  "neighborhood-private-sector": { widths: [640, 960], width: 960, height: 720 },
  "apartment-block-neighborhood": { widths: [640, 960], width: 960, height: 720 }
};

function editorialImage(ctx, key, alt, { className = "", sizes = "(max-width: 760px) calc(100vw - 32px), 50vw", priority = false } = {}) {
  const image = editorialImages[key];
  if (!image) return "";
  const srcset = image.widths.map((width) => `${ctx.href(`assets/images/editorial/${key}-${width}.webp`)} ${width}w`).join(", ");
  const fallbackWidth = image.widths.at(-1);
  const mobileSource = image.mobile ? `<source media="(max-width: 600px)" type="image/webp" srcset="${ctx.href(`assets/images/editorial/${image.mobile.src}`)}" sizes="100vw">` : "";
  return `<picture${className ? ` class="${esc(className)}"` : ""} data-editorial-image="${esc(key)}">${mobileSource}<source type="image/webp" srcset="${srcset}" sizes="${esc(sizes)}"><img src="${ctx.href(`assets/images/editorial/${key}-${fallbackWidth}.webp`)}" width="${image.width}" height="${image.height}" alt="${esc(alt)}" loading="${priority ? "eager" : "lazy"}" decoding="async"${priority ? ' fetchpriority="high"' : ""}></picture>`;
}

const officeImages = {
  "office-interior": { widths: [640, 1200], width: 1200, height: 900 },
  "office-waiting-area": { widths: [640, 1200], width: 1200, height: 900 },
  "office-staircase": { widths: [640, 1200], width: 1200, height: 900 },
  "office-facade": { widths: [640, 1200], width: 1200, height: 900 }
};

function officeImage(ctx, key, alt, { className = "", sizes = "(max-width: 760px) calc(100vw - 32px), 50vw" } = {}) {
  const image = officeImages[key];
  if (!image) return "";
  const srcset = image.widths.map((width) => `${ctx.href(`assets/images/office/${key}-${width}.webp`)} ${width}w`).join(", ");
  const fallbackWidth = image.widths.at(-1);
  return `<picture${className ? ` class="${esc(className)}"` : ""}><source type="image/webp" srcset="${srcset}" sizes="${esc(sizes)}"><img src="${ctx.href(`assets/images/office/${key}-${fallbackWidth}.webp`)}" width="${image.width}" height="${image.height}" alt="${esc(alt)}" loading="lazy" decoding="async"></picture>`;
}

function listingPath(item) {
  return `listings/${item.id}.html`;
}

function listingPicture(ctx, image, { className = "", sizes = "(max-width: 760px) calc(100vw - 32px), 50vw", priority = false } = {}) {
  if (!image?.src) return "";
  const small = image.src.replace(/-1200\.webp$/u, "-640.webp");
  const srcset = small === image.src ? "" : `<source type="image/webp" srcset="${ctx.href(small)} 640w, ${ctx.href(image.src)} ${image.width}w" sizes="${esc(sizes)}">`;
  return `<picture${className ? ` class="${esc(className)}"` : ""}>${srcset}<img src="${ctx.href(image.src)}" width="${image.width}" height="${image.height}" alt="${esc(image.alt)}" loading="${priority ? "eager" : "lazy"}" decoding="async"${priority ? ' fetchpriority="high"' : ""}></picture>`;
}

function listingCategory(item) {
  if (["new-house", "house-new"].includes(item.type)) return "new-house";
  if (["resale-house", "house-secondary"].includes(item.type)) return "secondary-house";
  if (item.type === "house-builder") return "builder-house";
  if (["apartment", "apartment-secondary"].includes(item.type)) return "apartment-secondary";
  if (item.type === "apartment-newbuild") return "apartment-newbuild";
  if (item.type === "commercial") return "commercial";
  if (["garage", "parking-space"].includes(item.type)) return "garage-parking";
  return item.type;
}

function visibleListings(ctx) {
  return (ctx.listings || []).filter(isAvailableListing);
}

function listingCard(ctx, item, { hot = false, searchScope = "" } = {}) {
  const payment = (item.features || []).find((feature) => feature.startsWith("Ориентир по платежу"));
  const location = ctx.locations.find((candidate) => candidate.slug === item.location);
  const searchAttributes = searchScope ? ` data-location-listing data-search-scope="${esc(searchScope)}" data-listing-id="${esc(item.id)}" data-listing-location="${esc(item.location)}" data-listing-category="${esc(categoryForListing(item))}" data-listing-price="${Number.isFinite(item.price) ? esc(item.price) : ""}"` : "";
  return `<article class="listing-card${hot ? " listing-card--hot" : ""}"${searchAttributes} data-reveal>
    <a class="listing-card__media" href="${ctx.href(listingPath(item))}" data-analytics="property_card_open">${listingPicture(ctx, item.image, { sizes: hot ? "(max-width: 820px) calc(100vw - 32px), 52vw" : "(max-width: 760px) calc(100vw - 64px), 38vw" })}<span>${hot ? "Горячее предложение" : "Подтверждённый объект"}</span></a>
    <div class="listing-card__body"><p class="listing-card__location">${esc(location?.name || item.address || "Территория уточняется")}${item.address ? ` · ${esc(item.address)}` : ""}</p><h3><a href="${ctx.href(listingPath(item))}">${esc(item.title)}</a></h3><div class="listing-card__price">${Number.isFinite(item.price) ? formatPrice(item.price) : "Цена по запросу"}</div><p>${esc(item.description)}</p>${payment ? `<strong>${esc(payment.replace("Ориентир по платежу — ", ""))}</strong>` : ""}<a class="listing-card__cta" href="${ctx.href(listingPath(item))}">Смотреть объект <span aria-hidden="true">↗</span></a></div>
  </article>`;
}

function navigationItems(ctx, items, active, mobile = false) {
  return items.map((item) => {
    const childActive = item.children?.some((child) => child[2] === active);
    const current = item.key === active || childActive;
    if (!item.children) return `<a class="nav-link" href="${ctx.href(item.href)}"${current ? ' aria-current="page"' : ""}>${esc(item.label)}</a>`;
    return `<details class="nav-menu${mobile ? " nav-menu--mobile" : ""}" data-nav-menu><summary aria-expanded="false"${current ? ' aria-current="page"' : ""}>${esc(item.label)}</summary><div class="nav-menu__panel">${item.children.map(([label, href, key]) => `<a href="${ctx.href(href)}"${key === active ? ' aria-current="page"' : ""}>${esc(label)}</a>`).join("")}</div></details>`;
  }).join("");
}

function header(ctx, active) {
  return `<header class="site-header" data-site-header>
    <div class="container site-header__inner">
      <div class="site-header__top">
        ${brand(ctx)}
        <nav class="utility-nav" aria-label="Навигация по офису">${navigationItems(ctx, utilityNavigation(ctx), active)}</nav>
        <div class="header-actions"><a class="header-phone" href="${ctx.site.phoneHref}" data-analytics="phone_click"><span>Позвонить</span><strong>${esc(ctx.site.phone)}</strong></a><a class="button button--primary header-cta" href="${ctx.href("sell.html")}">Продать объект</a><button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-drawer" data-menu-toggle><span></span><span></span></button></div>
      </div>
      <nav class="category-nav" aria-label="Виды недвижимости">${navigationItems(ctx, primaryNavigation, active)}</nav>
    </div>
  </header><div class="mobile-drawer" id="mobile-drawer" aria-hidden="true" inert>
    <div class="mobile-drawer__scrim" data-drawer-close></div>
    <div class="mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Меню сайта">
      <div class="mobile-drawer__top">${brand(ctx)}<button class="icon-button mobile-drawer__close" type="button" aria-label="Закрыть меню" data-drawer-close>×</button></div>
      <nav class="mobile-drawer__nav" aria-label="Мобильная навигация"><div class="mobile-drawer__group"><span>Недвижимость</span>${navigationItems(ctx, primaryNavigation, active, true)}</div><div class="mobile-drawer__group"><span>Офис и материалы</span>${navigationItems(ctx, utilityNavigation(ctx), active, true)}</div><a class="button button--primary mobile-drawer__sell" href="${ctx.href("sell.html")}">Продать объект</a></nav>
      <div class="mobile-drawer__contact"><a class="button button--primary" href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a><span>${esc(ctx.site.address)}</span>${socialLinks(ctx, "social-links social-links--drawer")}</div>
    </div>
  </div>`;
}

function footer(ctx) {
  return `<footer class="site-footer">
    <div class="container footer-grid">
      <div class="footer-brand">${brand(ctx)}<p>Покупка, продажа и предварительная оценка недвижимости в Шахтах и соседних территориях.</p></div>
      <div><h2>Недвижимость</h2><a href="${ctx.href("apartments.html")}">Квартиры</a><a href="${ctx.href("houses.html")}">Дома</a><a href="${ctx.href("lands.html")}">Участки</a><a href="${ctx.href("commercial.html")}">Коммерческая</a><a href="${ctx.href("garages-parking.html")}">Гаражи и парковка</a></div>
      <div><h2>Клиентам</h2><a href="${ctx.href("sell.html")}">Продать</a><a href="${ctx.href("valuation.html")}">Оценка</a><a href="${ctx.href("mortgage.html")}">Ипотечный сценарий</a><a href="${ctx.href("guides/index.html")}">Полезные материалы</a></div>
      <div><h2>Офис</h2><a href="${ctx.href("team/maria-voronina.html")}">Мария Воронина</a><a href="${ctx.href("contacts.html")}">Контакты</a><a href="${ctx.href("details.html")}">Реквизиты</a><a href="${ctx.href("privacy.html")}">Обработка данных</a></div>
      <address><h2>Связаться</h2><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a><span>${esc(ctx.site.address)}</span>${socialLinks(ctx, "social-links social-links--footer")}</address>
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
  const heroImageKey = page.heroImage || ({
    home: "hero-house",
    construction: "hero-house",
    houses: "suburban-house",
    apartments: "premium-living",
    lands: "house-yard"
  })[page.slug || page.pageType];
  const visual = heroImageKey
    ? `<div class="hero-media" data-reveal>
        ${editorialImage(ctx, heroImageKey, page.heroImageAlt || "Современная жилая недвижимость", { className: "hero-media__picture", sizes: "(max-width: 820px) calc(100vw - 32px), 44vw", priority: true })}
        <div class="hero-media__caption"><span>${esc(page.heroMediaLabel || "Недвижимость")}</span><strong>${esc(page.heroMediaLocation || "Шахты и рядом")}</strong></div>
        <span class="hero-media__drawing" aria-hidden="true"></span>
      </div>`
    : `<div class="architectural-card" aria-label="Схема подбора нового дома" data-reveal>
        <span class="architectural-card__label">профиль дома</span>
        <div class="house-plan" aria-hidden="true"><span></span><span></span><span></span><span></span></div>
        <div class="architectural-card__meta"><span>объект</span><span>критерии</span><span>сделка</span></div>
        <strong>ШХ · 01</strong>
      </div>`;
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
          ${page.tertiaryCta ? `<a class="button button--text" href="${ctx.href(page.tertiaryCta.href)}">${esc(page.tertiaryCta.label)}</a>` : ""}
        </div>
        ${page.geoLinks ? `<nav class="hero-locations" aria-label="Территории работы">${ctx.locations.map((location) => `<a href="${ctx.href(`locations/${location.slug}.html`)}">${esc(location.name)}</a>`).join("")}</nav>` : page.geo ? `<p class="hero-geo">${esc(page.geo)}</p>` : ""}
        ${facts ? `<ul class="hero-facts">${facts}</ul>` : ""}
      </div>
      ${visual}
    </div>
  </section>`;
}

function homePropertySection(ctx) {
  const items = [
    ["Квартиры", "Вторичный рынок и новостройки", "apartments.html", "apartment", "category-apartments", "Светлый современный интерьер квартиры"],
    ["Дома", "Новые · вторичные · от застройщиков", "houses.html", "house", "category-houses", "Современный частный дом в жилом окружении"],
    ["Новостройки", "Квартиры в новых многоквартирных проектах", "new-build-apartments.html", "apartment-newbuild", "category-new-buildings", "Современный многоквартирный двор"],
    ["Участки", "ИЖС, коммуникации и жилое окружение", "lands.html", "land", "land-plot-izhs", "Свободный земельный участок в жилом окружении"],
    ["Коммерческая недвижимость", "Street-retail, офисы, склады и ПСН", "commercial.html", "commercial", "commercial-street-retail", "Коммерческое помещение с витринным фасадом"],
    ["Гаражи и парковка", "Гаражи, машиноместа и парковочные места", "garages-parking.html", "garage-parking", "category-parking", "Крытая парковка с размеченными местами"]
  ];
  return `<section class="section home-property" id="property-directions" data-home-section="property"><div class="container">
    ${sectionHeading({ kicker: "Недвижимость", title: "Весь основной рынок — без лишней сложности", intro: "Шесть направлений для покупки, продажи и предварительной оценки недвижимости." })}
    <div class="home-property__grid" data-reveal-group>${items.map(([title, text, href, category, image, alt], index) => `<a class="home-property-card" href="${ctx.href(href)}" data-lead-category="${category}" data-lead-label="${esc(title)}" data-reveal>${editorialImage(ctx, image, alt, { sizes: "(max-width: 600px) 46vw, (max-width: 1024px) 47vw, 31vw" })}<span class="home-property-card__veil" aria-hidden="true"></span><span class="home-property-card__number">${String(index + 1).padStart(2, "0")}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p><strong>Открыть направление ↗</strong></div></a>`).join("")}</div>
    <a class="new-homes-feature" href="${ctx.href("construction.html")}" data-lead-category="new-house" data-lead-label="Новые готовые дома" data-reveal>${editorialImage(ctx, "feature-new-homes", "Новый готовый дом с благоустроенным двором", { sizes: "(max-width: 820px) calc(100vw - 32px), 60vw" })}<span class="new-homes-feature__veil" aria-hidden="true"></span><div><p class="eyebrow">Сильное направление внутри домов</p><h3>Новые готовые дома</h3><p>Подберём готовый дом и поможем разобраться в комплектации, участке, коммуникациях и условиях покупки.</p><strong>Смотреть направление ↗</strong></div></a>
  </div></section>`;
}

function homeHotOffersSection(ctx) {
  const items = visibleListings(ctx).slice(0, 3);
  if (!items.length) return "";
  return `<section class="section home-hot-offers" id="hot-offers" data-home-section="hot-offers"><div class="container"><div class="section-heading"><div><p class="eyebrow">Горячие предложения</p><h2>Объекты, которые уже можно обсудить</h2></div><p>Цена и комплектация подтверждены собственником. Ипотечный платёж и схема расчётов уточняются индивидуально перед подачей заявки.</p></div><div class="home-hot-offers__grid" data-reveal-group>${items.map((item) => listingCard(ctx, item, { hot: true })).join("")}</div></div></section>`;
}

function homeRequestSection(ctx) {
  const typeOptions = requestTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const locationOptions = ctx.locations.map((location) => `<option value="${esc(location.name)}">${esc(location.name)}</option>`).join("");
  return `<section class="section home-request" id="request" data-home-section="request"><div class="container home-request__shell"><div class="home-request__intro"><p class="eyebrow">Подбор под ваш запрос</p><h2>Передайте критерии — соберём актуальные варианты</h2><p>Критерии останутся в форме, а предложения и характеристики будут проверяться на дату обращения.</p></div><form class="home-request__form" data-home-request-builder novalidate><label><span>Что ищете</span><select name="requestType" required><option value="">Выберите тип</option>${typeOptions}</select></label><label><span>Территория</span><select name="requestLocation"><option value="">Несколько территорий</option>${locationOptions}</select></label><label><span>Бюджет</span><select name="requestBudget"><option value="">Обсудить</option><option>до 2 млн ₽</option><option>2–4 млн ₽</option><option>4–7 млн ₽</option><option>7–10 млн ₽</option><option>10–15 млн ₽</option><option>свыше 15 млн ₽</option></select></label><label><span>Телефон</span><input name="requestPhone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 999 123-45-67"></label><button class="button button--primary" type="submit">Получить актуальную подборку</button><p class="home-request__status" data-home-request-status role="status" hidden></p></form><ol class="home-request__steps"><li><span>01</span><strong>Получаем критерии</strong><p>Тип, территория, бюджет и важные детали.</p></li><li><span>02</span><strong>Проверяем актуальность</strong><p>Уточняем предложения, цены и характеристики.</p></li><li><span>03</span><strong>Сравниваем варианты</strong><p>По условиям, документам и полному бюджету.</p></li></ol></div></section>`;
}

function homeSellerSection(ctx) {
  return `<section class="section home-seller" data-home-section="seller"><div class="container home-seller__layout"><div><p class="eyebrow">Собственникам</p><h2>Планируете продажу? Начнём с предварительного разбора</h2><p>Характеристики объекта, состояние, документы, локация и аналоги помогают определить обоснованный диапазон. Дальнейший порядок работы формируется после знакомства с объектом.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("valuation.html")}">Оценить недвижимость</a><a class="button button--ghost" href="${ctx.href("sell.html")}">Обсудить продажу</a></div><small>Без обещания точной онлайн-цены, срока продажи или гарантированной стоимости.</small></div><div class="home-seller__media">${editorialImage(ctx, "sell-property-cta", "Светлый интерьер подготовленной к продаже квартиры", { sizes: "(max-width: 820px) calc(100vw - 32px), 48vw" })}</div></div></section>`;
}

function homeLocationsSection(ctx) {
  return `<section class="section home-locations" data-home-section="locations"><div class="container"><div class="home-locations__heading"><div><p class="eyebrow">Территории</p><h2>Шахты и соседние территории</h2></div><p>Сравниваем конкретные адреса, маршруты и параметры недвижимости в каждой локации.</p></div><div class="home-locations__layout"><div class="home-locations__media">${editorialImage(ctx, "apartment-block-neighborhood", "Городская улица с современной многоквартирной застройкой", { sizes: "(max-width: 820px) calc(100vw - 32px), 42vw" })}</div><div class="home-locations__grid">${ctx.locations.map((location, index) => {
    const media = locationMedia[location.slug];
    return `<a class="home-location-card" href="${ctx.href(`locations/${location.slug}.html`)}">${editorialImage(ctx, media.card, media.cardAlt, { className: "home-location-card__media", sizes: "(max-width: 600px) 46vw, (max-width: 820px) 47vw, 18vw" })}<i class="home-location-card__veil" aria-hidden="true"></i><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(location.name)}</strong><small>${esc(location.administrativeName)}</small><b aria-hidden="true">↗</b></a>`;
  }).join("")}</div></div></div></section>`;
}

function homeExpertiseSection(ctx, guides) {
  const items = guides.slice(0, 3);
  return `<section class="section home-expertise" data-home-section="expertise"><div class="container">${sectionHeading({ kicker: "Локальная экспертиза", title: "Решения начинаются с контекста", intro: `Срез и материалы актуальны на ${formatDate(ctx.site.updatedAt)} Публичные объявления не равны уникальным объектам или завершённым сделкам.` })}<div class="home-expertise__grid">${items.map((guide, index) => `<a href="${ctx.href(`guides/${guide.slug}.html`)}"><span>${String(index + 1).padStart(2, "0")}</span><h3>${esc(guide.title)}</h3><p>${esc(guide.answer)}</p><strong>Читать материал ↗</strong></a>`).join("")}</div><a class="text-link" href="${ctx.href("guides/index.html")}">Все полезные материалы ↗</a></div></section>`;
}

function homeOfficeSection(ctx) {
  return `<section class="section owner-section home-office" data-home-section="office"><div class="container home-office__layout">${ownerPortrait(ctx)}<div><p class="eyebrow">Ваш офис недвижимости в Шахтах</p><h2>Мария Воронина и офис на Маяковского</h2><p>Начать можно с короткого разговора о задаче. На связи собственник офиса; состав работы определяется после знакомства с объектом или критериями подбора.</p><address><strong>${esc(ctx.site.address)}</strong><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></address><div class="owner-actions"><a class="button button--primary" href="${ctx.href("team/maria-voronina.html")}">Мария и направления</a><a class="button button--ghost" href="${ctx.href("contacts.html")}">Контакты офиса</a></div>${socialLinks(ctx, "social-links social-links--owner")}</div></div></section>`;
}

function homeLeadForm(ctx) {
  return `<section class="lead-section home-lead" id="lead-form-section" data-home-section="lead"><div class="container home-lead__layout"><div><p class="eyebrow">Короткий первый шаг</p><h2>Расскажите, какая задача стоит перед вами</h2><p>Выберите цель и оставьте телефон. В PRELAUNCH данные не отправляются наружу — форма сохранит введённое и подскажет прямые контакты.</p><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></div><form class="lead-form home-lead__form" data-lead-form data-lead-compact data-source-cta="home-final" novalidate><input type="hidden" name="service" value="service"><label>Телефон<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 999 123-45-67"></label><label>Задача<select name="goal" required><option value="buy">Купить</option><option value="sell">Продать</option><option value="valuation">Оценить</option><option value="consultation">Другое</option></select></label><label class="consent"><input name="privacy_consent" type="checkbox" required><span>Согласен(на) на обработку данных по <a href="${ctx.href("privacy.html")}">политике</a>.</span></label><p class="form-status" data-form-status role="status" hidden></p><button class="button button--primary" type="submit">Передать обращение</button><p class="form-note">Отправка включится после отдельной проверки провайдера. Сейчас используйте телефон или email.</p></form></div></section>`;
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
    <div class="criteria-copy" data-reveal><p class="eyebrow">${esc(section.kicker || "")}</p><h2>${esc(section.title || "")}</h2>${section.intro ? `<p class="criteria-intro">${esc(section.intro)}</p>` : ""}</div>
    <ol class="criteria-list" data-reveal-group>${section.items.map((item, index) => `<li data-reveal><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(item)}</strong></li>`).join("")}</ol>
  </div></section>`;
}

const requestTypes = [
  ["apartment", "Квартира"],
  ["house", "Дом"],
  ["land", "Земельный участок"],
  ["commercial", "Коммерческая недвижимость"],
  ["garage-parking", "Гараж или парковочное место"]
];

function requestBuilder(ctx, { defaultType = "", defaultMarket = "", defaultGoal = "buy", compact = false } = {}) {
  const typeOptions = requestTypes.map(([value, label]) => `<option value="${value}"${value === defaultType ? " selected" : ""}>${label}</option>`).join("");
  const locationOptions = ctx.locations.map((location) => `<option value="${esc(location.name)}">${esc(location.name)}</option>`).join("");
  return `<form class="request-builder${compact ? " request-builder--compact" : ""}" data-request-builder aria-label="Конструктор заявки на подбор недвижимости">
    <label><span>Цель обращения</span><select name="requestGoal" required><option value="buy"${defaultGoal === "buy" ? " selected" : ""}>Купить</option><option value="sell"${defaultGoal === "sell" ? " selected" : ""}>Продать</option><option value="valuation"${defaultGoal === "valuation" ? " selected" : ""}>Предварительно оценить</option></select></label>
    <label><span>Тип недвижимости</span><select name="requestType" required><option value="">Выберите направление</option>${typeOptions}</select></label>
    <label data-request-field="market"><span>Рынок</span><select name="requestMarket"><option value="">Не определено</option><option value="secondary"${defaultMarket === "secondary" ? " selected" : ""}>Вторичный</option><option value="primary"${defaultMarket === "primary" ? " selected" : ""}>Первичный / новый объект</option></select></label>
    <label><span>Территория</span><select name="requestLocation"><option value="">Рассмотрю несколько</option>${locationOptions}</select></label>
    <label><span>Бюджет</span><select name="requestBudget"><option value="">Обсудить</option><option>до 2 млн ₽</option><option>2–4 млн ₽</option><option>4–7 млн ₽</option><option>7–10 млн ₽</option><option>10–15 млн ₽</option><option>свыше 15 млн ₽</option></select></label>
    <label data-request-field="apartment"><span>Комнаты</span><select name="requestRooms"><option value="">Не определено</option><option value="studio">Студия</option><option value="1">1</option><option value="2">2</option><option value="3+">3 и больше</option></select></label>
    <label data-request-field="house"><span>Площадь дома</span><select name="requestArea"><option value="">Не определено</option><option>до 80 м²</option><option>80–120 м²</option><option>120–180 м²</option><option>от 180 м²</option></select></label>
    <label data-request-field="land house"><span>Размер участка</span><select name="requestLand"><option value="">Не определено</option><option>до 5 соток</option><option>5–8 соток</option><option>8–12 соток</option><option>от 12 соток</option></select></label>
    <label data-request-field="commercial"><span>Коммерческий тип</span><select name="requestCommercial"><option value="">Уточнить</option><option>Свободное назначение</option><option>Торговое помещение</option><option>Офис</option><option>Склад</option><option>Производственный объект</option><option>Коммерческий участок</option></select></label>
    <label data-request-field="garage-parking"><span>Гараж или место</span><select name="requestParking"><option value="">Уточнить</option><option>Гараж</option><option>Машиноместо</option><option>Парковочное место</option></select></label>
    <div class="request-builder__action"><button class="button button--primary" type="submit">Передать критерии</button><small>Офис уточнит направление и предложит следующий шаг.</small></div>
    <p class="request-builder__status" data-request-builder-status role="status" hidden></p>
  </form>`;
}

function quickFilterSection(ctx) {
  return `<section class="quick-search" id="quick-search"><div class="container quick-search__shell" data-reveal>
    <div class="quick-search__intro"><p class="eyebrow">Быстрый подбор</p><h2>Соберите запрос за минуту</h2><p>Критерии автоматически перейдут в форму обращения.</p></div>
    ${requestBuilder(ctx)}
  </div></section>`;
}

function showcaseCard(ctx, item) {
  return `<article class="showcase-card" data-showcase-card data-category="${esc(item.category)}" data-reveal>
    <div class="showcase-card__media">
      ${editorialImage(ctx, item.image, item.imageAlt, { sizes: "(max-width: 600px) calc(100vw - 64px), (max-width: 1024px) 44vw, 30vw" })}
    </div>
    <div class="showcase-card__body">
      <p class="showcase-card__category">${esc(item.categoryLabel)}</p>
      <h3>${esc(item.title)}</h3>
      <p>${esc(item.text)}</p>
      <a class="showcase-card__cta" href="#lead-form-section" data-lead-category="${esc(item.category)}" data-lead-label="${esc(item.title)}">Получить актуальную подборку <span aria-hidden="true">↗</span></a>
    </div>
  </article>`;
}

function showcaseGrid(ctx, items) {
  return `<div class="showcase-grid" data-showcase-grid data-reveal-group>${items.map((item) => showcaseCard(ctx, item)).join("")}</div>`;
}

function showcaseSection(ctx) {
  const items = ctx.showcase || [];
  const filters = [
    ["all", "Все направления"],
    ["apartment-secondary", "Вторичные квартиры"],
    ["apartment-newbuild", "Новостройки"],
    ["new-house", "Новые дома"],
    ["secondary-house", "Вторичные дома"],
    ["land", "Участки"],
    ["commercial", "Коммерция"],
    ["garage-parking", "Гаражи и парковка"]
  ];
  return `<section class="section showcase-section" id="showcase"><div class="container">
    ${sectionHeading({ kicker: "Навигатор рынка", title: "Направления подбора недвижимости", intro: "Десять карточек помогают быстро выбрать нужный сегмент рынка и перейти к подходящему запросу." })}
    <div class="showcase-filter" data-showcase-filters aria-label="Фильтр витрины">${filters.map(([value, label], index) => `<button type="button" data-showcase-filter="${value}"${index === 0 ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"'}>${label}</button>`).join("")}</div>
    ${showcaseGrid(ctx, items)}
  </div></section>`;
}

function propertyDirectionsSection(ctx) {
  const items = [
    { category: "apartment", title: "Квартиры", text: "Вторичный рынок и новостройки, от студий до квартир с тремя и более комнатами.", href: "apartments.html", label: "Выбрать квартиру", image: "modern-apartment-house", alt: "Современный многоквартирный дом" },
    { category: "new-house", title: "Новые дома", text: "Готовность, комплектация, инженерия, участок и документы.", href: "construction.html", label: "Смотреть новые дома", image: "detached-brick-house", alt: "Современный одноэтажный кирпичный дом" },
    { category: "house", title: "Дома", text: "Новые, вторичные, от застройщиков и дома с участком.", href: "houses.html", label: "Выбрать формат дома", image: "category-houses", alt: "Частный дом в жилом окружении" },
    { category: "land", title: "Участки", text: "Под строительство, с коммуникациями или существующим домом.", href: "lands.html", label: "Выбрать участок", image: "land-plot-izhs", alt: "Свободный земельный участок в частном секторе" },
    { category: "commercial", title: "Коммерческая недвижимость", text: "ПСН, торговля, офисы, склады, производство и коммерческая земля.", href: "commercial.html", label: "Описать задачу бизнеса", image: "commercial-street-retail", alt: "Коммерческое помещение с витринным фасадом" },
    { category: "garage-parking", title: "Гаражи и парковка", text: "Гаражи, машиноместа и парковочные места с проверкой статуса и доступа.", href: "garages-parking.html", label: "Выбрать формат", image: "garage-row", alt: "Ряд кирпичных гаражей с металлическими воротами" }
  ];
  return `<section class="section directions-section" id="property-directions"><div class="container">
    ${sectionHeading({ kicker: "Основные виды недвижимости", title: "Весь основной рынок — в понятных направлениях", intro: "Квартиры и вторичный рынок видны сразу. Новые дома остаются сильным самостоятельным направлением." })}
    <div class="direction-grid" data-reveal-group>${items.map((item, index) => `<a class="direction-card${index === 0 ? " direction-card--featured" : ""}" href="${ctx.href(item.href)}" data-lead-category="${esc(item.category)}" data-lead-label="${esc(item.title)}" data-reveal>
      ${editorialImage(ctx, item.image, item.alt, { sizes: index === 0 ? "(max-width: 820px) calc(100vw - 32px), 52vw" : "(max-width: 820px) calc(100vw - 32px), 24vw" })}
      <span class="direction-card__veil" aria-hidden="true"></span><span class="direction-card__number">${String(index + 1).padStart(2, "0")}</span>
      <div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><strong>${esc(item.label)} ↗</strong></div>
    </a>`).join("")}</div>
  </div></section>`;
}

function homeScenariosSection(ctx) {
  const items = [
    { index: "01", title: "Вторичная квартира", text: "Сравнить дом, планировку, состояние, право и полный бюджет.", image: "secondary-apartment-interior", category: "apartment-secondary", href: "secondary-apartments.html" },
    { index: "02", title: "Новый готовый дом", text: "Проверить фактическую готовность, участок, инженерию и передачу.", image: "hero-house", category: "new-house", href: "construction.html" },
    { index: "03", title: "Коммерческий запрос", text: "Связать формат помещения с деятельностью, доступом и мощностями.", image: "client-meeting", category: "commercial", href: "commercial.html" }
  ];
  return `<section class="section section--ink scenarios-section"><div class="container">
    ${sectionHeading({ kicker: "Разные задачи", title: "Один офис — разные сценарии рынка", intro: "Начинаем с типа недвижимости и цели, затем собираем применимые критерии." })}
    <div class="scenario-grid" data-reveal-group>${items.map((item) => `<article class="scenario-card" data-reveal>
      ${editorialImage(ctx, item.image, item.title, { sizes: "(max-width: 760px) calc(100vw - 32px), 31vw" })}
      <div><span>${item.index}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${ctx.href(item.href)}" data-lead-category="${esc(item.category)}" data-lead-label="${esc(item.title)}">Открыть направление ↗</a></div>
    </article>`).join("")}</div>
  </div></section>`;
}

function sellerSection(ctx) {
  return `<section class="section seller-section"><div class="container seller-layout">
    <div class="seller-media" data-reveal>${editorialImage(ctx, "client-meeting", "Деловая встреча по документам", { sizes: "(max-width: 820px) calc(100vw - 32px), 46vw" })}<span>Продажа · оценка · встречная покупка</span></div>
    <div data-reveal><p class="eyebrow">Для собственника</p><h2>Продажа — часть следующего решения</h2><p>Подготовим объект, объясним логику оценки и свяжем сроки продажи с покупкой дома или квартиры. Без обещания цены и срока до изучения исходных данных.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("sell.html")}">План продажи</a><a class="button button--ghost" href="${ctx.href("valuation.html")}">Начать с оценки</a></div></div>
  </div></section>`;
}

function faqSection() {
  const items = [
    ["Как получить актуальные цены и адреса?", "Оставьте критерии подбора — офис уточнит доступные предложения и характеристики на дату обращения."],
    ["Можно запросить сразу несколько территорий?", "Да. В конструкторе можно оставить географию открытой, а затем сравнить Шахты, Каменоломни, Новошахтинск, Аюту и Красный Сулин по вашим критериям."],
    ["Агентство строит дома?", "Нет. Офис помогает подобрать готовый дом, предложение от застройщика, участок и сценарий строительства, а также проверить документы и сопроводить сделку."],
    ["Что достаточно указать для первого подбора?", "Тип недвижимости, территорию и бюджет. Площадь, комнаты и параметры участка можно уточнить сразу или во время разговора."],
    ["С какими типами недвижимости работает офис?", "С квартирами, домами, новостройками, участками, коммерческой недвижимостью, гаражами и парковочными местами — для покупки, продажи или предварительной оценки."],
    ["Можно связать продажу своей недвижимости со следующей покупкой?", "Можно предварительно разобрать последовательность. Конкретный порядок определяется после изучения объектов, участников и условий."]
  ];
  return `<section class="section faq-section"><div class="container faq-layout"><div><p class="eyebrow">Коротко о главном</p><h2>Ответы до первого звонка</h2><p>Если вопрос зависит от конкретного объекта или документов, честный ответ появится после уточнения данных.</p></div><div class="faq-list">${items.map(([question, answer], index) => `<details${index === 0 ? " open" : ""}><summary>${esc(question)}<span aria-hidden="true">+</span></summary><p>${esc(answer)}</p></details>`).join("")}</div></div></section>`;
}

function catalogSection(ctx, section) {
  const showcaseTypes = section.showcaseTypes || [];
  const items = (ctx.showcase || []).filter((item) => !showcaseTypes.length || showcaseTypes.includes(item.category));
  const realListings = visibleListings(ctx).filter((item) => !showcaseTypes.length || showcaseTypes.includes(listingCategory(item)));
  const defaultType = ({
    "apartment-secondary": "apartment",
    "apartment-newbuild": "apartment",
    "new-house": "house",
    "builder-house": "house",
    "secondary-house": "house",
    land: "land",
    commercial: "commercial",
    "garage-parking": "garage-parking"
  })[showcaseTypes[0]] || "";
  const defaultMarket = showcaseTypes.some((type) => ["apartment-secondary", "secondary-house"].includes(type)) ? "secondary" : (showcaseTypes.some((type) => ["apartment-newbuild", "new-house", "builder-house"].includes(type)) ? "primary" : "");
  const listingResult = realListings.length ? `<p class="catalog-count">Подтверждённые объекты: <strong>${realListings.length}</strong></p><div class="listing-grid" data-reveal-group>${realListings.map((item) => listingCard(ctx, item)).join("")}</div>` : `<div class="catalog-honesty"><span aria-hidden="true">↗</span><div><h3>${esc(section.emptyTitle)}</h3><p>${esc(section.emptyText)}</p></div></div>`;
  return `<section class="section section--stone"><div class="container">
    ${sectionHeading(section)}
    <div class="catalog-shell">
      ${requestBuilder(ctx, { defaultType, defaultMarket, compact: true })}
      ${listingResult}
      <div class="catalog-directions"><p class="eyebrow">${realListings.length ? "Другие направления" : "Направления подбора"}</p></div>
      ${showcaseGrid(ctx, items)}
      <div class="catalog-followup"><p>Расскажите о приоритетах — офис уточнит актуальные варианты и предложит следующий шаг.</p><a class="button button--primary" href="#lead-form-section" data-lead-category="${esc(showcaseTypes[0] || defaultType)}">${esc(section.cta)}</a></div>
    </div>
  </div></section>`;
}

const locationMedia = {
  shakhty: { card: "regional-apartment-street", hero: "regional-apartment-street", cardAlt: "Городская улица с многоквартирными домами", heroAlt: "Городская жилая улица с многоквартирными домами" },
  kamenolomni: { card: "kamenolomni-entry-sign", hero: "kamenolomni-entry-sign", cardAlt: "Въездная стела с надписью «Каменоломни»", heroAlt: "Въездная стела с надписью «Каменоломни»" },
  novoshakhtinsk: { card: "novoshakhtinsk-entry-sign", hero: "novoshakhtinsk-entry-sign", cardAlt: "Въездная стела с надписью «Новошахтинск»", heroAlt: "Въездная стела с надписью «Новошахтинск»" },
  ayutinskiy: { card: "ayuta-entry-sign", hero: "ayuta-railway-station", cardAlt: "Въездная стела с надписью «Аюта»", heroAlt: "Железнодорожная станция со стелой «Аюта»" },
  "krasnyy-sulin": { card: "krasny-sulin-entry-sign", hero: "krasny-sulin-entry-sign", cardAlt: "Въездная стела с надписью «Красный Сулин»", heroAlt: "Въездная стела с надписью «Красный Сулин»" }
};

function darkHouseCta(ctx) {
  return `<section class="section house-dark-cta"><div class="container"><div class="house-dark-cta__card">${editorialImage(ctx, "house-dark-cta", "Современный дом в вечернем освещении", { className: "house-dark-cta__media", sizes: "(max-width: 820px) calc(100vw - 32px), 70vw" })}<div class="house-dark-cta__copy"><p class="eyebrow">Консультация по дому</p><h2>Соберём критерии до просмотра</h2><p>Разберём готовность, участок, инженерные системы и документы.</p><a class="button button--primary" href="${ctx.href("construction.html#lead-form-section")}">Обсудить задачу</a></div></div></div></section>`;
}

function locationCards(ctx, detailed = false) {
  return `<div class="location-grid${detailed ? " location-grid--detailed" : ""}" data-reveal-group>${ctx.locations.map((location, index) => `<a class="location-card" href="${ctx.href(`locations/${location.slug}.html`)}" data-location="${esc(location.slug)}" data-reveal>
    <div class="location-card__media">${editorialImage(ctx, locationMedia[location.slug].card, locationMedia[location.slug].cardAlt, { sizes: detailed ? "(max-width: 820px) calc(100vw - 32px), 47vw" : "(max-width: 820px) calc(100vw - 32px), 22vw" })}<span class="location-card__index">${String(index + 1).padStart(2, "0")}</span></div>
    <div class="location-card__body"><h${detailed ? "2" : "3"}>${esc(location.name)}</h${detailed ? "2" : "3"}><p>${esc(detailed ? location.context : location.administrativeName)}</p><strong>${esc(detailed ? location.kicker : "Подобрать в этой территории")} ↗</strong></div>
  </a>`).join("")}</div>`;
}

function locationsSection(ctx, section) {
  return `<section class="section location-section"><div class="container">${sectionHeading(section)}${locationCards(ctx)}</div></section>`;
}

function processSection(section) {
  return `<section class="section section--stone"><div class="container">${sectionHeading(section)}<ol class="process-line" data-reveal-group>${section.items.map((item, index) => `<li data-reveal><span>${String(index + 1).padStart(2, "0")}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></li>`).join("")}</ol></div></section>`;
}

function splitSection(ctx, section) {
  return `<section class="section"><div class="container">${sectionHeading(section)}<div class="split-cards"><article class="split-card split-card--sage"><h3>${esc(section.left.title)}</h3><p>${esc(section.left.text)}</p><a class="text-link" href="${ctx.href(section.left.href)}">${esc(section.left.label)} ↗</a></article><article class="split-card"><h3>${esc(section.right.title)}</h3><p>${esc(section.right.text)}</p><a class="text-link" href="${ctx.href(section.right.href)}">${esc(section.right.label)} ↗</a></article></div></div></section>`;
}

function mortgageSection(ctx) {
  return `<section class="section section--ink" id="mortgage-calculator"><div class="container mortgage-layout">
    <div class="mortgage-layout__intro"><div><p class="eyebrow">Ориентировочный расчёт</p><h2>Введите свои условия</h2><p>Ставка не подставлена намеренно: используйте значение, которое получили из актуального предложения банка. Расчёт не учитывает страховки, комиссии и изменение условий.</p></div>${editorialImage(ctx, "mortgage-housing", "Современный жилой комплекс", { className: "mortgage-layout__media", sizes: "(max-width: 820px) calc(100vw - 32px), 34vw" })}</div>
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
  if (section.kind === "mortgage") return mortgageSection(ctx);
  return "";
}

function leadForm(ctx, form = {}) {
  const goals = [["buy", "Купить"], ["sell", "Продать"], ["valuation", "Предварительно оценить"], ["consultation", "Обсудить другую задачу"]];
  const locationOptions = ctx.locations.map((location) => `<option value="${esc(location.name)}"${location.name === form.territory ? " selected" : ""}>${esc(location.name)}</option>`).join("");
  const defaultGoal = form.goal || ({ sell: "sell", valuation: "valuation" })[form.type] || "buy";
  const defaultPropertyType = form.propertyType || ({ apartment: "apartment", "apartment-secondary": "apartment", "apartment-newbuild": "apartment", house: "house", "house-new": "house", "house-secondary": "house", "house-builder": "house", land: "land", commercial: "commercial", "garage-parking": "garage-parking" })[form.type] || "";
  return `<section class="lead-section" id="lead-form-section"><div class="container lead-layout">
    <div><p class="eyebrow">Короткий первый шаг</p><h2>${esc(form.title || "Обсудить задачу")}</h2><p>${esc(form.text || "Расскажите, что нужно решить.")}</p><div class="direct-contact"><span>${ctx.site.mode === "prelaunch" ? "В PRELAUNCH форма не отправляет данные наружу." : "Можно также связаться с офисом напрямую."}</span><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></div></div>
    <form class="lead-form" data-lead-form data-source-cta="${esc(form.type || "contact")}" data-origin-page="${esc(form.originPage || "")}"${form.territory ? ` data-default-territory="${esc(form.territory)}"` : ""} novalidate>
      <div class="honeypot" aria-hidden="true"><label>Не заполняйте<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off"></label></div>
      <input type="hidden" name="service" value="${esc(form.type || "service")}">
      <label>Имя<input name="name" type="text" autocomplete="name" minlength="2" required placeholder="Как к вам обращаться"></label>
      <label>Телефон<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 999 123-45-67"></label>
      <label>Цель обращения<select name="goal" required>${goals.map(([value, label]) => `<option value="${value}"${value === defaultGoal ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label>Тип недвижимости<select name="property_type" required><option value="">Выберите тип</option>${requestTypes.map(([value, label]) => `<option value="${value}"${value === defaultPropertyType ? " selected" : ""}>${label}</option>`).join("")}</select></label>
      <label data-lead-market>Рынок<select name="market"><option value="">Не определено</option><option value="secondary"${form.market === "secondary" ? " selected" : ""}>Вторичный</option><option value="primary"${form.market === "primary" ? " selected" : ""}>Первичный / новый объект</option></select></label>
      <label>Территория<select name="territory"><option value="">Несколько территорий</option>${locationOptions}</select></label>
      <label class="lead-form__message">Комментарий <span>необязательно</span><textarea name="message" rows="4" placeholder="Бюджет, площадь, комнаты или ваша ситуация"></textarea></label>
      <label class="consent"><input name="privacy_consent" type="checkbox" required><span>Согласен(на) на обработку данных по <a href="${ctx.href("privacy.html")}">политике</a>.</span></label>
      <p class="form-status" data-form-status role="status" hidden></p>
      <button class="button button--primary" type="submit">Передать обращение</button>
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
    sameAs: Object.values(ctx.site.socials || {}),
    address: { "@type": "PostalAddress", addressLocality: "Шахты", streetAddress: "ул. Маяковского 18А", addressRegion: "Ростовская область", addressCountry: "RU" },
    areaServed: ctx.site.serviceAreas.map((name) => ({ "@type": "Place", name }))
  };
  if (ctx.site.mode === "production") {
    organization["@id"] = `${ctx.site.productionOrigin.replace(/\/$/u, "")}/#organization`;
    organization.url = ctx.absolute("");
  }
  const nodes = [organization];
  if (page.pageType === "person") {
    const person = { "@type": "Person", name: ctx.site.owner.name, jobTitle: ctx.site.owner.role, telephone: ctx.site.phone, email: ctx.site.email, sameAs: Object.values(ctx.site.socials || {}), worksFor: ctx.site.mode === "production" ? { "@id": organization["@id"] } : { "@type": "RealEstateAgent", name: ctx.site.displayName } };
    if (ctx.site.mode === "production") person["@id"] = `${ctx.absolute("team/maria-voronina.html")}#person`;
    nodes.push(person);
  } else if (page.pageType === "guide") {
    const article = { "@type": "Article", headline: page.h1 || page.title, description: page.description, datePublished: page.publishedAt, dateModified: page.updatedAt };
    if (ctx.site.mode === "production") { article.url = ctx.absolute(page.path); article.publisher = { "@id": organization["@id"] }; }
    nodes.push(article);
  } else if (page.pageType === "listing" && page.listing) {
    const offer = { "@type": "Offer", price: page.listing.price, priceCurrency: "RUB", availability: "https://schema.org/InStock", itemOffered: { "@type": "House", name: page.listing.title, description: page.listing.description, address: { "@type": "PostalAddress", addressLocality: "Каменоломни", addressRegion: "Ростовская область", addressCountry: "RU" }, image: [page.listing.image, ...(page.listing.gallery || [])].map((image) => ctx.site.mode === "production" ? ctx.absolute(image.src) : ctx.href(image.src)) } };
    if (ctx.site.mode === "production") offer.url = ctx.absolute(page.path);
    nodes.push(offer);
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
  const heroPreload = page.pageType === "home" ? '<link rel="preload" as="image" href="' + ctx.href("assets/images/editorial/main-hero-1200.webp") + '" imagesrcset="' + ctx.href("assets/images/editorial/main-hero-720.webp") + ' 720w, ' + ctx.href("assets/images/editorial/main-hero-1200.webp") + ' 1200w" imagesizes="(max-width: 820px) calc(100vw - 32px), 44vw" media="(min-width: 601px)"><link rel="preload" as="image" href="' + ctx.href("assets/images/editorial/main-hero-mobile-600.webp") + '" media="(max-width: 600px)">' : "";
  return `<meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="${ctx.site.mode === "prelaunch" ? "noindex,nofollow" : "index,follow"}">
  <meta name="description" content="${esc(page.description)}">
  <meta name="theme-color" content="#29383a">
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
  <meta property="og:image:alt" content="Домиан Шахты — недвижимость в жемчужной, мятной, шалфейной и шампанской палитре">` : ""}
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${esc(page.title)}">
  <meta name="twitter:description" content="${esc(page.description)}">
  ${ogImage ? `<meta name="twitter:image" content="${ogImage}">` : ""}
   ${heroPreload}
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
  const body = `${hero(ctx, page)}${page.sections.map((section) => renderSection(ctx, section)).join("")}${page.slug === "construction" ? darkHouseCta(ctx) : ""}${leadForm(ctx, page.form)}`;
  const active = page.slug;
  return layout(ctx, page, body, { active, breadcrumbs: crumbs });
}

export function renderHome(ctx, guides) {
  const page = { path: "", pageType: "home", title: "Недвижимость в Шахтах — купить, продать, оценить | Домиан", description: "Покупка, продажа и предварительная оценка квартир, домов, новостроек, участков, коммерческой недвижимости, гаражей и парковочных мест в Шахтах и рядом.", eyebrow: "Домиан · Шахты на Маяковского", h1: "Недвижимость в Шахтах — спокойно и по делу", lead: "Квартиры, дома, новостройки, участки и коммерческая недвижимость. Покупка, продажа и предварительная оценка — в одном офисе на Маяковского.", primaryCta: { label: "Подобрать недвижимость", href: "#request" }, secondaryCta: { label: "Продать объект", href: "sell.html" }, tertiaryCta: { label: "Оценить стоимость", href: "valuation.html" }, geoLinks: true, heroImage: "main-hero", heroImageAlt: "Современная жилая недвижимость", heroMediaLabel: "Современная городская жизнь" };
  const body = `${hero(ctx, page)}${homePropertySection(ctx)}${homeHotOffersSection(ctx)}${homeRequestSection(ctx)}${homeSellerSection(ctx)}${homeLocationsSection(ctx)}${homeExpertiseSection(ctx, guides)}${homeOfficeSection(ctx)}${homeLeadForm(ctx)}`;
  return layout(ctx, page, body, { active: "" });
}

export function renderLocationsIndex(ctx) {
  const page = { path: "locations/index.html", pageType: "location", title: "География работы — Шахты и соседние территории", description: "Шахты, Каменоломни, Новошахтинск, микрорайон Аютинский города Шахты и Красный Сулин: покупка, продажа и оценка недвижимости.", eyebrow: "Пять территорий", h1: "Недвижимость в Шахтах и рядом", lead: "Сравниваем конкретные адреса, типы недвижимости и ежедневные маршруты в пяти территориях.", primaryCta: { label: "Выбрать территорию", href: "#locations" }, secondaryCta: { label: "Виды недвижимости", href: "apartments.html" }, heroFacts: ["Шахты", "Каменоломни", "Новошахтинск · Аюта · Красный Сулин"], heroImage: "modern-apartment-house" };
  const cards = `<section class="section location-section" id="locations"><div class="container">${locationCards(ctx, true)}</div></section>`;
  const method = criteriaSection({ kicker: "Как сравнивать", title: "Одинаковая таблица — разные выводы", intro: "Сравнивайте конкретные адреса и типы объектов, а не названия территорий.", items: ["цель покупки или продажи", "тип и характеристики объекта", "ежедневные маршруты", "состояние и доступ", "документы", "полный бюджет"] });
  const body = `${hero(ctx, page)}${cards}${method}${leadForm(ctx, { type: "service", goal: "buy", title: "Сравнить территории под ваш запрос", text: "Назовите тип недвижимости, ключевые маршруты и критерии — офис поможет определить следующий шаг." })}`;
  return layout(ctx, page, body, { active: "locations", breadcrumbs: [{ label: "Главная", href: "" }, { label: "География", href: page.path }] });
}

function locationSearchSection(ctx, location) {
  const available = visibleListings(ctx);
  const localSlugs = new Set(localLocationSlugs(location.slug));
  const neighborSlugs = new Set(location.neighbors || []);
  const localCandidates = available.filter((item) => localSlugs.has(item.location));
  const localIds = new Set(localCandidates.map((item) => item.id));
  const nearbyCandidates = available.filter((item) => neighborSlugs.has(item.location) && !localIds.has(item.id));
  const initial = searchLocationInventory(available, location);
  const typeOptions = Object.entries(SEARCH_CATEGORIES).map(([value, label]) => `<option value="${value}">${esc(label)}</option>`).join("");
  const territoryOptions = ctx.locations.map((item) => `<option value="${esc(item.slug)}" data-url="${ctx.href(`locations/${item.slug}.html`)}"${item.slug === location.slug ? " selected" : ""}>${esc(item.name)}</option>`).join("");
  const typeButtons = Object.entries(SEARCH_CATEGORIES).map(([value, label]) => `<button type="button" data-location-type="${value}" aria-pressed="${value === "all" ? "true" : "false"}">${esc(label)}</button>`).join("");
  const localCards = localCandidates.map((item) => listingCard(ctx, item, { searchScope: "local" })).join("");
  const nearbyCards = nearbyCandidates.map((item, index) => listingCard(ctx, item, { searchScope: "nearby" }).replace(" data-reveal>", `${index >= 6 ? " hidden" : ""} data-reveal>`)).join("");
  const noResults = initial.local.length === 0;
  const showNearby = initial.showNearbyAutomatically;
  const nearbyBlock = nearbyCandidates.length ? `<div class="location-nearby" data-nearby-section${showNearby ? "" : " hidden"}><div class="container"><div class="location-results__heading"><div><p class="eyebrow">Расширение географии</p><h2>${location.slug === "ayutinskiy" ? "В других локациях Шахт и поблизости" : "В других локациях поблизости"}</h2></div><p>Те же тип и диапазон цены; фактическая территория указана в каждой карточке.</p></div><div class="listing-grid location-listing-grid" data-nearby-grid>${nearbyCards}</div></div></div>` : "";
  return `<section class="location-search" id="location-search" data-location-search data-location="${esc(location.slug)}" data-location-name="${esc(location.name)}" data-nearby-threshold="${NEARBY_AUTO_THRESHOLD}">
    <div class="container location-search__shell">
      <div class="location-search__heading"><div><p class="eyebrow">Поиск по подтверждённым объектам</p><h2>Найти недвижимость в ${esc(location.namePrepositional)}</h2></div><p>Фильтры работают по опубликованным доступным записям. Статус и условия уточняются перед просмотром.</p></div>
      <form class="location-search__form" data-location-search-form action="${ctx.href(`locations/${location.slug}.html`)}" method="get">
        <label><span>Территория</span><select name="location">${territoryOptions}</select></label>
        <label><span>Тип недвижимости</span><select name="type">${typeOptions}</select></label>
        <label><span>Цена от, ₽</span><input name="priceMin" type="text" inputmode="numeric" autocomplete="off" placeholder="Не ограничено"></label>
        <label><span>Цена до, ₽</span><input name="priceMax" type="text" inputmode="numeric" autocomplete="off" placeholder="Не ограничено"></label>
        <button class="button button--primary" type="submit">Показать</button>
        <button class="button button--ghost" type="reset">Сбросить</button>
        <p class="location-search__status" data-location-search-status role="status" hidden></p>
      </form>
      <div class="location-search__types" aria-label="Быстрый выбор типа">${typeButtons}</div>
    </div>
    <div class="container location-results" aria-live="polite">
      <div class="location-results__heading"><div><p class="eyebrow">В выбранной территории</p><h2>Предложения в ${esc(location.namePrepositional)}</h2></div><p><strong data-local-count>${initial.local.length}</strong> ${initial.local.length === 1 ? "подтверждённый объект" : "подтверждённых объектов"}</p></div>
      <p class="location-results__empty" data-local-empty${noResults ? "" : " hidden"}>По выбранным критериям в ${esc(location.namePrepositional)} подтверждённых доступных объектов сейчас нет. Можно проверить предложения рядом или передать критерии для актуального подбора.</p>
      <div class="listing-grid location-listing-grid" data-local-grid>${localCards}</div>
      <button class="button button--ghost location-results__nearby-toggle" type="button" data-nearby-toggle${initial.local.length >= NEARBY_AUTO_THRESHOLD && initial.nearby.length ? "" : " hidden"}>Показать варианты в других локациях</button>
      <p class="location-results__all-empty" data-all-empty${noResults && initial.nearby.length === 0 ? "" : " hidden"}>Подходящих подтверждённых объектов нет и в указанных соседних локациях. Измените тип или цену либо оставьте запрос на подбор.</p>
    </div>
    ${nearbyBlock}
  </section>`;
}

function locationArticle(content) {
  return `<article class="section location-article"><div class="container location-article__layout"><header><p class="eyebrow">Практический разбор территории</p><h2>${esc(content.articleTitle)}</h2><p>${esc(content.articleIntro)}</p></header><div class="location-article__content">${content.sections.map((section) => `<section><h3>${esc(section.title)}</h3>${section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}${section.checklist?.length ? `<ul>${section.checklist.map((item) => `<li>${esc(item)}</li>`).join("")}</ul>` : ""}</section>`).join("")}</div></div></article>`;
}

function locationRelatedGuides(ctx, content) {
  const guides = content.relatedGuides.map((slug) => ctx.guides.find((guide) => guide.slug === slug)).filter(Boolean);
  return `<section class="section section--stone location-guides"><div class="container">${sectionHeading({ kicker: "Полезные статьи", title: "Продолжить проверку", intro: "Три существующих материала помогают подготовиться к просмотру и сравнению конкретных объектов." })}<div class="location-guides__grid">${guides.map((guide) => `<article><p>${esc(guide.readTime)}</p><h3><a href="${ctx.href(`guides/${guide.slug}.html`)}">${esc(guide.title)}</a></h3><p>${esc(guide.description)}</p><a class="text-link" href="${ctx.href(`guides/${guide.slug}.html`)}">Читать статью ↗</a></article>`).join("")}</div></div></section>`;
}

function locationFaq(content, location) {
  return `<section class="section location-faq"><div class="container location-faq__layout"><div><p class="eyebrow">Вопросы и ответы</p><h2>О недвижимости в ${esc(location.namePrepositional)}</h2><p>Короткие ответы не заменяют проверку конкретного объекта и документов.</p></div><div class="location-faq__list">${content.faq.map(([question, answer]) => `<details><summary>${esc(question)}</summary><p>${esc(answer)}</p></details>`).join("")}</div></div></section>`;
}

export function renderLocation(ctx, location) {
  const content = ctx.locationContent[location.slug];
  const seoName = location.slug === "ayutinskiy" ? "Микрорайон Аютинский (Аюта)" : location.name;
  const page = { path: `locations/${location.slug}.html`, pageType: "location", title: `Недвижимость в ${location.namePrepositional} — поиск объектов | Домиан`, description: `${seoName}: подтверждённые объекты, фильтры по типу и цене, предложения в соседних локациях и практический разбор выбора недвижимости.`, eyebrow: location.kicker, h1: `Недвижимость в ${location.namePrepositional}`, lead: location.intro, primaryCta: { label: "Найти объект", href: "#location-search" }, secondaryCta: { label: "Оставить запрос", href: "#lead-form-section" }, heroFacts: [location.administrativeName, ...location.types.slice(0, 2)], heroImage: locationMedia[location.slug].hero, heroImageAlt: locationMedia[location.slug].heroAlt };
  const body = `${hero(ctx, page)}${locationSearchSection(ctx, location)}${locationArticle(content)}${locationRelatedGuides(ctx, content)}${locationFaq(content, location)}${leadForm(ctx, { type: "service", goal: "buy", territory: location.name, title: `Подбор недвижимости в ${location.namePrepositional}`, text: "Выбранная территория, тип и цена уже сохраняются. Добавьте контакт и важные детали запроса." })}`;
  return layout(ctx, page, body, { active: location.slug, breadcrumbs: [{ label: "Главная", href: "" }, { label: "Города и районы", href: "locations/index.html" }, { label: location.name, href: page.path }] });
}

export function renderGuidesIndex(ctx, guides) {
  const page = { path: "guides/index.html", pageType: "guides", title: "Материалы о недвижимости и сделках в Шахтах — Домиан", description: "Информационные материалы о квартирах, домах, участках, территориях и подготовке разных типов недвижимости к продаже в Шахтах.", eyebrow: "Полезные материалы", h1: "Короткие ответы и рабочие чек-листы", lead: "Материалы подготовлены на основе открытых источников, носят информационный характер и не заменяют разбор конкретного объекта.", primaryCta: { label: "Выбрать материал", href: "#guide-list" }, secondaryCta: { label: "Виды недвижимости", href: "apartments.html" }, heroFacts: ["открытые источники", "дата актуальности", "условия могут меняться"], heroImage: "client-meeting" };
  const list = `<section class="section" id="guide-list"><div class="container guide-index-intro"><div class="guide-intro-media">${editorialImage(ctx, "architecture-detail", "Фрагмент фасада современной архитектуры", { sizes: "(max-width: 820px) 42vw, 280px" })}</div><p>Материалы помогают проверить качество строительства и подготовиться к разговору об объекте.</p></div><div class="container guide-grid">${guides.map((guide, index) => `<article class="guide-card"><span>${String(index + 1).padStart(2, "0")} · ${esc(guide.readTime)}</span><h2><a href="${ctx.href(`guides/${guide.slug}.html`)}">${esc(guide.title)}</a></h2><p>${esc(guide.answer)}</p><a class="text-link" href="${ctx.href(`guides/${guide.slug}.html`)}">Читать материал ↗</a></article>`).join("")}</div></section>`;
  const body = `${hero(ctx, page)}${list}${leadForm(ctx, { type: "service", title: "Нужен разбор после чтения?", text: "Опишите тип недвижимости и ситуацию — офис определит, какие данные нужны дальше." })}`;
  return layout(ctx, page, body, { active: "guides", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Гайды", href: page.path }] });
}

export function renderGuide(ctx, guide) {
  const page = { ...guide, path: `guides/${guide.slug}.html`, pageType: "guide", h1: guide.title, title: `${guide.title} — Домиан` };
  const toc = `<nav class="guide-toc" aria-label="Оглавление"><strong>В материале</strong><ol>${guide.sections.map((section) => `<li><a href="#${esc(section.id)}">${esc(section.title)}</a></li>`).join("")}</ol></nav>`;
  const content = guide.sections.map((section) => `<section class="guide-section" id="${esc(section.id)}"><h2>${esc(section.title)}</h2>${section.paragraphs.map((paragraph) => `<p>${esc(paragraph)}</p>`).join("")}${section.checklist ? `<div class="guide-checklist"><h3>Проверить</h3><ul>${section.checklist.map((item) => `<li>${esc(item)}</li>`).join("")}</ul></div>` : ""}</section>`).join("");
  const sources = guide.sources.length ? `<section class="guide-sources"><h2>Источники и дата проверки</h2><ul>${guide.sources.map((source) => `<li><a href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">${esc(source.label)}</a></li>`).join("")}</ul></section>` : "";
  const body = `<article class="guide-article"><header class="guide-hero"><div class="container guide-hero__layout"><div><p class="eyebrow">Материал · ${esc(guide.readTime)}</p><h1>${esc(guide.title)}</h1><p class="guide-answer">${esc(guide.answer)}</p><div class="guide-meta"><span>Подготовлено на основе открытых источников</span><time datetime="${guide.updatedAt}">Актуально на ${esc(formatDate(guide.updatedAt))}</time><span>Информационный материал · условия рынка могут меняться</span></div></div>${toc}</div></header><div class="container guide-layout"><div class="guide-content">${content}<aside class="local-note"><span>Локальный контекст</span><p>${esc(guide.localContext)}</p></aside>${sources}</div><aside class="guide-rail"><p>Примените чек-лист к реальному объекту.</p><a class="button button--primary" href="${ctx.href(guide.cta.href)}" data-analytics="guide_to_catalog">${esc(guide.cta.label)}</a><a class="text-link" href="${ctx.href("guides/index.html")}">Все материалы</a></aside></div></article>${leadForm(ctx, { type: "service", title: "Обсудить конкретный объект", text: "Тип недвижимости, территория или короткое описание помогут начать предметно." })}`;
  return layout(ctx, page, body, { active: "guides", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Гайды", href: "guides/index.html" }, { label: guide.title, href: page.path }] });
}

export function renderListing(ctx, listing) {
  const page = { path: listingPath(listing), pageType: "listing", listing, title: `${listing.title} — ${formatPrice(listing.price)} | Домиан`, description: `Новый дом под чистовую отделку в центре Каменоломней за ${formatPrice(listing.price)}. Котёл и септик включены, ипотечный платёж рассчитывается индивидуально.`, h1: listing.title };
  const gallery = (listing.gallery || []).map((image, index) => `<figure class="listing-gallery__item${index === 0 ? " listing-gallery__item--wide" : ""}">${listingPicture(ctx, image, { className: "listing-gallery__picture", sizes: index === 0 ? "(max-width: 760px) calc(100vw - 32px), 62vw" : "(max-width: 760px) calc(100vw - 32px), 38vw" })}</figure>`).join("");
  const body = `<article class="listing-detail"><header class="listing-detail__hero"><div class="container listing-detail__hero-layout"><div class="listing-detail__copy"><p class="eyebrow">Горячее предложение · новый дом</p><h1>${esc(listing.title)}</h1><p class="listing-detail__address">${esc(listing.address)}</p><div class="listing-detail__price">${formatPrice(listing.price)}</div><p>${esc(listing.description)}</p><div class="hero-actions"><a class="button button--primary" href="#lead-form-section">Записаться на просмотр</a><a class="button button--ghost" href="${ctx.site.phoneHref}" data-analytics="phone_click">Позвонить</a></div></div><div class="listing-detail__media">${listingPicture(ctx, listing.image, { priority: true, sizes: "(max-width: 820px) calc(100vw - 32px), 52vw" })}<span>Объект подтверждён · обновлено ${formatDate(listing.updatedAt)}</span></div></div></header><section class="section listing-detail__facts"><div class="container listing-detail__facts-layout"><div><p class="eyebrow">Комплектация</p><h2>Основные работы уже выполнены</h2><p>После передачи останется выбрать декоративные материалы: поклеить обои, установить натяжной потолок и уложить ламинат или плитку.</p></div><ul>${(listing.features || []).map((feature) => `<li>${esc(feature)}</li>`).join("")}</ul></div></section><section class="section section--stone listing-gallery"><div class="container"><div class="section-heading"><div><p class="eyebrow">Фотографии объекта</p><h2>Фасады, двор и состояние отделки</h2></div><p>Интерьер показан без виртуального ремонта: виден фактический этап готовности дома.</p></div><div class="listing-gallery__grid">${gallery}</div></div></section><section class="section listing-finance"><div class="container listing-finance__layout"><div><p class="eyebrow">Варианты покупки</p><h2>Ипотечный сценарий рассчитывается под семью</h2></div><div><p><strong>Ориентир по платежу — от 27 000 ₽ в месяц.</strong> Итог зависит от срока, ставки, первоначального взноса, страхования и решения банка.</p><p>Семейная ипотека может подойти семье с ребёнком до семи лет. Для семей с двумя несовершеннолетними детьми действуют дополнительные территориальные условия программы. Стандартные условия предусматривают первоначальный взнос; вариант без собственных средств на старте возможен только через отдельно применимый инструмент и после одобрения банка.</p><a class="text-link" href="https://government.ru/sanctions_measures/measure/52/" target="_blank" rel="noopener noreferrer">Актуальные условия программы на сайте Правительства РФ ↗</a></div></div></section></article>${leadForm(ctx, { type: "house-new", goal: "buy", propertyType: "house", market: "primary", title: "Записаться на просмотр дома", text: "Оставьте телефон — офис уточнит актуальность, комплектацию и возможный сценарий покупки." })}`;
  return layout(ctx, page, body, { active: "houses", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Дома", href: "houses.html" }, { label: listing.title, href: page.path }] });
}

export function renderPerson(ctx) {
  const page = { path: "team/maria-voronina.html", pageType: "person", title: "Мария Воронина — собственник офиса Домиан в Шахтах", description: "Мария Воронина, собственник офиса «Домиан · Шахты на Маяковского»: подтверждённые контакты и направления недвижимости.", eyebrow: "Собственник офиса", h1: "Мария Воронина", lead: "Прямой контакт офиса «Домиан · Шахты на Маяковского» по вопросам покупки, продажи и предварительной оценки разных типов недвижимости.", primaryCta: { label: "Позвонить Марии", href: ctx.site.phoneHref, event: "phone_click" }, secondaryCta: { label: "Контакты офиса", href: "contacts.html" }, heroFacts: ["Шахты", "Маяковского 18А", "подтверждённые контакты"], heroImage: "client-meeting" };
  const profile = `<section class="section"><div class="container profile-layout">${ownerPortrait(ctx, "large")}<div><p class="eyebrow">Подтверждённые данные</p><h2>Собственник офиса в Шахтах</h2><p>Мария представляет офис по адресу ${esc(ctx.site.address)}. Через сайт можно обратиться по вопросам квартир, домов, участков, коммерческой недвижимости, гаражей и парковочных мест.</p><dl class="profile-facts"><div><dt>Офис</dt><dd>${esc(ctx.site.displayName)}</dd></div><div><dt>Телефон</dt><dd><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></dd></div><div><dt>Email</dt><dd><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></dd></div><div><dt>Город</dt><dd>Шахты</dd></div></dl>${socialLinks(ctx, "social-links social-links--profile")}</div></div></section>`;
  const roles = cardsSection(ctx, { kicker: "С чем обратиться", title: "Основные сценарии офиса", intro: "Конкретный состав работы уточняется после знакомства с задачей.", items: [
    { index: "01", title: "Покупка недвижимости", text: "Квартиры, дома, участки, коммерческие объекты, гаражи и парковка.", href: "services.html" },
    { index: "02", title: "Продажа недвижимости", text: "Предварительный разбор объекта и следующего шага.", href: "sell.html" },
    { index: "03", title: "Предварительная оценка", text: "Характеристики объекта и доступные аналоги без автоматической цены.", href: "valuation.html" }
  ] });
  return layout(ctx, page, `${hero(ctx, page)}${profile}${roles}${leadForm(ctx, { type: "service", title: "Написать в офис", text: "Форма пока не подключена к внешнему сервису; используйте телефон или email." })}`, { active: "company", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Мария Воронина", href: page.path }] });
}

export function renderContacts(ctx) {
  const page = { path: "contacts.html", pageType: "contact", title: "Контакты — Домиан · Шахты на Маяковского", description: "Адрес, телефон, email и подтверждённые мессенджеры офиса «Домиан · Шахты на Маяковского», собственник Мария Воронина.", eyebrow: "Связаться с офисом", h1: "Начните с короткого разговора", lead: "Позвоните, напишите на email или выберите удобный мессенджер. Часы посещения офиса лучше уточнить заранее.", primaryCta: { label: `Позвонить ${ctx.site.phone}`, href: ctx.site.phoneHref, event: "phone_click" }, secondaryCta: { label: "Написать письмо", href: `mailto:${ctx.site.email}` }, heroFacts: ["Мария Воронина", "Шахты", "ул. Маяковского 18А"] };
  const contact = `<section class="section"><div class="container contact-layout"><div class="contact-grid"><article><span>01 · Телефон</span><h2><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></h2><p>Самый прямой способ обсудить задачу.</p></article><article><span>02 · Email</span><h2><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></h2><p>Подходит, если нужно отправить описание без чувствительных документов.</p></article><article><span>03 · Адрес</span><h2>${esc(ctx.site.address)}</h2><p>Часы посещения уточните по телефону.</p></article><article><span>04 · Мессенджеры</span><h2>Напишите Марии</h2><p>Подтверждённые каналы офиса — без QR-кодов и промежуточных страниц.</p>${socialLinks(ctx, "social-links social-links--contact")}</article></div><aside class="contact-owner">${ownerPortrait(ctx, "compact")}<p>Мария Воронина<br><span>собственник офиса</span></p></aside></div></section>`;
  const gallery = `<section class="section section--stone office-gallery"><div class="container"><div class="section-heading"><div><p class="eyebrow">Офис на Маяковского</p><h2>Место, где можно обсудить задачу лично</h2></div><p>Вход с улицы Маяковского. Перед визитом лучше согласовать время по телефону.</p></div><div class="office-gallery__grid"><figure class="office-gallery__item office-gallery__item--wide">${officeImage(ctx, "office-interior", "Светлый интерьер офиса Домиан в Шахтах", { className: "office-photo", sizes: "(max-width: 760px) calc(100vw - 32px), 58vw" })}<figcaption>Рабочее пространство офиса</figcaption></figure><figure class="office-gallery__item office-gallery__item--narrow">${officeImage(ctx, "office-waiting-area", "Зона ожидания в офисе Домиан", { className: "office-photo", sizes: "(max-width: 760px) calc(100vw - 32px), 42vw" })}<figcaption>Зона ожидания</figcaption></figure><figure class="office-gallery__item office-gallery__item--narrow">${officeImage(ctx, "office-staircase", "Лестница и история команды в офисе Домиан", { className: "office-photo", sizes: "(max-width: 760px) calc(100vw - 32px), 42vw" })}<figcaption>История команды</figcaption></figure><figure class="office-gallery__item office-gallery__item--wide">${officeImage(ctx, "office-facade", "Фасад офиса Домиан по адресу улица Маяковского 18А", { className: "office-photo", sizes: "(max-width: 760px) calc(100vw - 32px), 58vw" })}<figcaption>ул. Маяковского, 18А</figcaption></figure></div></div></section>`;
  const prepare = criteriaSection({ kicker: "Перед обращением", title: "Достаточно трёх вводных", intro: "Не отправляйте паспортные, банковские или иные чувствительные данные через форму.", items: ["что хотите купить, продать или оценить", "какая территория важна", "бюджет или желаемая последовательность"] });
  return layout(ctx, page, `${hero(ctx, page)}${contact}${gallery}${prepare}${leadForm(ctx, { type: "service", title: "Оставить контакт для ответа", text: "В PRELAUNCH форма безопасно покажет прямые контакты вместо фиктивной отправки." })}`, { active: "contacts", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Контакты", href: page.path }] });
}

export function renderDetails(ctx) {
  const page = { path: "details.html", pageType: "legal", title: "Реквизиты — ИП Воронина Мария Петровна", description: "Юридические и банковские реквизиты ИП Ворониной Марии Петровны, офис Домиан в Шахтах.", h1: "Реквизиты", publishedAt: ctx.site.publishedAt, updatedAt: ctx.site.updatedAt };
  const body = `<section class="legal-hero"><div class="container"><p class="eyebrow">Юридическая информация</p><h1>Реквизиты</h1><p>Данные размещены на отдельной странице и не используются в маркетинговых блоках.</p></div></section><section class="section"><div class="container details-grid"><dl><div><dt>Наименование</dt><dd>${esc(ctx.site.legal.name)}</dd></div><div><dt>ИНН</dt><dd>${esc(ctx.site.legal.inn)}</dd></div><div><dt>ОГРНИП</dt><dd>${esc(ctx.site.legal.ogrnip)}</dd></div><div><dt>Адрес</dt><dd>${esc(ctx.site.address)}</dd></div><div><dt>Телефон</dt><dd><a href="${ctx.site.phoneHref}">${esc(ctx.site.phone)}</a></dd></div><div><dt>Email</dt><dd><a href="mailto:${esc(ctx.site.email)}">${esc(ctx.site.email)}</a></dd></div></dl><dl><div><dt>Расчётный счёт</dt><dd>${esc(ctx.site.bank.account)}</dd></div><div><dt>Банк</dt><dd>${esc(ctx.site.bank.name)}</dd></div><div><dt>Корреспондентский счёт</dt><dd>${esc(ctx.site.bank.correspondentAccount)}</dd></div><div><dt>БИК</dt><dd>${esc(ctx.site.bank.bic)}</dd></div></dl></div></section>`;
  return layout(ctx, page, body, { active: "details", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Реквизиты", href: page.path }] });
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
  const page = { path: "404.html", pageType: "error", title: "Страница не найдена — Домиан Шахты", description: "Запрошенная страница офиса «Домиан · Шахты на Маяковского» не найдена. Перейдите на главную или к видам недвижимости.", h1: "Страница не найдена" };
  const body = `<section class="status-page"><div class="container status-card"><span class="status-code">404</span><p class="eyebrow">Такой страницы нет</p><h1>Вернёмся к выбору недвижимости</h1><p>Ссылка могла измениться. Перейдите на главную, к видам недвижимости или свяжитесь с офисом.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("")}">На главную</a><a class="button button--ghost" href="${ctx.href("apartments.html")}">Виды недвижимости</a></div><a class="text-link" href="${ctx.site.phoneHref}">${esc(ctx.site.phone)} ↗</a></div></section>`;
  return layout(ctx, page, body);
}

export { esc };
