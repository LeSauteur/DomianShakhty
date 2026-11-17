import { domainToUnicode } from 'node:url';
import { publicCopy } from './public-copy.mjs';
import { listingAgent, listingContact } from './listing-contact.mjs';

export const promoFormats = {
  story: { width: 1080, height: 1920, photo: { x: 56, y: 178, width: 968, height: 1030 } },
  post: { width: 1080, height: 1350, photo: { x: 56, y: 164, width: 968, height: 552 } }
};
export const promoPath = item => `promo/${item.id}.html`;
export function shortKey(item) {
  const match = item.id.match(/^shk-([ahcl])(\d+)(?:-|$)/u);
  return match ? `${match[1]}${match[2]}` : item.id === 'dom-chistovaya-kamenolomni' ? 'km01' : item.id;
}
const number = value => String(value).replace('.', ',');
export function promoModel(ctx, item) {
  const agent = listingAgent(ctx, item);
  const isLand = item.type === 'land';
  const type = isLand ? 'Земельный участок' : item.type.startsWith('apartment') ? 'Квартира' : item.type.includes('house') ? 'Дом' : item.type === 'commercial' ? 'Коммерческая недвижимость' : 'Недвижимость';
  const canonical = ctx.absolute(`listings/${item.id}.html`);
  const shortUrl = ctx.absolute(`s/${shortKey(item)}.html`);
  const tracked = new URL(shortUrl);
  const canonicalShare = new URL(canonical);
  const qrTarget = new URL(shortUrl); qrTarget.searchParams.set("utm_medium", "qr");
  const attribution = { utm_source: agent ? 'agent' : 'office', utm_medium: 'share', utm_campaign: 'listing_promo', utm_content: item.id };
  for (const [key, value] of Object.entries(attribution)) { tracked.searchParams.set(key, value); canonicalShare.searchParams.set(key, value); }
  const facts = [
    Number.isFinite(item.area) && item.area > 0 ? `${number(item.area)} м²` : '',
    Number.isInteger(item.rooms) ? item.rooms === 0 ? 'Студия' : `${item.rooms} комн.` : '',
    Number.isFinite(item.landArea) && item.landArea > 0 ? `${number(item.landArea)} сот.` : ''
  ].filter(Boolean);
  const features = (item.features || []).map(publicCopy).filter(value => value && value.length <= 92 && !/специалист по объекту|ориентир по платежу|ипотек|первоначальн|^\d.*(?:м²|сот\.|комнат)/iu.test(value)).slice(0, 3);
  const location = publicCopy(item.address || ctx.locations?.find(value => value.slug === item.location)?.name || '');
  const price = Number.isFinite(item.price) && item.price > 0 ? `${item.price.toLocaleString('ru-RU')} ₽` : 'Цена по запросу';
  const administrator = listingContact(ctx);
  const contact = { name: administrator.name, phone: administrator.phone, role: "administrator" };
  const photos = [...new Map([item.image, ...(item.gallery || [])].filter(image => image?.src).map(image => [image.src, { ...image }])).values()];
  const text = [publicCopy(item.title), '', ...facts, location, `Стоимость: ${price}`, '', ...features, '', 'Подробности и фотографии:', tracked.href, '', ...(agent ? [`Объект ведёт: ${agent.shortName || agent.name}`] : []), `Запись на просмотр: ${contact.name}`, `Телефон администратора: ${contact.phone}`].filter(value => value !== undefined).join('\n');
  return { id: item.id, ...(agent ? { agentId: agent.id, agentName: agent.shortName || agent.name } : {}), ...(item.officeId ? { officeId: item.officeId } : {}), title: publicCopy(item.title), type, location, price, facts, features, contact, photos, canonical, shortUrl, displayUrl: domainToUnicode(new URL(shortUrl).hostname) + new URL(shortUrl).pathname, shareUrl: tracked.href, qrTarget: qrTarget.href, canonicalShareUrl: canonicalShare.href, text, formats: promoFormats };
}

export function renderShortLink(ctx, item) {
  const destination = ctx.absolute(`listings/${item.id}.html`);
  const tracked = promoModel(ctx, item).canonicalShareUrl;
  return `<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="${destination}"><title>Открыть объявление | Домиан Шахты</title><noscript><meta http-equiv="refresh" content="0;url=${tracked.replaceAll('&', '&amp;')}"></noscript><script src="${ctx.href('assets/js/promo-shortlink.js')}" defer></script></head><body><main><h1>Объявление Домиан</h1><a data-promo-destination href="${tracked.replaceAll('&', '&amp;')}">Открыть объект</a></main></body></html>`;
}
