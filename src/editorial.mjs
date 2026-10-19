import { publicCopy } from "./public-copy.mjs";

const esc = (value = "") => publicCopy(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");

export function editorialSection(ctx, section) {
  return `<section class="section editorial-section${section.stone ? " section--stone" : ""}"${section.id ? ` id="${esc(section.id)}"` : ""}${section.homeSection ? ` data-home-section="${esc(section.homeSection)}"` : ""}><div class="container"><div class="section-heading"><div><p class="eyebrow">${esc(section.kicker || "Полезно перед решением")}</p><h2>${esc(section.title)}</h2></div>${section.intro ? `<p>${esc(section.intro)}</p>` : ""}</div><div class="editorial-grid">${(section.items || []).map((item) => `<article class="editorial-card"><h3>${esc(item.title)}</h3>${(item.paragraphs || []).map((text) => `<p>${esc(text)}</p>`).join("")}${item.checklist?.length ? `<ul>${item.checklist.map((text) => `<li>${esc(text)}</li>`).join("")}</ul>` : ""}${(item.links || []).map((link) => `<a class="text-link" href="${esc(ctx.href(link.href))}"${link.href.startsWith("https:") ? ' target="_blank" rel="noopener noreferrer"' : ""}>${esc(link.label)} ↗</a>`).join("")}</article>`).join("")}</div></div></section>`;
}

export function officeLinksSection(ctx, { home = false } = {}) {
  const maps = ctx.site.maps;
  if (!maps) return "";
  const rating = maps.yandex.snapshot;
  return `<section class="section section--stone office-discovery" aria-labelledby="office-discovery-title"${home ? ' data-home-section="reviews"' : ""}><div class="container"><div class="section-heading"><div><p class="eyebrow">Офис на Маяковского</p><h2 id="office-discovery-title">Найдите нас и посмотрите отзывы</h2></div><p>В Шахтах несколько офисов сети «Домиан». Мы — офис на Маяковского, 18А, этаж 2.</p></div><div class="office-discovery__grid"><article><h3>Время работы</h3><p class="office-discovery__value">${esc(ctx.site.officeHours?.label || "Согласуйте время визита")}</p><p>Перед визитом в выходной или праздничный день уточните график по телефону.</p><a class="text-link" href="${ctx.site.phoneHref}" data-analytics="phone_click">${esc(ctx.site.phone)}</a></article><article><h3>Нас оценивают в Яндекс Картах</h3>${rating ? `<p class="office-discovery__value">${esc(String(rating.rating).replace(".", ","))} · ${rating.ratingsCount} оценки</p><p>${rating.reviewsCount} отзывов · «Хорошее место 2026»</p><small>Данные на ${esc(rating.checkedAtLabel)}. Актуальные оценки и отзывы — в карточке.</small>` : ""}<a class="text-link" href="${esc(maps.yandex.url)}" target="_blank" rel="noopener noreferrer">Отзывы в Яндекс Картах ↗</a><button class="button button--ghost" type="button" data-load-reviews aria-expanded="false">Показать отзывы на сайте</button></article><article><h3>Как добраться</h3><p>${esc(ctx.site.address)}, этаж 2.</p><a class="button button--ghost" href="${esc(maps.yandex.routeUrl)}" target="_blank" rel="noopener noreferrer">Маршрут в Яндекс Картах</a><a class="text-link" href="${esc(maps.twoGis.url)}" target="_blank" rel="noopener noreferrer">Офис в 2ГИС ↗</a></article></div><div class="yandex-reviews" data-reviews-widget hidden><iframe data-src="https://yandex.ru/maps-reviews-widget/${esc(maps.yandex.organizationId)}?comments" title="Отзывы об офисе Домиан на Маяковского в Яндекс Картах" width="560" height="600" loading="lazy"></iframe><a href="${esc(maps.yandex.url)}" target="_blank" rel="noopener noreferrer">Домиан · Шахты на Маяковского — Яндекс Карты</a></div></div></section>`;
}

export function pricingSection(ctx) {
  if (!ctx.pricing?.items?.length) return "";
  return `<section class="section section--stone" id="service-prices"><div class="container"><div class="section-heading"><div><p class="eyebrow">До начала работы</p><h2>Стоимость и условия услуг</h2></div><p>Условия и состав работ фиксируем в договоре. Дополнительные расходы обсуждаем отдельно.</p></div><div class="pricing-table-wrap"><table class="pricing-table"><thead><tr><th scope="col">Услуга</th><th scope="col">Стоимость</th><th scope="col">Кто оплачивает</th></tr></thead><tbody>${ctx.pricing.items.map((item) => `<tr><th scope="row">${esc(item.label)}</th><td>${Number.isFinite(item.value) ? `${new Intl.NumberFormat("ru-RU").format(item.value)} ₽` : "Согласуем до начала работ"}</td><td>${esc(item.payer || "По договору")}</td></tr>`).join("")}</tbody></table></div><p>Юридическое сопровождение сделки — отдельная услуга; её состав согласуем до оплаты.</p></div></section>`;
}

export function builtExamplesSection(ctx, picture) {
  const examples = ctx.constructionProjects?.builtExamples || [];
  if (!examples.length) return "";
  return `<section class="section section--stone" id="built-examples"><div class="container"><div class="section-heading"><div><p class="eyebrow">Построим Дом</p><h2>Шесть примеров построенных домов</h2></div><p>Компания работает и на участках в Шахтах. Фотографии показывают её завершённые работы в Ростове-на-Дону и Константиновске; условия строительства вашего дома рассчитываем отдельно.</p></div><p><a class="text-link" href="${ctx.href("construction/builders/postroim-dom.html")}">О компании «Построим Дом» и расчёте для вашего участка ↗</a></p><div class="product-grid">${examples.map((item) => `<article class="product-card construction-built-card" data-built-example="${esc(item.id)}"><a class="product-card__media" href="${ctx.href(`construction/projects/${item.slug}.html`)}">${picture(ctx, item.mainImage, { sizes: "(max-width: 760px) calc(100vw - 32px), 31vw" })}<span class="product-quality is-project">Построенный дом</span></a><div class="product-card__body"><p class="product-card__eyebrow">${esc(item.location)} · Построим Дом</p><h3><a href="${ctx.href(`construction/projects/${item.slug}.html`)}">${esc(item.title)}</a></h3><p>${esc(item.description)}</p>${builtExampleTerms(item)}<a class="product-card__cta" href="${ctx.href(`construction/projects/${item.slug}.html`)}">Посмотреть дом ↗</a></div></article>`).join("")}</div><p>Мы — агентство недвижимости. Подрядчик, участок, проект, комплектация и смета согласуются перед договором.</p><a class="text-link" href="https://postroim-dom-rostov.ru/" target="_blank" rel="noopener noreferrer">Портфолио строительной компании ↗</a></div></section>`;
}

function builtExampleTerms(item) {
  return `<p class="built-example-terms">Срок строительства — ${esc(item.constructionDays)} дней · ${esc(item.pricePackage.toLocaleLowerCase("ru-RU"))}</p><p><small>Построенный дом из портфолио компании. Обсудим комплектацию и график строительства для вашего участка.</small></p>`;
}

export function constructionFamilyMortgage(ctx) {
  return editorialSection(ctx, {
    id: "construction-family-mortgage",
    kicker: "Варианты финансирования",
    title: "Семейная ипотека на строительство дома",
    intro: "Обсудите с офисом, можно ли рассмотреть программу для вашей семьи и участка.",
    items: [{
      title: "Проверить условия до выбора проекта",
      paragraphs: [
        "Поможем подготовить вопросы по требованиям программы к семье, участку, подрядчику и договору. Обсудим расчёты через эскроу, первоначальный взнос и полную стоимость кредита.",
        "Поможем обсудить строительство дома с семейной ипотекой: участок, проект, подрядчика и комплект документов для обращения в банк.",
        "Расскажите о составе семьи, участке и бюджете. Подготовим вопросы по финансированию и следующий шаг к строительству вашего дома."
      ],
      links: [{ label: "Обсудить финансирование с офисом", href: "#lead-form-section" }]
    }]
  });
}

export function constructionBuilderBody(ctx, picture) {
  const example = ctx.constructionProjects.builtExamples[0];
  return `<header class="catalog-detail__hero catalog-detail__hero--construction"><div class="container catalog-detail__hero-layout"><div><p class="eyebrow">Строительная компания</p><h1>Построим Дом: строительство домов в Ростовской области</h1><p>«Построим Дом» занимается строительством частных домов. Здесь собраны шесть завершённых объектов компании: каменные и кирпичные дома площадью 100–120 м².</p><p>География — Ростов-на-Дону и Ростовская область. Компания работает на участках в Шахтах. Дома в портфолио построены в Ростове-на-Дону и Константиновске.</p><div class="hero-actions"><a class="button button--primary" href="#lead-form-section">Обсудить ваш дом</a><a class="button button--ghost" href="#built-examples">Построенные дома</a></div></div><div class="catalog-detail__media">${picture(ctx, example.mainImage, { priority: true, sizes: "(max-width: 820px) calc(100vw - 32px), 52vw" })}<span>Построенный дом компании в Константиновске</span></div></div></header>${editorialSection(ctx, {
    kicker: "Направления работы",
    title: "С каким запросом можно обратиться",
    items: [
      { title: "Строительство домов", paragraphs: ["Обсудите планировку и состав работ для будущего дома. Примеры из портфолио помогут объяснить, какой результат вы хотите получить."] },
      { title: "Строительство по своему проекту", paragraphs: ["Если проект уже есть, передайте его для рассмотрения. Возможность строительства и состав расчёта зависят от документации и особенностей участка."] },
      { title: "Индивидуальное проектирование", paragraphs: ["Сформулируйте требования к площади, комнатам и размещению дома. Объём проектирования и дальнейшие работы согласуются отдельно."] }
    ]
  })}${builtExamplesSection(ctx, picture)}${editorialSection(ctx, {
    title: "Что нужно для расчёта",
    intro: "Передайте исходные данные в офис Домиан на Маяковского. Они помогут начать предметное обсуждение с компанией.",
    items: [
      { title: "Участок", paragraphs: ["Укажите адрес или кадастровый номер, площадь земли и известные подключения. Если участок ещё не выбран, напишите об этом."], links: [{ label: "Посмотреть участки", href: "lands.html" }] },
      { title: "Площадь", paragraphs: ["Назовите желаемую площадь дома, этажность и количество комнат. Если есть проект или набросок планировки, сообщите об этом в комментарии."] },
      { title: "Бюджет", paragraphs: ["Обозначьте общий бюджет и способ оплаты. Уточните, какие работы должны войти в расчёт: инженерия, отделка, подключения и благоустройство."] }
    ]
  })}${constructionFamilyMortgage(ctx)}`;
}

export function builtExampleBody(ctx, item, picture) {
  const facts = [["Компания", "Построим Дом"], ["Город построенного дома", item.location], ["Площадь", `${item.area} м²`], ["Материал", item.material], ["Спальни", item.bedrooms]].filter(([, value]) => value != null);
  return `<header class="catalog-detail__hero catalog-detail__hero--construction" data-construction-project="${esc(item.slug)}"><div class="container catalog-detail__hero-layout"><div><p class="eyebrow">Построим Дом · построенный объект</p><h1>${esc(item.title)}</h1><p>${esc(item.description)}</p>${builtExampleTerms(item)}<p>Этот дом построен в ${item.location === "Константиновск" ? "Константиновске" : "Ростове-на-Дону"}. Посмотрите решение из портфолио компании и обсудите строительство на вашем участке в Шахтах.</p><p><a class="text-link" href="${ctx.href("construction/builders/postroim-dom.html")}">О компании «Построим Дом» и направлениях работы ↗</a></p><div class="hero-actions"><a class="button button--primary" href="#lead-form-section">Обсудить строительство в Шахтах</a><a class="button button--ghost" href="${ctx.href("construction.html#built-examples")}">Все построенные дома</a></div></div><div class="catalog-detail__media">${picture(ctx, item.mainImage, { priority: true, sizes: "(max-width: 820px) calc(100vw - 32px), 52vw" })}<span>Фотография построенного дома</span></div></div></header><section class="section"><div class="container catalog-detail__facts"><div><p class="eyebrow">Построенный объект</p><h2>Характеристики примера</h2><p>Мы помогаем обсудить строительство с компанией на вашем участке. Возможность повторить решение зависит от земли, проекта и выбранных работ.</p></div><dl>${facts.map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join("")}</dl></div></section>${editorialSection(ctx, { title: "Что обсудить для вашего дома", items: [{ title: "Участок и проект", paragraphs: ["Перед расчётом нужны адрес или кадастровый номер участка, желаемая площадь и состав помещений. Проверяем, подходит ли решение по размерам, подъезду и ограничениям земли."], links: [{ label: "Выбор участка", href: "lands.html" }, { label: "Кадастровые работы", href: "kadastrovye-raboty.html" }] }, { title: "Комплектация и бюджет", paragraphs: ["Поможем составить вопросы к смете: конструктив, инженерные системы, отделка и подключение внешних сетей. Обсудим комплектацию и бюджет строительства на вашем участке."], links: [{ label: "Помощь с ипотекой", href: "mortgage.html" }] }] })}${constructionFamilyMortgage(ctx)}`;
}
