(function () {
  'use strict';
  var node = document.getElementById('promo-data');
  if (!node) return;
  var model = JSON.parse(node.textContent);
  var preview = document.querySelector('[data-promo-preview]');
  var status = document.querySelector('[data-promo-status]');
  var warning = document.querySelector('[data-promo-warning]');
  var selectedPhoto = 0, selectedFormat = 'story', x = 50, y = 50, revision = 0;
  var custom = {}, overlays = {};
  function href(value) { return model.base + '/' + value; }
  function track(name, extra) {
    if (window.domianTrack) window.domianTrack(name, Object.assign({ object_id: model.id, agent_id: model.agentId, office_id: model.officeId, placement: 'promo_page', event_type: name }, extra || {}));
  }
  function loadImage(src) {
    return new Promise(function (resolve, reject) { var image = new Image(); image.onload = function () { resolve(image); }; image.onerror = function () { reject(new Error('image')); }; image.src = src; });
  }
  function updateWarning() {
    var photo = model.photos[selectedPhoto], rect = model.formats[selectedFormat].photo;
    warning.hidden = !!photo && photo.width >= rect.width && photo.height >= rect.height;
    warning.textContent = photo ? 'Для этого формата фотографию приходится увеличивать. Резкость может быть ниже.' : 'У объекта пока нет фотографий. Изображение содержит только данные объявления.';
  }
  function showPreview() {
    updateWarning();
    preview.src = custom[selectedFormat] || href(model.assets[selectedFormat]);
    preview.width = model.formats[selectedFormat].width; preview.height = model.formats[selectedFormat].height;
    preview.alt = (selectedFormat === 'story' ? 'Рекламная история: ' : 'Рекламная публикация: ') + model.title;
  }
  function setBusy(busy) {
    document.querySelectorAll('[data-promo-download]').forEach(function (link) { link.setAttribute('aria-disabled', String(busy)); });
    preview.setAttribute('aria-busy', String(busy));
  }
  function updateDownloads() {
    document.querySelectorAll('[data-promo-download]').forEach(function (link) { var format = link.dataset.promoDownload; link.href = custom[format] || href(model.assets[format]); });
    showPreview();
  }
  async function render() {
    var current = ++revision;
    var photo = model.photos[selectedPhoto];
    if (!photo) return;
    var position = { x: x, y: y };
    updateWarning();
    if (selectedPhoto === 0 && x === 50 && y === 50) {
      Object.values(custom).forEach(URL.revokeObjectURL); custom = {}; setBusy(false); status.textContent = ''; updateDownloads(); return;
    }
    setBusy(true); status.textContent = 'Подготавливаем выбранную обложку…';
    var next = {};
    try {
      var image = await loadImage(href(photo.src));
      for (var format of ['story', 'post']) {
        if (!overlays[format]) overlays[format] = loadImage(href(model.assets[format + '-overlay']));
        var overlay = await overlays[format], dimensions = model.formats[format], rect = dimensions.photo;
        var canvas = document.createElement('canvas'); canvas.width = dimensions.width; canvas.height = dimensions.height;
        var context = canvas.getContext('2d');
        context.fillStyle = '#dce7e3'; context.fillRect(0, 0, canvas.width, canvas.height);
        var scale = Math.max(rect.width / image.naturalWidth, rect.height / image.naturalHeight);
        var sourceWidth = rect.width / scale, sourceHeight = rect.height / scale;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, (image.naturalWidth - sourceWidth) * position.x / 100, (image.naturalHeight - sourceHeight) * position.y / 100, sourceWidth, sourceHeight, rect.x, rect.y, rect.width, rect.height);
        context.drawImage(overlay, 0, 0);
        var blob = await new Promise(function (resolve) { canvas.toBlob(resolve, 'image/png'); });
        if (!blob) throw new Error('export');
        next[format] = URL.createObjectURL(blob);
      }
      if (current !== revision) { Object.values(next).forEach(URL.revokeObjectURL); return; }
      Object.values(custom).forEach(URL.revokeObjectURL); custom = next; updateDownloads();
      status.textContent = 'Обложка готова. Можно скачивать оба формата.';
    } catch (_error) {
      Object.values(next).forEach(URL.revokeObjectURL);
      if (current === revision) { status.textContent = 'Не удалось подготовить фото. Доступен исходный комплект объявления.'; Object.values(custom).forEach(URL.revokeObjectURL); custom = {}; updateDownloads(); }
    } finally { if (current === revision) setBusy(false); }
  }
  function queueRender() { render(); }
  document.addEventListener('click', async function (event) {
    var formatButton = event.target.closest('[data-promo-format]');
    if (formatButton) { selectedFormat = formatButton.dataset.promoFormat; document.querySelectorAll('[data-promo-format]').forEach(function (button) { button.setAttribute('aria-pressed', String(button === formatButton)); }); showPreview(); }
    var photoButton = event.target.closest('[data-promo-photo]');
    if (photoButton) { selectedPhoto = Number(photoButton.dataset.promoPhoto); document.querySelectorAll('[data-promo-photo]').forEach(function (button) { button.setAttribute('aria-pressed', String(button === photoButton)); }); queueRender(); }
    var download = event.target.closest('[data-promo-download]');
    if (download) { if (download.getAttribute('aria-disabled') === 'true') { event.preventDefault(); return; } track('promo_download', { format: download.dataset.promoDownload }); }
    if (event.target.closest('[data-promo-qr]')) track('promo_qr_download');
    var copy = event.target.closest('[data-promo-copy]');
    if (!copy) return;
    var value = copy.dataset.promoCopy === 'text' ? model.text : model.shareUrl;
    try {
      await navigator.clipboard.writeText(value);
      track(copy.dataset.promoCopy === 'text' ? 'promo_copy_text' : 'promo_copy_link');
      status.textContent = copy.dataset.promoCopy === 'text' ? 'Рекламный текст скопирован.' : 'Ссылка скопирована.';
    } catch (_error) {
      var textArea = document.getElementById('promo-text');
      if (copy.dataset.promoCopy === 'text') { textArea.focus(); textArea.select(); }
      status.textContent = 'Браузер не разрешил копирование. Выделите текст или ссылку и скопируйте вручную.';
    }
  });
  document.querySelectorAll('[data-promo-position]').forEach(function (input) { input.addEventListener('input', function () { if (input.dataset.promoPosition === 'x') x = Number(input.value); else y = Number(input.value); queueRender(); }); });
  var opened = false;
  function trackOpen() { if (!opened && !window.DOMIAN_ANALYTICS_DISABLED) { track('promo_open'); opened = true; } }
  window.addEventListener('domian:analytics-ready', trackOpen);
  trackOpen();
}());
