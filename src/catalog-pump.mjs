import { categoryForListing, isAvailableListing } from './listing-search.mjs';
import { districtInventory } from './district-map.mjs';

const text = item => [item.material, item.description, ...(item.features || [])].join(' ').toLocaleLowerCase('ru');
export const QUICK_FILTERS = [
  { key: 'budget', label: 'До 2,5 млн', test: item => Number.isFinite(item.price) && item.price <= 2500000 },
  { key: 'renovated', label: 'С ремонтом', test: item => /(?:современн\S*|хорош\S*|качественн\S*|дизайнерск\S*) ремонт|(?:^|\s)ремонт(?:[.,\s]|$)/u.test(text(item)) && !/без ремонта|под ремонт|требует ремонта/u.test(text(item)) },
  { key: 'gas', label: 'Своё газовое отопление', test: item => /индивидуальн\S* газов\S* отоплен|газов\S* отоплен|аогв/u.test(text(item)) },
  { key: 'brick', label: 'Кирпичный дом', test: item => /кирпич/u.test(text(item)) },
  { key: 'izhs', label: 'Участки ИЖС', test: item => categoryForListing(item) === 'lands' && /ижс/u.test(text(item)) },
  { key: 'center', label: 'Рядом с центром', test: item => /центре|центром|(?:район|р-н)\s+центр/iu.test(item.address || '') || (item.features || []).some(f => /^(?:центр$|центральн\S* локаци)/iu.test(f)) }
];
export const SCENARIOS = [
  { key: 'first', label: 'Первая квартира', test: item => categoryForListing(item) === 'apartments' && [0, 1].includes(item.rooms) },
  { key: 'ready', label: 'С ремонтом — заезжай и живи', test: item => ['apartments', 'houses'].includes(categoryForListing(item)) && QUICK_FILTERS.find(f => f.key === 'renovated').test(item) },
  { key: 'family', label: 'Для семьи', test: item => categoryForListing(item) === 'houses' || (categoryForListing(item) === 'apartments' && item.rooms >= 3) },
  { key: 'own-land', label: 'Земля под свой дом', test: item => categoryForListing(item) === 'lands' && QUICK_FILTERS.find(f => f.key === 'izhs').test(item) }
];
export const quickKeys = item => QUICK_FILTERS.filter(f => f.test(item)).map(f => f.key);
export const scenarioKeys = item => SCENARIOS.filter(f => f.test(item)).map(f => f.key);
export const districtFor = item => districtInventory([item]).find(d => d.count)?.key || '';
export function filterCatalog(listings, filters = {}) {
  return listings.filter(isAvailableListing).filter(item =>
    (!filters.quick || quickKeys(item).includes(filters.quick)) &&
    (!filters.scenario || scenarioKeys(item).includes(filters.scenario)) &&
    (!filters.district || districtFor(item) === filters.district) &&
    (!filters.type || filters.type === 'all' || categoryForListing(item) === filters.type) &&
    (filters.priceMax == null || (Number.isFinite(item.price) && item.price <= Number(filters.priceMax)))
  );
}
export const newestListings = (listings, limit = 6) => listings.filter(isAvailableListing).sort((a, b) => String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')) || a.id.localeCompare(b.id)).slice(0, limit);

// Keep the type in the spoken code: apartment 05 and house 05 must differ.
export function listingCode(item) {
  const match = item.id.match(/^shk-([ahl])(\d+)/u);
  return match ? `Ш-${{ a: 'К', h: 'Д', l: 'У' }[match[1]]}${match[2]}` : item.id === 'dom-chistovaya-kamenolomni' ? 'Ш-КМ01' : `Ш-${item.id}`;
}
export function unitPrice(item) {
  if (!Number.isFinite(item.price) || item.price <= 0) return null;
  const land = categoryForListing(item) === 'lands';
  const area = land ? item.landArea : item.area;
  if (!Number.isFinite(area) || area <= 0) return null;
  if (!land && !['apartments', 'houses'].includes(categoryForListing(item))) return null;
  return { value: Math.round(item.price / area), unit: land ? 'сотку' : 'м²' };
}
export function similarListings(listings, current, limit = 4) {
  const district = districtFor(current);
  const nearby = item => district && districtFor(item) === district;
  const distance = item => Math.abs(item.price - current.price);
  return listings.filter(isAvailableListing)
    .filter(item => item.id !== current.id && categoryForListing(item) === categoryForListing(current))
    .filter(item => nearby(item) || (Number.isFinite(item.price) && Number.isFinite(current.price) && distance(item) <= current.price * .3))
    .sort((a, b) => Number(nearby(b)) - Number(nearby(a)) || distance(a) - distance(b) || a.id.localeCompare(b.id))
    .slice(0, limit);
}
