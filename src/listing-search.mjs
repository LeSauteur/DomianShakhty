export const NEARBY_AUTO_THRESHOLD = 6;

export const SEARCH_CATEGORIES = Object.freeze({
  all: "Все типы",
  apartments: "Квартиры",
  houses: "Дома",
  lands: "Участки",
  commercial: "Коммерция",
  parking: "Гаражи и парковка"
});

const TYPE_TO_CATEGORY = Object.freeze({
  apartment: "apartments",
  "apartment-secondary": "apartments",
  "apartment-newbuild": "apartments",
  "new-house": "houses",
  "house-new": "houses",
  "resale-house": "houses",
  "house-secondary": "houses",
  "house-builder": "houses",
  land: "lands",
  commercial: "commercial",
  garage: "parking",
  "parking-space": "parking"
});

export function categoryForListing(item) {
  return TYPE_TO_CATEGORY[item?.type] || "";
}

export function isAvailableListing(item) {
  return Boolean(
    item &&
    item.verified === true &&
    item.status === "available" &&
    item.demo !== true &&
    item.isDemo !== true
  );
}

export function localLocationSlugs(locationSlug) {
  return locationSlug === "shakhty" ? ["shakhty", "ayutinskiy"] : [locationSlug];
}

function parsePrice(value) {
  if (value == null || value === "") return null;
  const normalized = String(value).replace(/[^0-9]/gu, "");
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
}

export function normalizeSearchFilters(input = {}) {
  const type = Object.hasOwn(SEARCH_CATEGORIES, input.type) ? input.type : "all";
  const priceMin = parsePrice(input.priceMin);
  const priceMax = parsePrice(input.priceMax);
  return {
    type,
    priceMin,
    priceMax,
    invalidRange: priceMin != null && priceMax != null && priceMin > priceMax
  };
}

export function listingMatchesFilters(item, filters) {
  if (!isAvailableListing(item) || filters.invalidRange) return false;
  if (filters.type !== "all" && categoryForListing(item) !== filters.type) return false;
  const hasPriceLimit = filters.priceMin != null || filters.priceMax != null;
  if (hasPriceLimit && !Number.isFinite(item.price)) return false;
  if (filters.priceMin != null && item.price < filters.priceMin) return false;
  if (filters.priceMax != null && item.price > filters.priceMax) return false;
  return true;
}

export function searchLocationInventory(listings, location, input = {}) {
  const filters = normalizeSearchFilters(input);
  const localSlugs = new Set(localLocationSlugs(location.slug));
  const nearbyOrder = Array.isArray(location.neighbors) ? location.neighbors : [];
  const nearbyRank = new Map(nearbyOrder.map((slug, index) => [slug, index]));
  const seen = new Set();
  const available = (Array.isArray(listings) ? listings : []).filter(isAvailableListing);
  const local = available.filter((item) => {
    if (!localSlugs.has(item.location) || !listingMatchesFilters(item, filters) || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
  const nearby = available
    .filter((item) => nearbyRank.has(item.location) && !seen.has(item.id) && listingMatchesFilters(item, filters))
    .sort((left, right) => nearbyRank.get(left.location) - nearbyRank.get(right.location))
    .filter((item) => {
      if (seen.has(item.id)) return false;
      seen.add(item.id);
      return true;
    });
  return {
    filters,
    local,
    nearby,
    showNearbyAutomatically: local.length < NEARBY_AUTO_THRESHOLD && nearby.length > 0
  };
}
