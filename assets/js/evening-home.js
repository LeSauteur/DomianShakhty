(function () {
  'use strict';
  var toggle = document.querySelector('[data-menu-toggle]');
  var menu = document.getElementById('mobile-nav');
  function closeMenu(restoreFocus) {
    if (!toggle || !menu) return;
    menu.hidden = true;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Открыть меню');
    if (restoreFocus) toggle.focus();
  }
  if (toggle && menu) {
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') !== 'true';
      menu.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
    });
    menu.addEventListener('click', function (event) { if (event.target.closest('a')) closeMenu(false); });
    document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !menu.hidden) closeMenu(true); });
    document.addEventListener('click', function (event) { if (!menu.hidden && !event.target.closest('[data-header]')) closeMenu(false); });
    window.matchMedia('(min-width: 701px)').addEventListener('change', function (event) { if (event.matches) closeMenu(false); });
  }

  var track = document.querySelector('[data-offers-track]');
  var prev = document.querySelector('[data-offers-prev]');
  var next = document.querySelector('[data-offers-next]');
  var count = document.querySelector('[data-offers-count]');
  var filters = Array.from(document.querySelectorAll('[data-offer-filter]'));
  if (track && prev && next) {
    var motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    function updateArrows() {
      prev.disabled = track.scrollLeft < 3;
      next.disabled = track.scrollLeft >= track.scrollWidth - track.clientWidth - 3;
    }
    function slide(direction) { track.scrollBy({ left: direction * (track.clientWidth + 22), behavior: motion.matches ? 'instant' : 'smooth' }); }
    prev.addEventListener('click', function () { slide(-1); });
    next.addEventListener('click', function () { slide(1); });
    track.addEventListener('scroll', updateArrows, { passive: true });
    window.addEventListener('resize', updateArrows);
    filters.forEach(function (button) {
      button.addEventListener('click', function () {
        var value = button.dataset.offerFilter;
        var total = 0;
        filters.forEach(function (item) { item.setAttribute('aria-pressed', String(item === button)); });
        track.querySelectorAll('[data-property-card]').forEach(function (card) {
          card.hidden = value !== 'all' && value !== card.dataset.type;
          if (!card.hidden) total++;
        });
        var word = total % 10 === 1 && total % 100 !== 11 ? 'предложение' : total % 10 >= 2 && total % 10 <= 4 && !(total % 100 >= 12 && total % 100 <= 14) ? 'предложения' : 'предложений';
        if (count) count.textContent = total + ' ' + word;
        track.scrollTo({ left: 0, behavior: 'instant' });
        updateArrows();
      });
    });
    updateArrows();
  }

  var search = document.querySelector('[data-evening-search]');
  if (search) search.addEventListener('submit', function (event) {
    event.preventDefault();
    if (!search.reportValidity()) return;
    var values = new FormData(search);
    var target = new URL(search.dataset.catalogUrl, window.location.origin);
    ['type', 'city', 'priceMax'].forEach(function (key) {
      var value = String(values.get(key) || '').trim();
      if (value) target.searchParams.set(key, value);
    });
    window.location.assign(target.href);
  });
}());
