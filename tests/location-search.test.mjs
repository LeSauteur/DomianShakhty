import assert from "node:assert/strict";
import test from "node:test";
import {
  NEARBY_AUTO_THRESHOLD,
  categoryForListing,
  normalizeSearchFilters,
  searchLocationInventory
} from "../src/listing-search.mjs";

const location = (slug, neighbors = []) => ({ slug, neighbors });
const listing = (id, overrides = {}) => ({
  id,
  type: "house-new",
  location: "shakhty",
  price: 5_000_000,
  verified: true,
  status: "available",
  ...overrides
});

test("listing types map to explicit user categories", () => {
  assert.equal(categoryForListing(listing("new", { type: "house-new" })), "houses");
  assert.equal(categoryForListing(listing("flat", { type: "apartment-secondary" })), "apartments");
  assert.equal(categoryForListing(listing("garage", { type: "parking-space" })), "parking");
  assert.equal(categoryForListing(listing("unknown", { type: "project" })), "");
});

test("local result thresholds 0, 1, 5 and 6 control automatic nearby output", () => {
  for (const count of [0, 1, 5, 6]) {
    const items = Array.from({ length: count }, (_, index) => listing("local-" + index));
    items.push(listing("nearby", { location: "kamenolomni" }));
    const result = searchLocationInventory(items, location("shakhty", ["kamenolomni"]));
    assert.equal(result.local.length, count);
    assert.equal(result.showNearbyAutomatically, count < NEARBY_AUTO_THRESHOLD);
  }
});

test("unavailable, unverified, sold and demo inventory is excluded", () => {
  const items = [
    listing("ok"),
    listing("unverified", { verified: false }),
    listing("sold", { status: "sold" }),
    listing("archived", { status: "archived" }),
    listing("demo", { demo: true })
  ];
  assert.deepEqual(searchLocationInventory(items, location("shakhty")).local.map((item) => item.id), ["ok"]);
});

test("active price limits exclude unknown prices and invalid ranges are explicit", () => {
  const items = [listing("known"), listing("unknown", { price: null })];
  assert.deepEqual(searchLocationInventory(items, location("shakhty"), { priceMax: "6000000" }).local.map((item) => item.id), ["known"]);
  assert.equal(normalizeSearchFilters({ priceMin: "7 000 000", priceMax: "5 000 000" }).invalidRange, true);
  assert.equal(searchLocationInventory(items, location("shakhty"), { priceMin: 7_000_000, priceMax: 5_000_000 }).local.length, 0);
});

test("Ayuta is local to Shakhty, but Shakhty expands from Ayuta without duplicates", () => {
  const items = [
    listing("city", { location: "shakhty" }),
    listing("ayuta", { location: "ayutinskiy" }),
    listing("outside", { location: "kamenolomni" })
  ];
  const shakhty = searchLocationInventory(items, location("shakhty", ["kamenolomni"]));
  assert.deepEqual(shakhty.local.map((item) => item.id), ["city", "ayuta"]);
  assert.deepEqual(shakhty.nearby.map((item) => item.id), ["outside"]);
  const ayuta = searchLocationInventory(items, location("ayutinskiy", ["shakhty", "kamenolomni"]));
  assert.deepEqual(ayuta.local.map((item) => item.id), ["ayuta"]);
  assert.deepEqual(ayuta.nearby.map((item) => item.id), ["city", "outside"]);
  assert.equal(new Set([...ayuta.local, ...ayuta.nearby].map((item) => item.id)).size, 3);
});

test("type and price filters apply equally to local and nearby results", () => {
  const items = [
    listing("local-house"),
    listing("near-house", { location: "kamenolomni", price: 4_000_000 }),
    listing("near-flat", { location: "kamenolomni", type: "apartment-secondary", price: 4_000_000 })
  ];
  const result = searchLocationInventory(items, location("shakhty", ["kamenolomni"]), { type: "houses", priceMax: 4_500_000 });
  assert.deepEqual(result.local, []);
  assert.deepEqual(result.nearby.map((item) => item.id), ["near-house"]);
});

test("duplicate ids are removed within local, within nearby and across both scopes", () => {
  const localDuplicate = [listing("same"), listing("same")];
  assert.deepEqual(searchLocationInventory(localDuplicate, location("shakhty")).local.map((item) => item.id), ["same"]);

  const nearbyDuplicate = [
    listing("same", { location: "kamenolomni" }),
    listing("same", { location: "kamenolomni" })
  ];
  assert.deepEqual(searchLocationInventory(nearbyDuplicate, location("ayutinskiy", ["shakhty", "kamenolomni"])).nearby.map((item) => item.id), ["same"]);

  const crossScopeDuplicate = [
    listing("same", { location: "kamenolomni" }),
    listing("same", { location: "ayutinskiy" })
  ];
  const result = searchLocationInventory(crossScopeDuplicate, location("ayutinskiy", ["kamenolomni"]));
  assert.deepEqual(result.local.map((item) => item.id), ["same"]);
  assert.deepEqual(result.nearby, []);
});

test("nearby order follows neighbors and stays stable inside each territory", () => {
  const items = [
    listing("kamen-1", { location: "kamenolomni" }),
    listing("shakhty-1"),
    listing("kamen-2", { location: "kamenolomni" }),
    listing("shakhty-2")
  ];
  const result = searchLocationInventory(items, location("ayutinskiy", ["shakhty", "kamenolomni"]));
  assert.deepEqual(result.nearby.map((item) => item.id), ["shakhty-1", "shakhty-2", "kamen-1", "kamen-2"]);
});
