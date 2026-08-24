const esc = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#39;");

const formatDate = (value) => new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00Z`));

const navItems = [
  ["sell", "Продать", "sell.html"],
  ["valuation", "Оценить", "valuation.html"],
  ["locations", "Территории", "locations/index.html"],
  ["guides", "Полезное", "guides/index.html"],
  ["contacts", "Офис", "contacts.html"]
];

const propertyNavGroups = [
  ["Квартиры", [["Вторичные", "secondary-apartments.html"], ["В новостройках", "new-build-apartments.html"]]],
  ["Дома", [["Новые готовые", "construction.html"], ["Вторичные", "secondary-houses.html"], ["От застройщиков", "builder-houses.html"]]],
  ["Другое", [["Участки", "lands.html"], ["Коммерческая недвижимость", "commercial.html"], ["Гаражи и парковка", "garages-parking.html"]]]
];

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
  "hero-house": { widths: [720, 1200], width: 1200, height: 1500 },
  "house-yard": { widths: [640, 960], width: 960, height: 720 },
  "suburban-house": { widths: [640, 960], width: 960, height: 720 },
  "apartment-interior": { widths: [640, 960], width: 960, height: 720 },
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
  "seller-valuation": { widths: [640, 960], width: 960, height: 720 }
};

function editorialImage(ctx, key, alt, { className = "", sizes = "(max-width: 760px) calc(100vw - 32px), 50vw", priority = false } = {}) {
  const image = editorialImages[key];
  if (!image) return "";
  const srcset = image.widths.map((width) => `${ctx.href(`assets/images/editorial/${key}-${width}.webp`)} ${width}w`).join(", ");
  const fallbackWidth = image.widths.at(-1);
  const mobileSource = image.mobile ? `<source media="(max-width: 600px)" type="image/webp" srcset="${ctx.href(`assets/images/editorial/${image.mobile.src}`)}">` : "";
  return `<picture${className ? ` class="${esc(className)}"` : ""}>${mobileSource}<source type="image/webp" srcset="${srcset}" sizes="${esc(sizes)}"><img src="${ctx.href(`assets/images/editorial/${key}-${fallbackWidth}.webp`)}" width="${image.width}" height="${image.height}" alt="${esc(alt)}" loading="${priority ? "eager" : "lazy"}" decoding="async"${priority ? ' fetchpriority="high"' : ""}></picture>`;
}

function nav(ctx, active, mobile = false) {
  const links = navItems.map(([key, label, target]) => `<a href="${ctx.href(target)}"${active === key ? ' aria-current="page"' : ""}>${label}</a>`).join("");
  const propertyGroups = propertyNavGroups.map(([group, items]) => `<div class="property-nav__group"><strong>${esc(group)}</strong>${items.map(([label, target]) => `<a href="${ctx.href(target)}">${esc(label)}</a>`).join("")}</div>`).join("");
  if (mobile) {
    return `<div class="mobile-drawer" id="mobile-drawer" aria-hidden="true" inert>
      <div class="mobile-drawer__scrim" data-drawer-close></div>
      <div class="mobile-drawer__panel" role="dialog" aria-modal="true" aria-label="Меню сайта">
        <div class="mobile-drawer__top">${brand(ctx)}<button class="icon-button mobile-drawer__close" type="button" aria-label="Закрыть меню" data-drawer-close>×</button></div>
        <nav class="mobile-drawer__nav" aria-label="Мобильная навигация">
          <div class="mobile-drawer__group"><span>Недвижимость</span>${propertyGroups}</div>
          ${links}
        </nav>
        <div class="mobile-drawer__contact">
          <a class="button button--primary" href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a>
          <a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a>
          <span>${esc(ctx.site.address)}</span>
          ${socialLinks(ctx, "social-links social-links--drawer")}
        </div>
      </div>
    </div>`;
  }
  return `<nav class="site-nav" aria-label="Основная навигация">
    <details class="property-nav" data-property-nav><summary${active === "types" ? ' aria-current="page"' : ""}>Недвижимость</summary><div class="property-nav__panel">${propertyGroups}<a class="property-nav__all" href="${ctx.href("services.html")}">Все направления <span aria-hidden="true">↗</span></a></div></details>
    ${links}
  </nav>`;
}

function header(ctx, active) {
  return `<header class="site-header" data-site-header>
    <div class="container site-header__inner">
      ${brand(ctx)}
      ${nav(ctx, active)}
      <div class="header-actions"><a class="header-phone" href="${ctx.site.phoneHref}" data-analytics="phone_click"><span>Позвонить</span><strong>${esc(ctx.site.phone)}</strong></a><a class="button button--primary header-cta" href="${ctx.href("index.html#request")}">Подобрать</a></div>
      <button class="menu-toggle" type="button" aria-label="Открыть меню" aria-expanded="false" aria-controls="mobile-drawer" data-menu-toggle><span></span><span></span></button>
    </div>
  </header>${nav(ctx, active, true)}`;
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
        ${editorialImage(ctx, heroImageKey, page.heroImageAlt || "Современная недвижимость — нейтральный визуальный образ направления, не объект продажи", { className: "hero-media__picture", sizes: "(max-width: 820px) calc(100vw - 32px), 44vw", priority: page.pageType === "home" })}
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
        ${page.geo ? `<p class="hero-geo">${esc(page.geo)}</p>` : ""}
        ${facts ? `<ul class="hero-facts">${facts}</ul>` : ""}
      </div>
      ${visual}
    </div>
  </section>`;
}

