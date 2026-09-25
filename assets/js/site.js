(function () {
  "use strict";

  var config = window.DOMIAN_SITE_CONFIG || {};
  var allowedAnalyticsKeys = ["page_type", "object_type", "object_id", "location", "source_section", "source_cta", "interaction", "filter_name", "filter_value"];
  var allowedEvents = [
    "catalog_filter_use", "property_card_open", "construction_interest", "project_open",
    "guide_to_catalog", "guide_to_lead", "location_to_construction", "map_click",
    "phone_click", "email_click", "telegram_click", "max_click", "instagram_click",
    "lead_form_view", "lead_form_open",
    "lead_form_submit_attempt", "lead_form_success", "lead_form_error", "mortgage_interaction"
  ];

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function analyticsDisabled() {
    var host = (window.location.hostname || "").toLowerCase();
    var qa = new URLSearchParams(window.location.search || "").get("qa") === "1";
    var consent = "";
    try { consent = window.localStorage.getItem("domian_analytics_consent") || ""; } catch (_error) { /* optional */ }
    return (!config.metrikaId && !config.ga4Id) || (!config.analyticsTestMode && (host === "localhost" || host === "::1" || /^127(?:\.\d+){3}$/u.test(host))) || qa || Boolean(window.location.search) || consent !== "accepted";
  }

  window.DOMIAN_ANALYTICS_DISABLED = analyticsDisabled();

  function cleanParams(params) {
    var safe = {};
    allowedAnalyticsKeys.forEach(function (key) {
      if (!params || params[key] == null || params[key] === "") return;
      safe[key] = String(params[key]).trim().replace(/[^a-zа-яё0-9_-]+/giu, "_").slice(0, 64);
    });
    return safe;
  }

  function track(name, params) {
    if (allowedEvents.indexOf(name) === -1) return;
    var safe = cleanParams(params || {});
    try {
      if (typeof window.DOMIAN_ANALYTICS_TEST_HOOK === "function") {
        window.DOMIAN_ANALYTICS_TEST_HOOK(name, safe);
      }
      if (window.DOMIAN_ANALYTICS_DISABLED) return;
      if (config.metrikaId && typeof window.ym === "function") window.ym(config.metrikaId, "reachGoal", name, safe);
      if (config.ga4Id && typeof window.gtag === "function") window.gtag("event", name, safe);
    } catch (_error) {
      // Analytics never interrupts the site.
    }
  }

  window.domianTrack = track;

  function initMetrika() {
    var script;
    if (window.DOMIAN_ANALYTICS_DISABLED || typeof window.ym === "function") return;
    window.ym = function () { (window.ym.a = window.ym.a || []).push(arguments); };
    window.ym.l = Date.now();
    script = document.createElement("script");
    script.async = true;
    script.src = "https://mc.yandex.ru/metrika/tag.js?id=" + encodeURIComponent(config.metrikaId);
    document.head.appendChild(script);
    window.ym(config.metrikaId, "init", { clickmap: false, trackLinks: false, accurateTrackBounce: false, defer: true });
    window.ym(config.metrikaId, "hit", window.location.origin + window.location.pathname);
  }

  function initGa4() {
    if (window.DOMIAN_ANALYTICS_DISABLED || !config.ga4Id || typeof window.gtag === "function") return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", config.ga4Id, { send_page_view: false });
    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(config.ga4Id);
    document.head.appendChild(script);
    window.gtag("event", "page_view", { page_location: window.location.origin + window.location.pathname, page_title: document.title });
  }

  function initAnalyticsConsent() {
    var host = (window.location.hostname || "").toLowerCase();
    var choice = "";
    if ((!config.metrikaId && !config.ga4Id) || (!config.analyticsTestMode && (host === "localhost" || host === "::1" || /^127(?:\.\d+){3}$/u.test(host))) || window.location.search) return;
    try { choice = window.localStorage.getItem("domian_analytics_consent") || ""; } catch (_error) { /* optional */ }
    if (choice) return;
    var notice = document.createElement("aside");
    notice.className = "analytics-consent";
    notice.setAttribute("aria-label", "Аналитика сайта");
    notice.innerHTML = '<p>Разрешить аналитические cookies для улучшения сайта? Подробности — в <a href="' + config.basePath + '/privacy.html">политике обработки данных</a>.</p><div><button type="button" data-analytics-accept>Разрешить</button><button type="button" data-analytics-decline>Отказаться</button></div>';
    document.body.appendChild(notice);
    notice.addEventListener("click", function (event) {
      var accepted = event.target.hasAttribute("data-analytics-accept");
      if (!accepted && !event.target.hasAttribute("data-analytics-decline")) return;
      try { window.localStorage.setItem("domian_analytics_consent", accepted ? "accepted" : "declined"); } catch (_error) { /* optional */ }
      notice.remove();
      if (accepted) {
        window.DOMIAN_ANALYTICS_DISABLED = false;
        initMetrika();
        initGa4();
      }
    });
  }

  function initThanks() {
    var title = document.querySelector("[data-thanks-title]");
    var message = document.querySelector("[data-thanks-message]");
    if (!title || !message) return;
    var sentAt = 0;
    try {
      sentAt = Number(window.sessionStorage.getItem("domian_form_success") || 0);
      window.sessionStorage.removeItem("domian_form_success");
    } catch (_error) { /* optional */ }
    if (!sentAt || Date.now() - sentAt > 5 * 60 * 1000) return;
    title.textContent = "Спасибо за обращение";
    message.textContent = "Ваше обращение отправлено. Мы свяжемся с вами по указанному номеру.";
    document.title = "Спасибо за обращение — Домиан Шахты";
  }

  function persistAttribution() {
    var params = new URLSearchParams(window.location.search || "");
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"].forEach(function (key) {
      var value = params.get(key);
      if (!value) return;
      try { window.sessionStorage.setItem("domian_" + key, value.slice(0, 200)); } catch (_error) { /* optional */ }
    });
  }

  function initHeader() {
    var header = document.querySelector("[data-site-header]");
    if (!header) return;
    var frame = false;
    function update() {
      header.classList.toggle("is-scrolled", window.scrollY > 24);
      frame = false;
    }
    function requestUpdate() {
      if (frame) return;
      frame = true;
      window.requestAnimationFrame(update);
    }
    update();
    window.addEventListener("scroll", requestUpdate, { passive: true });
  }

  function initDrawer() {
    var toggle = document.querySelector("[data-menu-toggle]");
    var drawer = document.getElementById("mobile-drawer");
    var panel = drawer ? drawer.querySelector(".mobile-drawer__panel") : null;
    var previouslyFocused = null;
    if (!toggle || !drawer || !panel) return;

    function focusable() {
      return queryAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])', panel)
        .filter(function (element) { return !element.hidden && element.offsetParent !== null; });
    }

    function setOpen(open, returnFocus) {
      drawer.classList.toggle("is-open", open);
      drawer.setAttribute("aria-hidden", String(!open));
      drawer.inert = !open;
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Закрыть меню" : "Открыть меню");
      document.body.classList.toggle("drawer-open", open);
      if (open) {
        previouslyFocused = document.activeElement;
        window.requestAnimationFrame(function () {
          var items = focusable();
          if (items.length) items[0].focus();
        });
      } else if (returnFocus && previouslyFocused) {
        previouslyFocused.focus();
      }
    }

    toggle.addEventListener("click", function () { setOpen(!drawer.classList.contains("is-open"), false); });
    queryAll("[data-drawer-close]", drawer).forEach(function (button) {
      button.addEventListener("click", function () { setOpen(false, true); });
    });
    queryAll("a", panel).forEach(function (link) {
      link.addEventListener("click", function () { setOpen(false, false); });
    });
    document.addEventListener("keydown", function (event) {
      if (!drawer.classList.contains("is-open")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false, true);
      } else if (event.key === "Tab") {
        var items = focusable();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    var desktopQuery = window.matchMedia("(min-width: 1121px)");
    var closeAtDesktop = function (event) {
      if (event.matches) setOpen(false, false);
    };
    if (typeof desktopQuery.addEventListener === "function") desktopQuery.addEventListener("change", closeAtDesktop);
    else if (typeof desktopQuery.addListener === "function") desktopQuery.addListener(closeAtDesktop);
  }

  function initNavigationMenus() {
    var menus = queryAll("[data-nav-menu]");
    menus.forEach(function (details) {
      var summary = details.querySelector("summary");
      details.addEventListener("toggle", function () {
        if (summary) summary.setAttribute("aria-expanded", String(details.open));
        if (!details.open || details.classList.contains("nav-menu--mobile")) return;
        menus.forEach(function (other) {
          if (other !== details && !other.classList.contains("nav-menu--mobile")) other.open = false;
        });
      });
    });
    document.addEventListener("click", function (event) {
      menus.forEach(function (details) {
        if (details.open && !details.contains(event.target) && !details.classList.contains("nav-menu--mobile")) details.open = false;
      });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key !== "Escape") return;
      var openMenu = menus.find(function (details) { return details.open; });
      if (!openMenu) return;
      event.preventDefault();
      openMenu.open = false;
      var summary = openMenu.querySelector("summary");
      if (summary) summary.focus();
    });
  }

  function initReveal() {
    var targets = queryAll("[data-reveal]");
    if (!targets.length) return;
    queryAll("[data-reveal-group]").forEach(function (group) {
      queryAll("[data-reveal]", group).forEach(function (item, index) {
        item.style.setProperty("--reveal-delay", Math.min(index * 65, 260) + "ms");
      });
    });
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      targets.forEach(function (target) { target.classList.add("is-visible"); });
      return;
    }
    document.body.classList.add("is-reveal-ready");
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -6%" });
    targets.forEach(function (target) { observer.observe(target); });

    var revealFrame = false;
    function revealPassedTargets() {
      if (revealFrame) return;
      revealFrame = true;
      window.requestAnimationFrame(function () {
        targets.forEach(function (target) {
          if (target.classList.contains("is-visible")) return;
          if (target.getBoundingClientRect().top > window.innerHeight * 0.96) return;
          target.classList.add("is-visible");
          observer.unobserve(target);
        });
        revealFrame = false;
      });
    }
    window.addEventListener("scroll", revealPassedTargets, { passive: true });
    revealPassedTargets();
  }

  function readLeadContext() {
    try {
      var parsed = JSON.parse(window.sessionStorage.getItem("domian_lead_context") || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      if (parsed.captured_at && Date.now() - Number(parsed.captured_at) > 30 * 60 * 1000) return {};
      return parsed;
    } catch (_error) {
      return {};
    }
  }

  function writeLeadContext(context) {
    try { window.sessionStorage.setItem("domian_lead_context", JSON.stringify(context)); } catch (_error) { /* optional */ }
  }

  function initLeadCommentOwnership() {
    queryAll('form[data-lead-form] textarea[name="message"]').forEach(function (message) {
      message.addEventListener("input", function () {
        var context = readLeadContext();
        message.dataset.criteriaPrefilled = "false";
        context.message = message.value;
        context.comment_is_manual = true;
        context.captured_at = Date.now();
        writeLeadContext(context);
      });
    });
  }

  function serviceForCategory(category) {
    var map = {
      "apartment-secondary": "apartment-secondary",
      "apartment-newbuild": "apartment-newbuild",
      "new-house": "house-new",
      "builder-house": "house-builder",
      "secondary-house": "house-secondary",
      apartment: "apartment",
      house: "house",
      land: "land",
      commercial: "commercial",
      "garage-parking": "garage-parking"
    };
    return map[category] || category || "";
  }

  function propertyTypeForCategory(category) {
    if (String(category).indexOf("apartment") === 0) return "apartment";
    if (["new-house", "builder-house", "secondary-house", "house"].indexOf(category) !== -1) return "house";
    return category || "";
  }

  function marketForCategory(category) {
    if (["apartment-secondary", "secondary-house"].indexOf(category) !== -1) return "secondary";
    if (["apartment-newbuild", "new-house", "builder-house"].indexOf(category) !== -1) return "primary";
    return "";
  }

  function applyLeadContext(context) {
    if (!context || typeof context !== "object") return;
    queryAll("form[data-lead-form]").forEach(function (form) {
      var service = form.elements.service;
      var goal = form.elements.goal;
      var propertyType = form.elements.property_type;
      var market = form.elements.market;
      var territory = form.elements.territory;
      var message = form.elements.message;
      if (service && context.service) service.value = context.service;
      if (goal && context.goal) goal.value = context.goal;
      if (propertyType && context.property_type) propertyType.value = context.property_type;
      if (market && context.market) market.value = context.market;
      if (territory && form.dataset.defaultTerritory) territory.value = form.dataset.defaultTerritory;
      else if (territory && context.territory) territory.value = context.territory;
      var contextMatchesTerritory = !form.dataset.defaultTerritory || !context.territory || context.territory === form.dataset.defaultTerritory;
      if (message && context.message && contextMatchesTerritory && (!message.value.trim() || message.dataset.criteriaPrefilled === "true")) {
        message.value = context.message;
        message.dataset.criteriaPrefilled = context.comment_is_manual === true ? "false" : "true";
      }
    });
  }

  function initRequestBuilders() {
    queryAll("[data-request-builder]").forEach(function (form) {
      var status = form.querySelector("[data-request-builder-status]");
      var typeField = form.elements.requestType;

      function updateFields() {
        var type = String(typeField ? typeField.value : "");
        queryAll("[data-request-field]", form).forEach(function (field) {
          var applies = String(field.getAttribute("data-request-field") || "").split(/\s+/u);
          var show = applies.indexOf(type) !== -1 || (field.getAttribute("data-request-field") === "market" && ["apartment", "house"].indexOf(type) !== -1);
          field.hidden = !show;
          queryAll("select, input", field).forEach(function (control) { control.disabled = !show; });
        });
      }
      if (typeField) typeField.addEventListener("change", updateFields);
      updateFields();

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var values = new FormData(form);
        var type = String(values.get("requestType") || "");
        if (!type) {
          if (status) { status.hidden = false; status.textContent = "Сначала выберите тип недвижимости."; }
          if (typeField) typeField.focus();
          return;
        }
        var labels = [
          ["Цель", form.elements.requestGoal.options[form.elements.requestGoal.selectedIndex].text],
          ["Тип", typeField.options[typeField.selectedIndex].text],
          ["Рынок", form.elements.requestMarket && form.elements.requestMarket.options[form.elements.requestMarket.selectedIndex].text],
          ["Территория", values.get("requestLocation")],
          ["Бюджет", values.get("requestBudget")],
          ["Комнаты", values.get("requestRooms")],
          ["Площадь дома", values.get("requestArea")],
          ["Участок", values.get("requestLand")],
          ["Коммерческий тип", values.get("requestCommercial")],
          ["Гараж / место", values.get("requestParking")]
        ].filter(function (item) { return item[1] && item[1] !== "Не определено" && item[1] !== "Уточнить"; });
        var summary = labels.map(function (item) { return item[0] + ": " + item[1]; }).join("; ");
        var context = {
          page_type: document.body.dataset.pageType || "",
          source_cta: "Конструктор критериев",
          service: serviceForCategory(type),
          goal: String(values.get("requestGoal") || "buy"),
          property_type: type,
          market: String(values.get("requestMarket") || ""),
          territory: String(values.get("requestLocation") || ""),
          criteria: summary,
          message: "Критерии подбора: " + summary + ".",
          captured_at: Date.now()
        };
        writeLeadContext(context);
        applyLeadContext(context);
        if (status) { status.hidden = false; status.textContent = document.querySelector("form[data-lead-form]") ? "Критерии перенесены в форму. Добавьте имя и телефон." : "Критерии собраны. Свяжитесь с офисом напрямую, чтобы обсудить варианты."; }
        track("catalog_filter_use", { filter_name: "request_builder", filter_value: type, page_type: document.body.dataset.pageType || "" });
        var lead = document.getElementById("lead-form-section");
        if (lead) lead.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function initHomeRequestBuilder() {
    queryAll("[data-home-request-builder]").forEach(function (form) {
      var status = form.querySelector("[data-home-request-status]");
      var typeField = form.elements.requestType;
      var phoneField = form.elements.requestPhone;
      form.addEventListener("submit", function (event) {
        event.preventDefault();
        var values = new FormData(form);
        var type = String(values.get("requestType") || "");
        var phone = String(values.get("requestPhone") || "");
        var digits = phone.replace(/\D/gu, "");
        if (!type) {
          if (status) { status.hidden = false; status.textContent = "Выберите тип недвижимости."; }
          if (typeField) typeField.focus();
          return;
        }
        if (phoneField && (digits.length < 10 || digits.length > 15)) {
          if (status) { status.hidden = false; status.textContent = "Проверьте номер телефона: нужно от 10 до 15 цифр."; }
          if (phoneField) phoneField.focus();
          return;
        }
        var location = String(values.get("requestLocation") || "");
        var budget = String(values.get("requestBudget") || "");
        var typeLabel = typeField.options[typeField.selectedIndex].text;
        var summary = ["Тип: " + typeLabel, location ? "Территория: " + location : "Несколько территорий", budget ? "Бюджет: " + budget : "Бюджет: обсудить"].join("; ");
        var context = {
          page_type: document.body.dataset.pageType || "home",
          source_cta: "Подбор под запрос",
          service: serviceForCategory(type),
          goal: "buy",
          property_type: propertyTypeForCategory(type),
          territory: location,
          criteria: summary,
          message: "Критерии подбора: " + summary + ".",
          captured_at: Date.now()
        };
        writeLeadContext(context);
        applyLeadContext(context);
        var compact = document.querySelector("form[data-lead-compact]");
        if (compact && compact.elements.phone) compact.elements.phone.value = phone;
        if (status) { status.hidden = false; status.textContent = compact ? "Запрос собран. Телефон перенесён в финальную форму — подтвердите согласие." : "Критерии собраны. Свяжитесь с офисом напрямую, чтобы обсудить актуальные варианты."; }
        track("catalog_filter_use", { filter_name: "home_request", filter_value: type, page_type: "home" });
        var lead = document.getElementById("lead-form-section");
        if (lead) lead.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
    });
  }

  function initShowcaseFilters() {
    queryAll("[data-showcase-filters]").forEach(function (filters) {
      var section = filters.closest("section") || document;
      var cards = queryAll("[data-showcase-card]", section);
      queryAll("[data-showcase-filter]", filters).forEach(function (button) {
        button.addEventListener("click", function () {
          var value = button.getAttribute("data-showcase-filter") || "all";
          queryAll("[data-showcase-filter]", filters).forEach(function (item) {
            var active = item === button;
            item.classList.toggle("is-active", active);
            item.setAttribute("aria-pressed", String(active));
          });
          cards.forEach(function (card) { card.hidden = value !== "all" && card.getAttribute("data-category") !== value; });
          track("catalog_filter_use", { filter_name: "showcase", filter_value: value, page_type: document.body.dataset.pageType || "" });
        });
      });
    });
  }

  function initInteractionTracking() {
    document.addEventListener("click", function (event) {
      var link = event.target.closest("a[href]");
      var explicit = event.target.closest("[data-analytics]");
      if (explicit) track(explicit.getAttribute("data-analytics"), { page_type: document.body.dataset.pageType || "" });
      if (!link) return;
      var href = link.getAttribute("href") || "";
      var category = link.getAttribute("data-lead-category") || "";
      if (href.indexOf("#lead-form-section") !== -1 || category) {
        var label = link.getAttribute("data-lead-label") || link.textContent.trim().slice(0, 64);
        var context = Object.assign({}, readLeadContext(), {
          page_type: document.body.dataset.pageType || "",
          source_cta: label,
          service: category ? serviceForCategory(category) : (readLeadContext().service || ""),
          property_type: category ? propertyTypeForCategory(category) : (readLeadContext().property_type || ""),
          market: category ? marketForCategory(category) : (readLeadContext().market || ""),
          message: category ? "Интересует направление: " + label + ". Подготовьте актуальную подборку по выбранным критериям." : (readLeadContext().message || ""),
          captured_at: Date.now()
        });
        writeLeadContext(context);
        applyLeadContext(context);
        if (document.body.dataset.pageType === "guide") track("guide_to_lead", context);
        if (document.body.dataset.pageType === "location") track("location_to_construction", context);
      }
      if (link.matches(".location-card") && href.indexOf("construction") !== -1) {
        track("location_to_construction", { location: link.getAttribute("data-location") || "" });
      }
    });
  }

  function initMortgage() {
    var form = document.querySelector("[data-mortgage-calculator]");
    var result = form ? form.querySelector("[data-mortgage-result]") : null;
    if (!form || !result) return;
    var interacted = false;
    function calculate(event) {
      var values = new FormData(form);
      var price = Number(values.get("price"));
      var down = Number(values.get("downPayment"));
      var rate = Number(values.get("rate"));
      var term = Number(values.get("term"));
      var principal = price - down;
      if (!Number.isFinite(rate) || rate <= 0) {
        result.textContent = "Введите ставку";
        return;
      }
      if (![price, down, term, principal].every(Number.isFinite) || price <= 0 || down < 0 || principal <= 0 || term <= 0) {
        result.textContent = "Проверьте параметры";
        return;
      }
      var months = Math.round(term * 12);
      var monthlyRate = rate / 1200;
      var payment = principal * monthlyRate * Math.pow(1 + monthlyRate, months) / (Math.pow(1 + monthlyRate, months) - 1);
      result.textContent = Math.round(payment).toLocaleString("ru-RU") + " ₽ / мес.";
      if (event && !interacted) {
        interacted = true;
        track("mortgage_interaction", { interaction: "calculation", page_type: "mortgage" });
      }
    }
    form.addEventListener("input", calculate);
    calculate();
  }

  function initLeadDisclosure() {
    queryAll("form[data-lead-form]").forEach(function (form) {
      var type = form.elements.property_type;
      var market = form.querySelector("[data-lead-market]");
      if (!type || !market) return;
      function update() {
        var show = ["apartment", "house"].indexOf(type.value) !== -1;
        market.hidden = !show;
        if (form.elements.market) form.elements.market.disabled = !show;
      }
      type.addEventListener("change", update);
      update();
    });
  }

  function projectCard(item) {
    var article = document.createElement("article");
    article.className = "info-card project-card";
    article.dataset.catalogCard = "";
    article.dataset.location = item.location || "";
    article.dataset.format = item.format || "";
    article.innerHTML = '<span class="card-index">' + String(item.id || "").replace(/[<>]/gu, "") + '</span><h3></h3><p></p><a class="text-link" href="#lead-form-section">Уточнить вариант ↗</a>';
    article.querySelector("h3").textContent = item.title || "Подтверждённый проект";
    article.querySelector("p").textContent = item.description || "Характеристики уточняются.";
    article.querySelector("a").addEventListener("click", function () {
      track("project_open", { object_id: item.id || "", location: item.location || "" });
    });
    return article;
  }

  function initCatalogs() {
    queryAll("[data-catalog-root]").forEach(function (root) {
      var form = root.querySelector("[data-catalog-filters]");
      var grid = root.querySelector("[data-catalog-grid]");
      var count = root.querySelector("[data-catalog-count]");
      var empty = root.querySelector("[data-catalog-empty]");
      if (!form || !grid || !count || !empty) return;
      var dataUrl = (config.basePath || "") + "/assets/data/projects.json";
      fetch(dataUrl).then(function (response) {
        if (!response.ok) throw new Error("catalog");
        return response.json();
      }).then(function (items) {
        var verified = Array.isArray(items) ? items.filter(function (item) { return item.verified === true; }) : [];
        verified.forEach(function (item) { grid.appendChild(projectCard(item)); });
        function filter(event) {
          var values = new FormData(form);
          var location = String(values.get("location") || "");
          var format = String(values.get("format") || "");
          var visible = 0;
          queryAll("[data-catalog-card]", grid).forEach(function (card) {
            var show = (!location || card.dataset.location === location) && (!format || card.dataset.format === format);
            card.hidden = !show;
            if (show) visible += 1;
          });
          count.textContent = String(visible);
          empty.hidden = visible > 0;
          if (event && event.type === "change") {
            track("catalog_filter_use", { filter_name: event.target.name || "", filter_value: event.target.value || "" });
          }
        }
        form.addEventListener("change", filter);
        form.addEventListener("reset", function () { window.setTimeout(filter, 0); });
        filter();
      }).catch(function () {
        count.textContent = "0";
        empty.hidden = false;
      });
    });
  }

  function initLocationSearch() {
    queryAll("[data-location-search]").forEach(function (root) {
      var form = root.querySelector("[data-location-search-form]");
      var localCards = queryAll('[data-location-listing][data-search-scope="local"]', root);
      var nearbyCards = queryAll('[data-location-listing][data-search-scope="nearby"]', root);
      var localCount = root.querySelector("[data-local-count]");
      var localEmpty = root.querySelector("[data-local-empty]");
      var allEmpty = root.querySelector("[data-all-empty]");
      var nearbySection = root.querySelector("[data-nearby-section]");
      var nearbyToggle = root.querySelector("[data-nearby-toggle]");
      var status = root.querySelector("[data-location-search-status]");
      var threshold = Number(root.dataset.nearbyThreshold) || 6;
      var currentLocation = root.dataset.location || "";
      var currentLocationName = root.dataset.locationName || "";
      var nearbyExpanded = false;
      var validTypes = ["all", "apartments", "houses", "lands", "commercial", "parking"];
      if (!form) return;

      function numericValue(value) {
        var digits = String(value || "").replace(/[^0-9]/gu, "");
        if (!digits) return null;
        var parsed = Number(digits);
        return Number.isSafeInteger(parsed) ? parsed : null;
      }

      function stateFromForm() {
        var values = new FormData(form);
        var type = String(values.get("type") || "all");
        var min = numericValue(values.get("priceMin"));
        var max = numericValue(values.get("priceMax"));
        return {
          location: String(values.get("location") || currentLocation),
          type: validTypes.indexOf(type) === -1 ? "all" : type,
          priceMin: min,
          priceMax: max,
          invalidRange: min != null && max != null && min > max
        };
      }

      function stateFromUrl() {
        var params = new URLSearchParams(window.location.search || "");
        var type = params.get("type") || "all";
        return {
          location: currentLocation,
          type: validTypes.indexOf(type) === -1 ? "all" : type,
          priceMin: numericValue(params.get("priceMin")),
          priceMax: numericValue(params.get("priceMax"))
        };
      }

      function setFormState(state) {
        form.elements.location.value = currentLocation;
        form.elements.type.value = state.type;
        form.elements.priceMin.value = state.priceMin == null ? "" : String(state.priceMin);
        form.elements.priceMax.value = state.priceMax == null ? "" : String(state.priceMax);
      }

      function matches(card, state) {
        if (state.invalidRange) return false;
        if (state.type !== "all" && card.dataset.listingCategory !== state.type) return false;
        var hasLimit = state.priceMin != null || state.priceMax != null;
        var price = card.dataset.listingPrice ? Number(card.dataset.listingPrice) : null;
        if (hasLimit && !Number.isFinite(price)) return false;
        if (state.priceMin != null && price < state.priceMin) return false;
        if (state.priceMax != null && price > state.priceMax) return false;
        return true;
      }

      function updateLeadContext(state) {
        var labels = { all: "любая недвижимость", apartments: "квартиры", houses: "дома", lands: "участки", commercial: "коммерческая недвижимость", parking: "гаражи и парковка" };
        var propertyTypes = { apartments: "apartment", houses: "house", lands: "land", commercial: "commercial", parking: "garage-parking" };
        var parts = ["Территория: " + currentLocationName, "Тип: " + labels[state.type]];
        if (state.priceMin != null) parts.push("Цена от: " + state.priceMin.toLocaleString("ru-RU") + " ₽");
        if (state.priceMax != null) parts.push("Цена до: " + state.priceMax.toLocaleString("ru-RU") + " ₽");
        var message = "Критерии подбора: " + parts.join("; ") + ".";
        var context = {
          page_type: "location",
          source_cta: "Поиск по территории",
          service: propertyTypes[state.type] || "service",
          goal: "buy",
          property_type: propertyTypes[state.type] || "",
          territory: currentLocationName,
          criteria: parts.join("; "),
          message: message,
          captured_at: Date.now()
        };
        queryAll("form[data-lead-form]").forEach(function (leadForm) {
          if (leadForm.elements.territory) leadForm.elements.territory.value = currentLocationName;
          if (leadForm.elements.property_type) leadForm.elements.property_type.value = context.property_type;
          if (leadForm.elements.service) leadForm.elements.service.value = context.service;
          if (leadForm.elements.message && (!leadForm.elements.message.value.trim() || leadForm.elements.message.dataset.criteriaPrefilled === "true")) {
            leadForm.elements.message.value = message;
            leadForm.elements.message.dataset.criteriaPrefilled = "true";
          } else if (leadForm.elements.message) {
            context.message = leadForm.elements.message.value;
            context.comment_is_manual = true;
          }
        });
        writeLeadContext(context);
      }

      function applyState(state, announce) {
        var visibleLocal = localCards.filter(function (card) {
          var show = matches(card, state);
          card.hidden = !show;
          return show;
        });
        var matchingNearby = nearbyCards.filter(function (card) { return matches(card, state); });
        matchingNearby.forEach(function (card, index) { card.hidden = index >= 6; });
        nearbyCards.filter(function (card) { return matchingNearby.indexOf(card) === -1; }).forEach(function (card) { card.hidden = true; });
        var showNearby = matchingNearby.length > 0 && (nearbyExpanded || visibleLocal.length < threshold);
        if (localCount) localCount.textContent = String(visibleLocal.length);
        if (localEmpty) localEmpty.hidden = visibleLocal.length > 0;
        if (nearbySection) nearbySection.hidden = !showNearby;
        if (nearbyToggle) nearbyToggle.hidden = matchingNearby.length === 0 || visibleLocal.length < threshold || nearbyExpanded;
        if (allEmpty) allEmpty.hidden = state.invalidRange || visibleLocal.length > 0 || matchingNearby.length > 0;
        queryAll("[data-location-type]", root).forEach(function (button) {
          var selected = button.dataset.locationType === state.type;
          button.classList.toggle("is-active", selected);
          button.setAttribute("aria-pressed", String(selected));
        });
        if (status) {
          status.hidden = !announce && !state.invalidRange;
          status.textContent = state.invalidRange ? "Цена от не может быть больше цены до. Исправьте диапазон." : "Фильтры применены: местных объектов — " + visibleLocal.length + ", рядом — " + matchingNearby.length + ".";
        }
        if (!state.invalidRange) updateLeadContext(state);
      }

      function searchParams(state) {
        var params = new URLSearchParams();
        if (state.type !== "all") params.set("type", state.type);
        if (state.priceMin != null) params.set("priceMin", String(state.priceMin));
        if (state.priceMax != null) params.set("priceMax", String(state.priceMax));
        return params;
      }

      function commitState(state, replace) {
        if (state.location !== currentLocation) {
          var option = form.elements.location.options[form.elements.location.selectedIndex];
          var target = option && option.dataset.url;
          if (target) {
            var nextParams = searchParams(state).toString();
            window.location.assign(target + (nextParams ? "?" + nextParams : ""));
          }
          return;
        }
        var query = searchParams(state).toString();
        var url = window.location.pathname + (query ? "?" + query : "") + window.location.hash;
        window.history[replace ? "replaceState" : "pushState"]({}, "", url);
        applyState(state, true);
        track("catalog_filter_use", { filter_name: "location_search", filter_value: state.type, location: currentLocation, page_type: "location" });
      }

      form.addEventListener("submit", function (event) {
        event.preventDefault();
        nearbyExpanded = false;
        commitState(stateFromForm(), false);
      });
      form.elements.location.addEventListener("change", function () { commitState(stateFromForm(), false); });
      form.addEventListener("reset", function () {
        window.setTimeout(function () {
          setFormState({ type: "all", priceMin: null, priceMax: null });
          nearbyExpanded = false;
          commitState(stateFromForm(), false);
        }, 0);
      });
      queryAll("[data-location-type]", root).forEach(function (button) {
        button.addEventListener("click", function () {
          form.elements.type.value = button.dataset.locationType || "all";
          nearbyExpanded = false;
          commitState(stateFromForm(), false);
        });
      });
      if (nearbyToggle) nearbyToggle.addEventListener("click", function () {
        nearbyExpanded = true;
        applyState(stateFromForm(), true);
        if (nearbySection) nearbySection.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      });
      window.addEventListener("popstate", function () {
        var state = stateFromUrl();
        state.invalidRange = state.priceMin != null && state.priceMax != null && state.priceMin > state.priceMax;
        setFormState(state);
        nearbyExpanded = false;
        applyState(state, false);
      });
      var initial = stateFromUrl();
      initial.invalidRange = initial.priceMin != null && initial.priceMax != null && initial.priceMin > initial.priceMax;
      setFormState(initial);
      applyState(initial, false);
    });
  }

  function initProductCatalogs() {
    queryAll("[data-product-catalog]").forEach(function (root) {
      var form = root.querySelector("[data-product-filters]");
      var cards = queryAll("[data-product-card]", root);
      var count = root.querySelector("[data-product-count]");
      var empty = root.querySelector("[data-product-empty]");
      if (!form || !cards.length) return;

      function field(name) {
        return form.elements[name] ? String(form.elements[name].value || "").trim() : "";
      }

      function matches(card) {
        var query = field("query").toLocaleLowerCase("ru-RU");
        var city = field("city");
        var status = field("status");
        var completeness = field("completeness");
        var builder = field("builder");
        var floors = field("floors");
        var areaRange = field("area");
        var searchable = (card.dataset.search || "").toLocaleLowerCase("ru-RU");
        var area = Number(card.dataset.area);
        var inArea = true;
        if (areaRange) {
          var bounds = areaRange.split("-").map(Number);
          inArea = Number.isFinite(area) && area >= bounds[0] && area <= bounds[1];
        }
        return (!query || searchable.indexOf(query) !== -1)
          && (!city || card.dataset.city === city)
          && (!status || card.dataset.status === status)
          && (!completeness || card.dataset.completeness === completeness)
          && (!builder || card.dataset.builder === builder)
          && (!floors || card.dataset.floors === floors)
          && inArea;
      }

      function apply(announce) {
        var visible = cards.filter(function (card) {
          var show = matches(card);
          card.hidden = !show;
          return show;
        });
        if (count) count.textContent = String(visible.length);
        if (empty) empty.hidden = visible.length > 0;
        if (announce) {
          track("catalog_filter_use", {
            filter_name: root.dataset.productCatalog || "product_catalog",
            filter_value: Array.from(form.elements).filter(function (control) { return control.name && control.value; }).map(function (control) { return control.name + ":" + control.value; }).join("|") || "reset",
            page_type: document.body.dataset.pageType || "catalog"
          });
        }
      }

      form.addEventListener("input", function () { apply(false); });
      form.addEventListener("change", function () { apply(true); });
      form.addEventListener("reset", function () { window.setTimeout(function () { apply(true); }, 0); });
      apply(false);
    });
  }

  persistAttribution();
  initMetrika();
  initGa4();
  initAnalyticsConsent();
  initThanks();
  initHeader();
  initDrawer();
  initNavigationMenus();
  initReveal();
  initLeadCommentOwnership();
  applyLeadContext(readLeadContext());
  initRequestBuilders();
  initHomeRequestBuilder();
  initLeadDisclosure();
  initShowcaseFilters();
  initInteractionTracking();
  initMortgage();
  initCatalogs();
  initLocationSearch();
  initProductCatalogs();
}());
