(function () {
  "use strict";

  var config = window.DOMIAN_SITE_CONFIG || {};
  var allowedAnalyticsKeys = ["page_type", "object_type", "object_id", "location", "source_section", "source_cta", "interaction", "filter_name", "filter_value"];
  var allowedEvents = [
    "catalog_filter_use", "property_card_open", "construction_interest", "project_open",
    "guide_to_catalog", "guide_to_lead", "location_to_construction", "map_click",
    "phone_click", "email_click", "whatsapp_click", "telegram_click", "max_click", "instagram_click",
    "lead_form_view", "lead_form_open",
    "lead_form_submit_attempt", "lead_form_success", "lead_form_error", "mortgage_interaction"
  ];

  function queryAll(selector, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(selector));
  }

  function analyticsDisabled() {
    var host = (window.location.hostname || "").toLowerCase();
    var qa = new URLSearchParams(window.location.search || "").get("qa") === "1";
    return !config.metrikaId || host === "localhost" || host === "::1" || /^127(?:\.\d+){3}$/u.test(host) || qa;
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
      if (typeof window.ym === "function") window.ym(config.metrikaId, "reachGoal", name, safe);
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
    window.ym(config.metrikaId, "init", { clickmap: true, trackLinks: true, accurateTrackBounce: true });
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

  function initPropertyNav() {
    queryAll("[data-property-nav]").forEach(function (details) {
      var summary = details.querySelector("summary");
      document.addEventListener("click", function (event) {
        if (details.open && !details.contains(event.target)) details.open = false;
      });
      document.addEventListener("keydown", function (event) {
        if (!details.open || event.key !== "Escape") return;
        event.preventDefault();
        details.open = false;
        if (summary) summary.focus();
      });
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
      if (territory && context.territory) territory.value = context.territory;
      if (message && context.message && (!message.value.trim() || message.dataset.contextPrefilled === "true")) {
        message.value = context.message;
        message.dataset.contextPrefilled = "true";
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
        if (status) { status.hidden = false; status.textContent = "Критерии перенесены в форму. Добавьте имя и телефон или свяжитесь с офисом напрямую."; }
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
        if (digits.length < 10 || digits.length > 15) {
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
        if (status) { status.hidden = false; status.textContent = "Запрос собран. Телефон перенесён в финальную форму — подтвердите согласие или свяжитесь с офисом напрямую."; }
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
          message: category ? "Интересует направление: " + label + ". Подготовьте актуальную подборку без демонстрационных объектов." : (readLeadContext().message || ""),
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

  persistAttribution();
  initMetrika();
  initHeader();
  initDrawer();
  initPropertyNav();
  initReveal();
  applyLeadContext(readLeadContext());
  initRequestBuilders();
  initHomeRequestBuilder();
  initLeadDisclosure();
  initShowcaseFilters();
  initInteractionTracking();
  initMortgage();
  initCatalogs();
}());