function homePropertySection(ctx) {
  const items = [
    ["Квартиры", "Вторичный рынок и новостройки", "apartments.html", "apartment", "category-apartments", "Светлый современный интерьер квартиры — editorial-иллюстрация категории, не объект продажи"],
    ["Дома", "Новые · вторичные · от застройщиков", "houses.html", "house", "category-houses", "Современный частный дом в жилом окружении — editorial-иллюстрация категории, не объект продажи"],
    ["Новостройки", "Квартиры в новых многоквартирных проектах", "new-build-apartments.html", "apartment-newbuild", "category-new-buildings", "Современный многоквартирный двор — editorial-иллюстрация категории, не объект продажи"],
    ["Участки", "ИЖС, коммуникации и жилое окружение", "lands.html", "land", "category-land", "Участок ИЖС с дорогой и жилым окружением — editorial-иллюстрация категории, не объект продажи"],
    ["Коммерческая недвижимость", "Street-retail, офисы, склады и ПСН", "commercial.html", "commercial", "category-commercial", "Коммерческое помещение с витриной — editorial-иллюстрация категории, не объект продажи"],
    ["Гаражи и парковка", "Гаражи, машиноместа и парковочные места", "garages-parking.html", "garage-parking", "category-parking", "Крытая парковка с размеченными местами — editorial-иллюстрация категории, не объект продажи"]
  ];
  return `<section class="section home-property" id="property-directions" data-home-section="property"><div class="container">
    ${sectionHeading({ kicker: "Недвижимость", title: "Весь основной рынок — без лишней сложности", intro: "Шесть равноправных направлений. Изображения показывают категории, а не конкретные объекты в продаже." })}
    <div class="home-property__grid" data-reveal-group>${items.map(([title, text, href, category, image, alt], index) => `<a class="home-property-card" href="${ctx.href(href)}" data-lead-category="${category}" data-lead-label="${esc(title)}" data-reveal>${editorialImage(ctx, image, alt, { sizes: "(max-width: 600px) 46vw, (max-width: 1024px) 47vw, 31vw" })}<span class="home-property-card__veil" aria-hidden="true"></span><span class="home-property-card__number">${String(index + 1).padStart(2, "0")}</span><div><h3>${esc(title)}</h3><p>${esc(text)}</p><strong>Открыть направление ↗</strong></div></a>`).join("")}</div>
    <a class="new-homes-feature" href="${ctx.href("construction.html")}" data-lead-category="new-house" data-lead-label="Новые готовые дома" data-reveal>${editorialImage(ctx, "feature-new-homes", "Новый готовый дом с благоустроенным двором — editorial-иллюстрация категории, не объект продажи", { sizes: "(max-width: 820px) calc(100vw - 32px), 60vw" })}<span class="new-homes-feature__veil" aria-hidden="true"></span><div><p class="eyebrow">Сильное направление внутри домов</p><h3>Новые готовые дома</h3><p>Подберём готовый дом и поможем разобраться в комплектации, участке, коммуникациях и условиях покупки.</p><strong>Смотреть направление ↗</strong></div></a>
  </div></section>`;
}

