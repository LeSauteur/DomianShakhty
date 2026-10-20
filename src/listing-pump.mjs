import pending from './data/office-pending.json' with { type: 'json' };
import { listingCode, unitPrice, districtFor } from './catalog-pump.mjs';
const esc = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('"', '&quot;');
const money = value => `${Number(value).toLocaleString('ru-RU')} ₽`;
export const objectContext = item => `Объект ${listingCode(item)}, ${item.title}, ${money(item.price)}.`;

export function listingNumbers(item) {
  const unit = unitPrice(item);
  return `<p class="listing-code">Код ${listingCode(item)}</p>${unit ? `<p class="listing-unit-price" data-unit-price="${unit.value}">${money(unit.value)} за ${unit.unit}</p>` : ''}`;
}
export function listingQuestions(item, contacts = pending.messengers) {
  const questions = ['Когда можно посмотреть?', 'Торг уместен?', 'Подходит под ипотеку?'];
  return `<div class="listing-questions" aria-label="Быстрые вопросы" data-object-context="${esc(objectContext(item))}">${questions.map(question => {
    const text = objectContext(item) + ' ' + question;
    const messengerLinks = contacts.publish === true ? ['telegram', 'max'].filter(key => contacts[key]).map(key => {
      // Telegram supports profile links with a draft. MAX's text share opens
      // recipient selection; keep the office contact explicit alongside it.
      const url = new URL(contacts[key]);
      if (key === 'telegram') url.searchParams.set('text', text);
      return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer" data-office-messenger="${key}">Офис в ${key === 'max' ? 'MAX' : 'Telegram'}</a>${key === 'max' ? `<a href="https://max.ru/:share?text=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">Передать вопрос в MAX</a>` : ''}`;
    }).join('') : '';
    return `<div><button type="button" data-listing-question="${esc(question)}">${esc(question)}</button>${messengerLinks}</div>`;
  }).join('')}</div>`;
}
export function districtLink(ctx, item) {
  const key = districtFor(item);
  return key ? `<a class="text-link" href="${ctx.href(`index.html#district=${key}`)}">Посмотреть район на карте ↗</a>` : '';
}
export function listingCalculator(item) {
  return `<section class="section listing-calculator"><div class="container"><div class="section-heading"><div><p class="eyebrow">Ваши условия</p><h2>Калькулятор платежа</h2></div><p>Введите взнос, срок и ставку, чтобы рассчитать ежемесячный платёж.</p></div><form data-payment-calculator class="payment-calculator"><label>Стоимость, ₽<input name="cost" type="number" value="${item.price}" readonly></label><label>Первоначальный взнос, ₽<input name="down" type="number" min="0" max="${item.price - 1}" step="1" required inputmode="numeric" placeholder="Введите сумму"></label><label>Срок, лет<input name="years" type="number" min="1" max="50" step="1" required inputmode="numeric" placeholder="Введите срок"></label><label>Ставка, % годовых<input name="rate" type="number" min="0" max="100" step="0.01" required inputmode="decimal" placeholder="Введите ставку"></label><p data-payment-note role="status">Введите взнос, срок и ставку.</p><output data-payment-result hidden aria-live="polite"></output></form></div></section>`;
}
export function listingShare(ctx, item) {
  const url = ctx.absolute(`listings/${item.id}.html`);
  const text = `${objectContext(item)} ${url}`;
  return `<div class="listing-share" aria-label="Поделиться объектом"><strong>Поделиться</strong><a href="https://max.ru/:share?text=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">MAX</a><a href="https://t.me/share/url?url=${encodeURIComponent(url)}&amp;text=${encodeURIComponent(objectContext(item))}" target="_blank" rel="noopener noreferrer">Telegram</a><a href="https://wa.me/?text=${encodeURIComponent(text)}" target="_blank" rel="noopener noreferrer">WhatsApp</a><button type="button" data-copy-listing="${esc(url)}">Скопировать ссылку</button><span data-copy-status role="status"></span></div>`;
}
export function viewingForm(ctx, item) {
  const category = item.type === 'land' ? 'land' : item.type.startsWith('apartment') ? 'apartment' : 'house';
  return `<section class="lead-section" id="lead-form-section"><div class="container lead-layout"><div><p class="eyebrow">Код ${listingCode(item)}</p><h2>Записаться на просмотр</h2><p>Выберите удобный день и время. Позвоним, чтобы согласовать встречу.</p><div class="direct-contact"><a href="${ctx.site.phoneHref}">${esc(ctx.site.phone)}</a></div></div><form class="lead-form viewing-form" data-lead-form data-lead-compact data-viewing-form data-source-cta="listing_viewing" data-origin-page="listings/${esc(item.id)}.html" novalidate><div class="honeypot" aria-hidden="true"><label>Не заполняйте<input type="checkbox" name="botcheck" tabindex="-1" autocomplete="off"></label></div><input type="hidden" name="service" value="${esc(item.type)}"><input type="hidden" name="goal" value="buy"><input type="hidden" name="property_type" value="${category}"><fieldset class="viewing-days"><legend>День просмотра</legend><div data-viewing-days></div><input type="hidden" name="viewing_date"></fieldset><label>Удобное время<select name="viewing_time"><option>Как можно быстрее</option><option>Утро</option><option>День</option><option>Вечер</option></select></label><label>Телефон<input name="phone" type="tel" autocomplete="tel" inputmode="tel" required placeholder="+7 999 123-45-67"></label><label class="lead-form__message">Комментарий<textarea name="message" rows="4">${esc(objectContext(item))}</textarea></label><label class="consent"><input type="checkbox" name="privacy_consent" required><span>Согласен(на) на обработку данных по <a href="${ctx.href('privacy.html')}">политике</a>.</span></label><p class="form-status" data-form-status role="status" hidden></p><button class="button button--primary" type="submit">Записаться на просмотр</button></form></div></section>`;
}
