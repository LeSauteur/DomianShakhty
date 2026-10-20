import config from "./data/district-map.json" with { type: "json" };
import geo from "./data/district-map-geo.json" with { type: "json" };
import { isAvailableListing } from "./listing-search.mjs";

const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;");
const normalize = value => String(value || "").toLocaleLowerCase("ru").replaceAll("ё", "е");

export function districtInventory(listings, districts = config.districts) {
  const inventory = districts.map(district => ({ ...district, listingIds: [], count: 0 }));
  const seen = new Set();
  for (const listing of listings.filter(isAvailableListing)) {
    if (seen.has(listing.id)) throw new Error(`Карта районов: повтор объявления ${listing.id}`);
    seen.add(listing.id);
    const matches = inventory.filter(({ match }) =>
      ((!match.addressLocation || listing.location === match.addressLocation) && (match.address || []).some(value => normalize(listing.address).includes(normalize(value)))) ||
      (match.location || []).some(value => normalize(listing.location) === normalize(value)));
    if (matches.length > 1) throw new Error(`Карта районов: объект ${listing.id} попал в несколько районов: ${matches.map(d => d.name).join(", ")}`);
    if (matches.length) matches[0].listingIds.push(listing.id);
  }
  return inventory.map(d => ({ ...d, count: d.listingIds.length }));
}

export function mapPosition({ lon, lat }) {
  const { lon0, lat0, cosLat, k, viewBox: [x, y, width, height] } = config.projection;
  return `left:${(((lon - lon0) * cosLat * k - x) / width * 100).toFixed(2)}%;top:${(((lat0 - lat) * k - y) / height * 100).toFixed(2)}%`;
}

// Same two-pass Chaikin smoothing as the approved prototype, at build time.
function smooth(path, passes = 2) {
  return (path.match(/M[^M]*/gu) || []).map(part => {
    const nums = part.match(/-?\d+(?:\.\d+)?/gu).map(Number);
    let points = Array.from({ length: nums.length / 2 }, (_, i) => [nums[i * 2], nums[i * 2 + 1]]);
    const closed = part.trim().endsWith("Z");
    for (let pass = 0; pass < passes && points.length > 2; pass++) {
      const next = closed ? [] : [points[0]];
      for (let i = 0; i < points.length - (closed ? 0 : 1); i++) {
        const a = points[i], b = points[(i + 1) % points.length];
        next.push([.75 * a[0] + .25 * b[0], .75 * a[1] + .25 * b[1]], [.25 * a[0] + .75 * b[0], .25 * a[1] + .75 * b[1]]);
      }
      if (!closed) next.push(points.at(-1));
      points = next;
    }
    // Round only the serialized geometry, within 0.5 viewBox units. This is
    // under a CSS pixel at target widths and avoids ~7KB of decimal markup.
    return `M${points.map(p => p.map(n => n.toFixed(0)).join(" ")).join("L")}${closed ? "Z" : ""}`;
  }).join("");
}

function countLabel(n) {
  if (!n) return "Под запрос";
  const word = n % 10 === 1 && n % 100 !== 11 ? "объект" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "объекта" : "объектов";
  return `${n} ${word} в каталоге`;
}

