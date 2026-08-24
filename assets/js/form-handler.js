(function () {
  "use strict";

  var config = window.DOMIAN_SITE_CONFIG || {};
  var endpoint = config.endpoint || "";
  var timeoutMs = Number(config.requestTimeoutMs) || 12000;
  var utmKeys = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

  function text(value) {
    return value == null ? "" : String(value).replace(/\s+/gu, " ").trim();
  }

  function normalizePhone(value) {
    var raw = text(value);
    var digits = raw.replace(/\D/gu, "");
    if (digits.length === 10) return "+7" + digits;
    if (digits.length === 11 && digits.charAt(0) === "8") return "+7" + digits.slice(1);
    if (digits.length === 11 && digits.charAt(0) === "7") return "+" + digits;
    if (raw.charAt(0) === "+" && digits.length >= 10 && digits.length <= 15) return "+" + digits;
    return "";
  }

  function track(name, params) {
    if (typeof window.domianTrack === "function") window.domianTrack(name, params || {});
  }

  function status(form, message, kind) {
    var node = form.querySelector("[data-form-status]");
    if (!node) return;
    node.textContent = message || "";
    node.className = "form-status" + (kind ? " form-status--" + kind : "");
    node.hidden = !message;
  }

  function clearError(field) {
    var error = field.parentElement ? field.parentElement.querySelector(".form-field-error") : null;
    field.classList.remove("is-invalid");
    field.removeAttribute("aria-invalid");
    if (error) error.remove();
  }

  function error(field, message) {
    var node = document.createElement("span");
    clearError(field);
    field.classList.add("is-invalid");
    field.setAttribute("aria-invalid", "true");
    node.className = "form-field-error";
    node.textContent = message;
    field.parentElement.appendChild(node);
  }

  function validate(form) {
    var compact = form.hasAttribute("data-lead-compact");
    var name = form.elements.name;
    var phone = form.elements.phone;
    var goal = form.elements.goal;
    var propertyType = form.elements.property_type;
    var consent = form.elements.privacy_consent;
    var first = null;
    [name, phone, goal, propertyType, consent].forEach(function (field) { if (field) clearError(field); });
    status(form, "", "");
    if (!compact && (!name || text(name.value).length < 2)) {
      if (name) error(name, "Укажите имя — минимум 2 символа.");
      first = first || name;
    }
    var normalized = phone ? normalizePhone(phone.value) : "";
    if (!normalized) {
      if (phone) error(phone, "Укажите номер из 10 или 11 цифр.");
      first = first || phone;
    }
    if (!goal || !goal.value) {
      if (goal) error(goal, "Выберите цель обращения.");
      first = first || goal;
    }
    if (!compact && (!propertyType || !propertyType.value)) {
      if (propertyType) error(propertyType, "Выберите тип недвижимости.");
      first = first || propertyType;
    }
    if (!consent || !consent.checked) {
      if (consent) error(consent, "Нужно подтвердить согласие.");
      first = first || consent;
    }
    if (first) {
      status(form, "Проверьте отмеченные поля.", "error");
      first.focus();
      return false;
    }
    if (name) name.value = text(name.value);
    phone.value = normalized;
    return true;
  }

  function attribution() {
    var values = {};
    utmKeys.forEach(function (key) {
      try { values[key] = text(window.sessionStorage.getItem("domian_" + key)); } catch (_error) { values[key] = ""; }
    });
    return values;
  }

  function leadContext() {
    try {
      var parsed = JSON.parse(window.sessionStorage.getItem("domian_lead_context") || "{}");
      if (!parsed || typeof parsed !== "object") return {};
      if (parsed.captured_at && Date.now() - Number(parsed.captured_at) > 30 * 60 * 1000) return {};
      return parsed;
    } catch (_error) {
      return {};
    }
  }

  function hidden(form, name, value) {
    var node = form.querySelector('input[type="hidden"][name="' + name + '"]');
    if (!node) {
      node = document.createElement("input");
      node.type = "hidden";
      node.name = name;
      form.appendChild(node);
    }
    node.value = text(value);
  }

  function fillPayload(form) {
    var utm = attribution();
    var context = leadContext();
    hidden(form, "access_key", config.web3formsAccessKey || "");
    hidden(form, "subject", "Новая заявка: Домиан · Шахты на Маяковского");
    hidden(form, "from_name", "Домиан · Шахты на Маяковского — сайт");
    hidden(form, "page_url", window.location.href);
    hidden(form, "page_title", document.title);
    hidden(form, "referrer", document.referrer || "");
    hidden(form, "lead_type", form.elements.service ? form.elements.service.value : "service");
    hidden(form, "lead_goal", form.elements.goal ? form.elements.goal.value : "");
    hidden(form, "property_type_context", form.elements.property_type ? form.elements.property_type.value : "");
    hidden(form, "market_context", form.elements.market ? form.elements.market.value : "");
    hidden(form, "territory_context", form.elements.territory ? form.elements.territory.value : "");
    hidden(form, "origin_page", form.getAttribute("data-origin-page") || window.location.pathname);
    hidden(form, "source_cta", context.source_cta || form.getAttribute("data-source-cta") || "form");
    if (context.criteria) hidden(form, "lead_context", context.criteria);
    utmKeys.forEach(function (key) { if (utm[key]) hidden(form, key, utm[key]); });
  }

  function providerError(category) {
    var messages = {
      config: "Форма пока не подключена. Позвоните по номеру " + (config.phoneLabel || "офиса") + " или напишите на " + (config.email || "email офиса") + ".",
      offline: "Нет подключения к интернету. Данные остались в полях — используйте телефон или email.",
      timeout: "Сервис не ответил вовремя. Данные остались в полях — попробуйте ещё раз.",
      rejected: "Сервис не подтвердил отправку. Данные остались в полях — свяжитесь с офисом напрямую.",
      network: "Не удалось связаться с сервисом. Данные остались в полях — используйте телефон или email."
    };
    return messages[category] || messages.network;
  }

  function submit(form, state) {
    if (state.busy || !validate(form)) return;
    track("lead_form_submit_attempt", { page_type: document.body.dataset.pageType || "", source_cta: form.getAttribute("data-source-cta") || "" });
    if (!text(config.web3formsAccessKey) || !text(endpoint)) {
      status(form, providerError("config"), "error");
      track("lead_form_error", { page_type: document.body.dataset.pageType || "", interaction: "config" });
      return;
    }
    if (window.navigator && window.navigator.onLine === false) {
      status(form, providerError("offline"), "error");
      track("lead_form_error", { interaction: "offline" });
      return;
    }
    fillPayload(form);
    var controller = new AbortController();
    var didTimeout = false;
    var timer = window.setTimeout(function () { didTimeout = true; controller.abort(); }, timeoutMs);
    state.busy = true;
    state.button.disabled = true;
    state.button.textContent = "Отправка…";
    form.setAttribute("aria-busy", "true");
    status(form, "Отправляем заявку…", "");
    fetch(endpoint, { method: "POST", body: new FormData(form), headers: { Accept: "application/json" }, signal: controller.signal })
      .then(function (response) { return response.text().then(function (body) { return { response: response, body: body }; }); })
      .then(function (result) {
        var data;
        try { data = JSON.parse(result.body); } catch (_error) { data = null; }
        if (!result.response.ok || !data || data.success !== true) throw new Error("rejected");
        track("lead_form_success", { page_type: document.body.dataset.pageType || "" });
        try { window.sessionStorage.removeItem("domian_lead_context"); } catch (_error) { /* optional */ }
        window.location.assign(config.redirectUrl || "/thanks.html");
      })
      .catch(function (reason) {
        var category = didTimeout || reason.name === "AbortError" ? "timeout" : (reason.message === "rejected" ? "rejected" : "network");
        status(form, providerError(category), "error");
        track("lead_form_error", { page_type: document.body.dataset.pageType || "", interaction: category });
      })
      .finally(function () {
        window.clearTimeout(timer);
        state.busy = false;
        state.button.disabled = false;
        state.button.textContent = state.label;
        form.removeAttribute("aria-busy");
      });
  }

  function initForm(form) {
    var button = form.querySelector('button[type="submit"]');
    var state = { busy: false, button: button, label: button ? button.textContent : "Отправить" };
    if (!button) return;
    var opened = false;
    var viewed = false;
    function markOpen() {
      if (opened) return;
      opened = true;
      track("lead_form_open", { page_type: document.body.dataset.pageType || "" });
    }
    form.addEventListener("focusin", markOpen);
    form.addEventListener("input", function (event) { markOpen(); if (event.target.name) clearError(event.target); });
    form.addEventListener("change", function (event) { if (event.target.name) clearError(event.target); });
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      if (form.elements.botcheck && form.elements.botcheck.checked) return;
      submit(form, state);
    });
    if ("IntersectionObserver" in window) {
      var observer = new IntersectionObserver(function (entries) {
        if (viewed || !entries.some(function (entry) { return entry.isIntersecting; })) return;
        viewed = true;
        track("lead_form_view", { page_type: document.body.dataset.pageType || "" });
        observer.disconnect();
      }, { threshold: 0.2 });
      observer.observe(form);
    } else {
      track("lead_form_view", { page_type: document.body.dataset.pageType || "" });
    }
  }

  window.domianLeadForm = Object.freeze({ normalizePhone: normalizePhone });
  Array.prototype.forEach.call(document.querySelectorAll("form[data-lead-form]"), initForm);
}());