function homeRequestSection(ctx) {
  const typeOptions = requestTypes.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
  const locationOptions = ctx.locations.map((location) => `<option value="${esc(location.name)}">${esc(location.name)}</option>`).join("");
  return `<section class="section home-request" id="request" data-home-section="request"><div class="container home-request__shell"><div class="home-request__intro"><p class="eyebrow">Подбор под ваш запрос</p><h2>Передайте критерии — соберём актуальные варианты</h2><p>Это не поиск по пустому каталогу. Критерии останутся в форме, а предложения и характеристики будут проверяться на дату обращения.</p></div><form class="home-request__form" data-home-request-builder novalidate><label><span>Что ищете</span><select name="requestType" required><option value="">Выберите тип</option>${typeOptions}</select></label><label><span>Территория</span><select name="requestLocation"><option value="">Несколько территорий</option>${locationOptions}</select></label><label><span>Бюджет</span><select name="requestBudget"><option value="">Обсудить</option><option>до 2 млн ₽</option><option>2–4 млн ₽</option><option>4–7 млн ₽</option><option>7–10 млн ₽</option><option>10–15 млн ₽</option><option>свыше 15 млн ₽</option></select></label><label><span>Телефон</span><input name="requestPhone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 999 123-45-67"></label><button class="button button--primary" type="submit">Получить актуальную подборку</button><p class="home-request__status" data-home-request-status role="status" hidden></p></form><ol class="home-request__steps"><li><span>01</span><strong>Получаем критерии</strong><p>Тип, территория, бюджет и важные детали.</p></li><li><span>02</span><strong>Проверяем актуальность</strong><p>Без выдуманных адресов, цен и счётчиков.</p></li><li><span>03</span><strong>Сравниваем варианты</strong><p>По условиям, документам и полному бюджету.</p></li></ol></div></section>`;
}

function homeSellerSection(ctx) {
  return `<section class="section home-seller" data-home-section="seller"><div class="container home-seller__layout"><div><p class="eyebrow">Собственникам</p><h2>Планируете продажу? Начнём с предварительного разбора</h2><p>Характеристики объекта, состояние, документы, локация и аналоги помогают определить обоснованный диапазон. Дальнейший порядок работы формируется после знакомства с объектом.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("valuation.html")}">Оценить недвижимость</a><a class="button button--ghost" href="${ctx.href("sell.html")}">Обсудить продажу</a></div><small>Без обещания точной онлайн-цены, срока продажи или гарантированной стоимости.</small></div><div class="home-seller__media">${editorialImage(ctx, "seller-valuation", "Предварительный разбор планировки и документов без указания стоимости", { sizes: "(max-width: 820px) calc(100vw - 32px), 48vw" })}<span>Планировка · характеристики · аналоги</span></div></div></section>`;
}