export function renderDistrictMap(ctx) {
  const districts = districtInventory(ctx.listings);
  const initial = districts.find(d => d.key === "center");
  const data = Object.fromEntries(districts.map(d => [d.key, {
    name: d.name, count: d.count, countLabel: countLabel(d.count), kicker: d.kicker,
    text: d.count ? d.text : d.textEmpty, links: [...d.links, { label: "Все объекты в районе", href: `catalog.html?district=${d.key}` }].map(link => ({ ...link, href: ctx.href(link.href) })),
    cta: d.count ? "Подобрать в этом районе" : "Оставить запрос"
  }]));
  const current = data.center;
  const pins = districts.map(d => `<button type="button" class="district-map__pin district-map__pin--${esc(d.labelSide)}" style="${mapPosition(d)}" data-district="${esc(d.key)}" aria-pressed="${d.key === "center"}" aria-label="${esc(d.name)}, ${countLabel(d.count)}"><i aria-hidden="true"></i><span>${esc(d.name)}${d.count ? `<b>${d.count}</b>` : '<b class="district-map__on-request">Под запрос</b>'}</span></button>`).join("");
  const chips = districts.map(d => `<a class="district-map__chip" href="${esc(ctx.href(d.links[0].href))}" data-district="${esc(d.key)}">${esc(d.name)}</a>`).join("");
  return `<div class="district-map" data-district-map>
    <div class="district-map__head"><div><span>Карта районов</span><strong>Где искать ваш дом</strong></div><span class="district-map__hint">Нажмите на район</span></div>
    <div class="district-map__canvas" style="aspect-ratio:${config.projection.viewBox[2]}/${config.projection.viewBox[3]}">
      <svg class="district-map__geometry" viewBox="${config.projection.viewBox.join(" ")}" aria-hidden="true">
        <defs><filter id="district-soft" x="-10%" y="-10%" width="120%" height="120%"><feDropShadow dx="0" dy="6" stdDeviation="9" flood-color="var(--ink-deep)" flood-opacity=".08"/></filter><pattern id="district-dots" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="2" cy="2" r="1" fill="var(--stone)"/></pattern></defs>
        <rect x="-200" y="-200" width="1400" height="1200" fill="url(#district-dots)" opacity=".7"/>
        <path class="district-map__trunk" d="${smooth(geo.don, 1)}"/><path class="district-map__city" d="${smooth(geo.boundary)}"/>
        <path class="district-map__road" d="${smooth(geo.komsomola + geo.marx, 1)}"/>
        <path class="district-map__water" stroke-width="3.2" d="${smooth(geo.grush)}"/><path class="district-map__water" stroke-width="1.8" opacity=".85" d="${smooth(geo.atyuhta)}"/>
        <path class="district-map__lake" d="${smooth(geo.reservoir)}"/>
        <text class="district-map__water-label" x="545" y="590" transform="rotate(-62 545 590)">р. Грушевка</text>
        <text class="district-map__trunk-label" x="122" y="528" transform="rotate(-57 122 528)">М-4 «ДОН»</text>
        <g transform="translate(${geo.station.join(" ")})"><rect x="-4.5" y="-4.5" width="9" height="9" rx="2" fill="var(--surface)" stroke="var(--ink-soft)" stroke-width="1.4"/><text x="-8" y="4" text-anchor="end" class="district-map__faint">вокзал</text></g>
        ${config.contextLabels.map(l => `<text x="${l.x}" y="${l.y}" class="district-map__faint">${esc(l.name)}</text>`).join("")}
      </svg>
      ${config.edges.map(l => `<span class="district-map__edge district-map__edge--${esc(l.pos)}">${esc(l.text)}</span>`).join("")}
      <span class="district-map__compass" aria-label="Север">С</span>
      <div class="district-map__scale" style="width:${config.projection.scale2km / config.projection.viewBox[2] * 100}%">2 км<i></i></div>
      <a class="district-map__osm" href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">© участники OpenStreetMap</a>
      <div class="district-map__office" style="${mapPosition(config.office)}"><span><img src="${ctx.href("assets/brand/domian-d.svg")}" width="17" height="18" alt="Домиан"></span><strong>${esc(config.office.label)}</strong></div>
      ${pins}
    </div>
    <nav class="district-map__chips" aria-label="Районы на карте">${chips}</nav>
    <div class="district-map__detail" aria-live="polite" aria-atomic="true">
      <div><span class="district-map__kicker" data-district-kicker>${esc(current.kicker)}</span><h2><span data-district-name>${esc(initial.name)}</span><small data-district-count>${current.countLabel}</small></h2><p data-district-text>${esc(current.text)}</p></div>
      <div class="district-map__links"><div data-district-links>${current.links.map(l => `<a href="${esc(l.href)}">${esc(l.label)} →</a>`).join("")}</div><a class="district-map__cta" href="#request" data-district-cta data-source-cta="hero_district_map">${current.cta}</a></div>
    </div>
    <script type="application/json" data-district-data>${JSON.stringify(data).replaceAll("<", "\\u003c")}</script>
  </div>`;
}
