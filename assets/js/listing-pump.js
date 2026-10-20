(function () {
  'use strict';
  var form = document.querySelector('[data-viewing-form]');
  if (form) {
    function refreshDays() {
      var parts = new Intl.DateTimeFormat('en', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
      var values = Object.fromEntries(parts.map(function (p) { return [p.type, p.value]; }));
      var today = new Date(Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)));
      var root = form.querySelector('[data-viewing-days]');
      var selected = form.elements.viewing_date.value;
      root.replaceChildren();
      for (var i = 0; i < 7; i++) {
        var date = new Date(today); date.setUTCDate(date.getUTCDate() + i);
        var iso = date.toISOString().slice(0, 10);
        var button = document.createElement('button'); button.type = 'button'; button.dataset.viewingDate = iso;
        var label = new Intl.DateTimeFormat('ru', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(date);
        button.textContent = (i === 0 ? 'Сегодня' : i === 1 ? 'Завтра' : new Intl.DateTimeFormat('ru', { weekday: 'short', timeZone: 'UTC' }).format(date)) + ' · ' + label;
        root.appendChild(button);
      }
      if (!Array.from(root.children).some(function (b) { return b.dataset.viewingDate === selected; })) selected = root.firstElementChild.dataset.viewingDate;
      form.elements.viewing_date.value = selected;
      Array.from(root.children).forEach(function (b) { b.setAttribute('aria-pressed', String(b.dataset.viewingDate === selected)); });
    }
    refreshDays();
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshDays(); });
    form.querySelector('[data-viewing-days]').addEventListener('click', function (event) {
      var button = event.target.closest('[data-viewing-date]'); if (!button) return;
      form.elements.viewing_date.value = button.dataset.viewingDate;
      form.querySelectorAll('[data-viewing-date]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === button)); });
    });
    document.querySelectorAll('[data-listing-question]').forEach(function (button) {
      button.addEventListener('click', function () {
        var context = button.closest('[data-object-context]').dataset.objectContext;
        var field = form.elements.message;
        var previous = field.dataset.quickText || context;
        var manual = field.value.replace(previous, '').trim();
        var next = context + ' ' + button.dataset.listingQuestion;
        field.value = next + (manual ? '\n' + manual : ''); field.dataset.quickText = next;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        form.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
        field.focus({ preventScroll: true });
      });
    });
  }
  document.querySelectorAll('[data-payment-calculator]').forEach(function (calculator) {
    function calculate() {
      var fields = calculator.elements;
      var result = calculator.querySelector('[data-payment-result]');
      var note = calculator.querySelector('[data-payment-note]');
      var valid = ['down', 'years', 'rate'].every(function (key) { return fields[key].value !== '' && fields[key].checkValidity(); });
      var loan = Number(fields.cost.value) - Number(fields.down.value);
      result.hidden = !valid || loan <= 0; result.textContent = '';
      note.hidden = !result.hidden;
      if (result.hidden) { note.textContent = 'Проверьте взнос, срок и ставку.'; return; }
      var months = Number(fields.years.value) * 12;
      var rate = Number(fields.rate.value) / 1200;
      var payment = rate === 0 ? loan / months : loan * rate / (-Math.expm1(-months * Math.log1p(rate)));
      result.textContent = Math.round(payment).toLocaleString('ru-RU') + ' ₽ / мес.';
    }
    calculator.addEventListener('submit', function (event) { event.preventDefault(); });
    calculator.addEventListener('input', calculate); calculate();
  });
  document.querySelectorAll('[data-copy-listing]').forEach(function (button) {
    button.addEventListener('click', async function () {
      var status = button.parentElement.querySelector('[data-copy-status]');
      try { await navigator.clipboard.writeText(button.dataset.copyListing); status.textContent = 'Ссылка скопирована'; }
      catch (_) { status.textContent = 'Ссылка для копирования: ' + button.dataset.copyListing; }
    });
  });
}());
