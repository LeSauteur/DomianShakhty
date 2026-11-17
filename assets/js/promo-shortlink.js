(function () {
  'use strict';
  var link = document.querySelector('[data-promo-destination]');
  if (!link) return;
  var destination = new URL(link.href);
  var source = new URLSearchParams(location.search);
  ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (key) {
    if (source.has(key)) destination.searchParams.set(key, source.get(key).slice(0, 200));
  });
  location.replace(destination.href);
}());