function homeLocationsSection(ctx) {
  return `<section class="section home-locations" data-home-section="locations"><div class="container"><div class="home-locations__heading"><div><p class="eyebrow">Территории</p><h2>Шахты и соседние территории</h2></div><p>Сравниваем не названия городов, а конкретные адреса, маршруты и параметры объекта.</p></div><div class="home-locations__grid">${ctx.locations.map((location, index) => `<a href="${ctx.href(`locations/${location.slug}.html`)}"><span>${String(index + 1).padStart(2, "0")}</span><strong>${esc(location.name)}</strong><small>${esc(location.administrativeName)}</small><b aria-hidden="true">↗</b></a>`).join("")}</div></div></section>`;
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
    <div class="request-builder__action"><button class="button button--primary" type="submit">Передать критерии</button><small>Покажем направление и следующий шаг, а не выдуманную выдачу.</small></div>
    <p class="request-builder__status" data-request-builder-status role="status" hidden></p>
  </form>`;
}

function quickFilterSection(ctx) {
  return `<section class="quick-search" id="quick-search"><div class="container quick-search__shell" data-reveal>
    <div class="quick-search__intro"><p class="eyebrow">Быстрый подбор</p><h2>Соберите запрос за минуту</h2><p>Критерии перейдут в форму обращения. Это конструктор заявки, а не имитация каталога.</p></div>
    ${requestBuilder(ctx)}
  </div></section>`;
}

function showcaseCard(ctx, item) {
  return `<article class="showcase-card" data-showcase-card data-category="${esc(item.category)}" data-reveal>
    <div class="showcase-card__media">
      ${editorialImage(ctx, item.image, item.imageAlt, { sizes: "(max-width: 600px) calc(100vw - 64px), (max-width: 1024px) 44vw, 30vw" })}
      <span>${esc(item.status)}</span>
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
    ${sectionHeading({ kicker: "Навигатор рынка", title: "Направления подбора вместо выдуманных объявлений", intro: "Десять карточек показывают рыночные сегменты. Каждая из них — направление запроса, а не конкретный объект продажи." })}
    <div class="showcase-filter" data-showcase-filters aria-label="Фильтр витрины">${filters.map(([value, label], index) => `<button type="button" data-showcase-filter="${value}"${index === 0 ? ' class="is-active" aria-pressed="true"' : ' aria-pressed="false"'}>${label}</button>`).join("")}</div>
    ${showcaseGrid(ctx, items)}
  </div></section>`;
}

function propertyDirectionsSection(ctx) {
  const items = [
    { category: "apartment", title: "Квартиры", text: "Вторичный рынок и новостройки, от студий до квартир с тремя и более комнатами.", href: "apartments.html", label: "Выбрать квартиру", image: "modern-apartment-house", alt: "Современный многоквартирный дом — editorial-иллюстрация категории, не объект продажи" },
    { category: "new-house", title: "Новые дома", text: "Готовность, комплектация, инженерия, участок и документы.", href: "construction.html", label: "Смотреть новые дома", image: "hero-house", alt: "Современный дом — нейтральная иллюстрация направления" },
    { category: "house", title: "Дома", text: "Новые, вторичные, от застройщиков и дома с участком.", href: "houses.html", label: "Выбрать формат дома", image: "suburban-house", alt: "Частный дом — нейтральная иллюстрация направления" },
    { category: "land", title: "Участки", text: "Под строительство, с коммуникациями или существующим домом.", href: "lands.html", label: "Выбрать участок", image: "house-yard", alt: "Загородная территория — нейтральная иллюстрация направления" },
    { category: "commercial", title: "Коммерческая недвижимость", text: "ПСН, торговля, офисы, склады, производство и коммерческая земля.", href: "commercial.html", label: "Описать задачу бизнеса", image: "client-meeting", alt: "Деловая встреча — нейтральная иллюстрация коммерческого направления" },
    { category: "garage-parking", title: "Гаражи и парковка", text: "Гаражи, машиноместа и парковочные места с проверкой статуса и доступа.", href: "garages-parking.html", label: "Выбрать формат", image: "keys-handover", alt: "Передача ключей — нейтральная иллюстрация направления" }
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
    { index: "01", title: "Вторичная квартира", text: "Сравнить дом, планировку, состояние, право и полный бюджет.", image: "apartment-interior", category: "apartment-secondary", href: "secondary-apartments.html" },
    { index: "02", title: "Новый готовый дом", text: "Проверить фактическую готовность, участок, инженерию и передачу.", image: "hero-house", category: "new-house", href: "construction.html" },
    { index: "03", title: "Коммерческий запрос", text: "Связать формат помещения с деятельностью, доступом и мощностями.", image: "client-meeting", category: "commercial", href: "commercial.html" }
  ];
  return `<section class="section section--ink scenarios-section"><div class="container">
    ${sectionHeading({ kicker: "Разные задачи", title: "Один офис — разные сценарии рынка", intro: "Начинаем с типа недвижимости и цели, затем собираем применимые критерии." })}
    <div class="scenario-grid" data-reveal-group>${items.map((item) => `<article class="scenario-card" data-reveal>
      ${editorialImage(ctx, item.image, `${item.title} — нейтральная визуальная иллюстрация`, { sizes: "(max-width: 760px) calc(100vw - 32px), 31vw" })}
      <div><span>${item.index}</span><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p><a href="${ctx.href(item.href)}" data-lead-category="${esc(item.category)}" data-lead-label="${esc(item.title)}">Открыть направление ↗</a></div>
    </article>`).join("")}</div>
  </div></section>`;
}

function sellerSection(ctx) {
  return `<section class="section seller-section"><div class="container seller-layout">
    <div class="seller-media" data-reveal>${editorialImage(ctx, "client-meeting", "Деловая встреча по документам — нейтральная иллюстрация сопровождения", { sizes: "(max-width: 820px) calc(100vw - 32px), 46vw" })}<span>Продажа · оценка · встречная покупка</span></div>
    <div data-reveal><p class="eyebrow">Для собственника</p><h2>Продажа — часть следующего решения</h2><p>Подготовим объект, объясним логику оценки и свяжем сроки продажи с покупкой дома или квартиры. Без обещания цены и срока до изучения исходных данных.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("sell.html")}">План продажи</a><a class="button button--ghost" href="${ctx.href("valuation.html")}">Начать с оценки</a></div></div>
  </div></section>`;
}

function faqSection() {
  const items = [
    ["Почему на карточках нет цен и адресов?", "Публичная база ещё готовится. Мы не подменяем её демонстрационными объектами: актуальные предложения и характеристики подтверждаются на дату обращения."],
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
  return `<section class="section section--stone"><div class="container">
    ${sectionHeading(section)}
    <div class="catalog-shell" data-catalog-root>
      ${requestBuilder(ctx, { defaultType, defaultMarket, compact: true })}
      <p class="visually-hidden">Подтверждённых публичных объектов: <strong data-catalog-count>0</strong></p>
      <div class="catalog-grid" data-catalog-grid hidden></div>
      <div class="catalog-honesty" data-catalog-empty>
        <span aria-hidden="true">↗</span>
        <div><h3>${esc(section.emptyTitle)}</h3><p>${esc(section.emptyText)}</p></div>
      </div>
      ${showcaseGrid(ctx, items)}
      <div class="catalog-followup"><p>Каждая карточка обозначает направление запроса, а не конкретный объект. Реальные адреса, цены и характеристики не публикуются до подтверждения.</p><a class="button button--primary" href="#lead-form-section" data-lead-category="${esc(showcaseTypes[0] || defaultType)}">${esc(section.cta)}</a></div>
    </div>
  </div></section>`;
}

const locationImageKeys = {
  shakhty: "hero-house",
  kamenolomni: "house-yard",
  novoshakhtinsk: "suburban-house",
  ayutinskiy: "newbuild-green",
  "krasnyy-sulin": "keys-handover"
};

function locationCards(ctx, detailed = false) {
  return `<div class="location-grid${detailed ? " location-grid--detailed" : ""}" data-reveal-group>${ctx.locations.map((location, index) => `<a class="location-card" href="${ctx.href(`locations/${location.slug}.html`)}" data-location="${esc(location.slug)}" data-reveal>
    <div class="location-card__media">${editorialImage(ctx, locationImageKeys[location.slug], `${location.name} — нейтральный визуальный образ территории, не объект продажи`, { sizes: detailed ? "(max-width: 820px) calc(100vw - 32px), 47vw" : "(max-width: 820px) calc(100vw - 32px), 22vw" })}<span class="location-card__index">${String(index + 1).padStart(2, "0")}</span></div>
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
  const goals = [["buy", "Купить"], ["sell", "Продать"], ["valuation", "Предварительно оценить"], ["consultation", "Обсудить другую задачу"]];
  const locationOptions = ctx.locations.map((location) => `<option value="${esc(location.name)}">${esc(location.name)}</option>`).join("");
  const defaultGoal = form.goal || ({ sell: "sell", valuation: "valuation" })[form.type] || "buy";
  const defaultPropertyType = form.propertyType || ({ apartment: "apartment", "apartment-secondary": "apartment", "apartment-newbuild": "apartment", house: "house", "house-new": "house", "house-secondary": "house", "house-builder": "house", land: "land", commercial: "commercial", "garage-parking": "garage-parking" })[form.type] || "";
  return `<section class="lead-section" id="lead-form-section"><div class="container lead-layout">
    <div><p class="eyebrow">Короткий первый шаг</p><h2>${esc(form.title || "Обсудить задачу")}</h2><p>${esc(form.text || "Расскажите, что нужно решить.")}</p><div class="direct-contact"><span>${ctx.site.mode === "prelaunch" ? "В PRELAUNCH форма не отправляет данные наружу." : "Можно также связаться с офисом напрямую."}</span><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></div></div>
    <form class="lead-form" data-lead-form data-source-cta="${esc(form.type || "contact")}" data-origin-page="${esc(form.originPage || "")}" novalidate>
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
  const active = page.slug === "sell" ? "sell" : page.slug === "valuation" ? "valuation" : page.pageType === "catalog" ? "types" : "buy";
  return layout(ctx, page, body, { active, breadcrumbs: crumbs });
}

export function renderHome(ctx, guides) {
  const page = { path: "", pageType: "home", title: "Недвижимость в Шахтах — купить, продать, оценить | Домиан", description: "Покупка, продажа и предварительная оценка квартир, домов, новостроек, участков, коммерческой недвижимости, гаражей и парковочных мест в Шахтах и рядом.", eyebrow: "Домиан · Шахты на Маяковского", h1: "Недвижимость в Шахтах — спокойно и по делу", lead: "Квартиры, дома, новостройки, участки и коммерческая недвижимость. Покупка, продажа и предварительная оценка — в одном офисе на Маяковского.", primaryCta: { label: "Подобрать недвижимость", href: "#request" }, secondaryCta: { label: "Продать объект", href: "sell.html" }, tertiaryCta: { label: "Оценить стоимость", href: "valuation.html" }, geo: "Шахты · Каменоломни · Новошахтинск · Аюта · Красный Сулин", heroImage: "hero-modern-city-living", heroImageAlt: "Современная городская жилая архитектура — editorial-иллюстрация категории, не объект продажи", heroMediaLabel: "Современная городская жизнь" };
  const body = `${hero(ctx, page)}${homePropertySection(ctx)}${homeRequestSection(ctx)}${homeSellerSection(ctx)}${homeLocationsSection(ctx)}${homeExpertiseSection(ctx, guides)}${homeOfficeSection(ctx)}${homeLeadForm(ctx)}`;
  return layout(ctx, page, body, { active: "" });
}

export function renderLocationsIndex(ctx) {
  const page = { path: "locations/index.html", pageType: "location", title: "География работы — Шахты и соседние территории", description: "Шахты, Каменоломни, Новошахтинск, микрорайон Аютинский города Шахты и Красный Сулин: покупка, продажа и оценка недвижимости.", eyebrow: "Пять территорий", h1: "Недвижимость в Шахтах и рядом", lead: "Сохраняем утверждённый порядок территорий и сравниваем конкретные адреса, типы недвижимости и пользовательские маршруты без выдуманного рейтинга.", primaryCta: { label: "Выбрать территорию", href: "#locations" }, secondaryCta: { label: "Виды недвижимости", href: "apartments.html" }, heroFacts: ["Шахты", "Каменоломни", "Новошахтинск · Аюта · Красный Сулин"], heroImage: "modern-apartment-house" };
  const cards = `<section class="section location-section" id="locations"><div class="container">${locationCards(ctx, true)}</div></section>`;
  const method = criteriaSection({ kicker: "Как сравнивать", title: "Одинаковая таблица — разные выводы", intro: "Сравнивайте конкретные адреса и типы объектов, а не названия территорий.", items: ["цель покупки или продажи", "тип и характеристики объекта", "ежедневные маршруты", "состояние и доступ", "документы", "полный бюджет"] });
  const body = `${hero(ctx, page)}${cards}${method}${leadForm(ctx, { type: "service", goal: "buy", title: "Сравнить территории под ваш запрос", text: "Назовите тип недвижимости, ключевые маршруты и критерии — офис поможет определить следующий шаг." })}`;
  return layout(ctx, page, body, { active: "locations", breadcrumbs: [{ label: "Главная", href: "" }, { label: "География", href: page.path }] });
}

export function renderLocation(ctx, location) {
  const seoName = location.slug === "ayutinskiy" ? "Микрорайон Аютинский (Аюта)" : location.name;
  const page = { path: `locations/${location.slug}.html`, pageType: "location", title: `${seoName}: недвижимость — Домиан Шахты`, description: `${seoName}: подбор разных типов недвижимости, продажа и предварительная оценка; административный контекст — ${location.administrativeName}.`, eyebrow: location.kicker, h1: location.title, lead: location.intro, primaryCta: { label: "Оставить запрос", href: "#lead-form-section" }, secondaryCta: { label: "Виды недвижимости", href: "apartments.html" }, heroFacts: [location.administrativeName, ...location.types.slice(0, 2)], heroImage: locationImageKeys[location.slug] };
  const context = `<section class="section"><div class="container location-story"><div><p class="eyebrow">Административный контекст</p><h2>${esc(location.administrativeName)}</h2><p>${esc(location.context)}</p></div><aside><span>Сценарий частного дома</span><p>${esc(location.houseScenario)}</p></aside></div></section>`;
  const who = cardsSection(ctx, { kicker: "Кому подходит", title: "Сценарии для этой территории", intro: "Это не готовые объекты, а ситуации покупателя.", items: location.idealFor.map((item, index) => ({ index: String(index + 1).padStart(2, "0"), title: item, text: index === 0 ? location.houseScenario : `Критерии уточняются по конкретному адресу в ${location.name}.` })) });
  const checks = criteriaSection({ kicker: "Что проверить", title: "Вопросы к конкретному адресу", intro: "Общие сведения о территории не заменяют проверку объекта.", items: location.checks });
  const types = `<section class="section section--stone"><div class="container"><div class="section-heading"><div><p class="eyebrow">Что рассматриваем</p><h2>${location.types.map(esc).join(" · ")}</h2></div><p>Публичных объектов пока нет. Актуальность и характеристики подтверждаются на дату обращения.</p></div><div class="hero-actions"><a class="button button--ghost" href="${ctx.href("apartments.html")}">Квартиры</a><a class="button button--ghost" href="${ctx.href("houses.html")}">Дома</a><a class="button button--ghost" href="${ctx.href("lands.html")}">Участки</a><a class="button button--ghost" href="${ctx.href("commercial.html")}">Коммерческая</a></div></div></section>`;
  const related = splitSection(ctx, { kicker: "Связанные маршруты", title: "Продолжить выбор", left: { title: "Виды недвижимости", text: "Перейти к квартирам, домам, участкам, коммерческим объектам, гаражам и парковке.", href: "services.html", label: "Все направления" }, right: { title: "Практический материал", text: "Открыть чек-лист, связанный с проверкой этой территории.", href: `guides/${location.relatedGuide}.html`, label: "Читать материал" } });
  const body = `${hero(ctx, page)}${context}${who}${checks}${types}${related}${leadForm(ctx, { type: "service", goal: "buy", title: `Недвижимость: ${location.name}`, text: "Укажите тип, цель, бюджет и обязательные параметры. Офис начнёт с актуальных данных." })}`;
  return layout(ctx, page, body, { active: "locations", breadcrumbs: [{ label: "Главная", href: "" }, { label: "География", href: "locations/index.html" }, { label: location.name, href: page.path }] });
}

export function renderGuidesIndex(ctx, guides) {
  const page = { path: "guides/index.html", pageType: "guides", title: "Материалы о недвижимости и сделках в Шахтах — Домиан", description: "Информационные материалы о квартирах, домах, участках, территориях и подготовке разных типов недвижимости к продаже в Шахтах.", eyebrow: "Полезные материалы", h1: "Короткие ответы и рабочие чек-листы", lead: "Материалы подготовлены на основе открытых источников, носят информационный характер и не заменяют разбор конкретного объекта.", primaryCta: { label: "Выбрать материал", href: "#guide-list" }, secondaryCta: { label: "Виды недвижимости", href: "apartments.html" }, heroFacts: ["открытые источники", "дата актуальности", "условия могут меняться"], heroImage: "client-meeting" };
  const list = `<section class="section" id="guide-list"><div class="container guide-grid">${guides.map((guide, index) => `<article class="guide-card"><span>${String(index + 1).padStart(2, "0")} · ${esc(guide.readTime)}</span><h2><a href="${ctx.href(`guides/${guide.slug}.html`)}">${esc(guide.title)}</a></h2><p>${esc(guide.answer)}</p><a class="text-link" href="${ctx.href(`guides/${guide.slug}.html`)}">Читать материал ↗</a></article>`).join("")}</div></section>`;
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

export function renderPerson(ctx) {
  const page = { path: "team/maria-voronina.html", pageType: "person", title: "Мария Воронина — собственник офиса Домиан в Шахтах", description: "Мария Воронина, собственник офиса «Домиан · Шахты на Маяковского»: подтверждённые контакты и направления недвижимости.", eyebrow: "Собственник офиса", h1: "Мария Воронина", lead: "Прямой контакт офиса «Домиан · Шахты на Маяковского» по вопросам покупки, продажи и предварительной оценки разных типов недвижимости.", primaryCta: { label: "Позвонить Марии", href: ctx.site.phoneHref, event: "phone_click" }, secondaryCta: { label: "Контакты офиса", href: "contacts.html" }, heroFacts: ["Шахты", "Маяковского 18А", "подтверждённые контакты"], heroImage: "client-meeting" };
  const profile = `<section class="section"><div class="container profile-layout">${ownerPortrait(ctx, "large")}<div><p class="eyebrow">Подтверждённые данные</p><h2>Собственник офиса в Шахтах</h2><p>Мария представляет офис по адресу ${esc(ctx.site.address)}. Через сайт можно обратиться по вопросам квартир, домов, участков, коммерческой недвижимости, гаражей и парковочных мест.</p><dl class="profile-facts"><div><dt>Офис</dt><dd>${esc(ctx.site.displayName)}</dd></div><div><dt>Телефон</dt><dd><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></dd></div><div><dt>Email</dt><dd><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></dd></div><div><dt>Город</dt><dd>Шахты</dd></div></dl>${socialLinks(ctx, "social-links social-links--profile")}</div></div></section>`;
  const roles = cardsSection(ctx, { kicker: "С чем обратиться", title: "Основные сценарии офиса", intro: "Конкретный состав работы уточняется после знакомства с задачей.", items: [
    { index: "01", title: "Покупка недвижимости", text: "Квартиры, дома, участки, коммерческие объекты, гаражи и парковка.", href: "services.html" },
    { index: "02", title: "Продажа недвижимости", text: "Предварительный разбор объекта и следующего шага.", href: "sell.html" },
    { index: "03", title: "Предварительная оценка", text: "Характеристики объекта и доступные аналоги без автоматической цены.", href: "valuation.html" }
  ] });
  return layout(ctx, page, `${hero(ctx, page)}${profile}${roles}${leadForm(ctx, { type: "service", title: "Написать в офис", text: "Форма пока не подключена к внешнему сервису; используйте телефон или email." })}`, { active: "contacts", breadcrumbs: [{ label: "Главная", href: "" }, { label: "Мария Воронина", href: page.path }] });
}

export function renderContacts(ctx) {
  const page = { path: "contacts.html", pageType: "contact", title: "Контакты — Домиан · Шахты на Маяковского", description: "Адрес, телефон, email и подтверждённые мессенджеры офиса «Домиан · Шахты на Маяковского», собственник Мария Воронина.", eyebrow: "Связаться с офисом", h1: "Начните с короткого разговора", lead: "Позвоните, напишите на email или выберите удобный мессенджер. Часы посещения офиса лучше уточнить заранее.", primaryCta: { label: `Позвонить ${ctx.site.phone}`, href: ctx.site.phoneHref, event: "phone_click" }, secondaryCta: { label: "Написать письмо", href: `mailto:${ctx.site.email}` }, heroFacts: ["Мария Воронина", "Шахты", "ул. Маяковского 18А"] };
  const contact = `<section class="section"><div class="container contact-layout"><div class="contact-grid"><article><span>01 · Телефон</span><h2><a href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></h2><p>Самый прямой способ обсудить задачу.</p></article><article><span>02 · Email</span><h2><a href="mailto:${esc(ctx.site.email)}" data-analytics="email_click">${esc(ctx.site.email)}</a></h2><p>Подходит, если нужно отправить описание без чувствительных документов.</p></article><article><span>03 · Адрес</span><h2>${esc(ctx.site.address)}</h2><p>Часы посещения уточните по телефону.</p></article><article><span>04 · Мессенджеры</span><h2>Напишите Марии</h2><p>Подтверждённые каналы офиса — без QR-кодов и промежуточных страниц.</p>${socialLinks(ctx, "social-links social-links--contact")}</article></div><aside class="contact-owner">${ownerPortrait(ctx, "compact")}<p>Мария Воронина<br><span>собственник офиса</span></p></aside></div></section>`;
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
  const page = { path: "404.html", pageType: "error", title: "Страница не найдена — Домиан Шахты", description: "Запрошенная страница офиса «Домиан · Шахты на Маяковского» не найдена. Перейдите на главную или к видам недвижимости.", h1: "Страница не найдена" };
  const body = `<section class="status-page"><div class="container status-card"><span class="status-code">404</span><p class="eyebrow">Такой страницы нет</p><h1>Вернёмся к выбору недвижимости</h1><p>Ссылка могла измениться. Перейдите на главную, к видам недвижимости или свяжитесь с офисом.</p><div class="hero-actions"><a class="button button--primary" href="${ctx.href("")}">На главную</a><a class="button button--ghost" href="${ctx.href("apartments.html")}">Виды недвижимости</a></div><a class="text-link" href="${ctx.site.phoneHref}">${esc(ctx.site.phone)} ↗</a></div></section>`;
  return layout(ctx, page, body);
}

export { esc };
