import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createContext } from "../src/templates.mjs";
import { renderLegacyRedirect, validateLegacyRedirects } from "../src/legacy-redirects.mjs";

const json = file => JSON.parse(fs.readFileSync(file, "utf8"));
const site = json("site.config.json");
const { entries } = json("src/data/legacy-construction-urls.json");
const data = json("src/data/construction-projects.json");
const projects = [...data.items, ...data.builtExamples];
const canonicalFiles = ["construction.html", ...projects.map(project => `construction/projects/${project.slug}.html`)];
const ctx = createContext(site, {});

test("all 41 historical project URLs map directly to the same 26 current projects", () => {
  assert.equal(entries.length, 41);
  assert.equal(new Set(entries.map(entry => entry.projectId)).size, 26);
  const counts = Object.fromEntries(["domanstroy-", "eqvita-", "soyuz-", "partner-house-"].map(prefix => [prefix, entries.filter(entry => entry.from.split("/").pop().startsWith(prefix)).length]));
  assert.deepEqual(counts, { "domanstroy-": 7, "eqvita-": 4, "soyuz-": 15, "partner-house-": 15 });
  assert.equal(validateLegacyRedirects(entries, canonicalFiles, projects).size, 41);
  for (const entry of entries) {
    const target = projects.find(project => project.id === entry.projectId);
    assert.equal(entry.to, `construction/projects/${target.slug}.html`);
    assert.ok(entry.evidence.length > 0);
    for (const evidence of entry.evidence) {
      assert.match(evidence.commit, /^[a-f0-9]{40}$/u);
      for (const field of ["area", "floors", "bedrooms", "bathrooms"]) assert.equal(evidence[field], target[field], `${entry.from}: ${field}`);
      if (entry.method === "stable-id") assert.equal(evidence.oldId, target.id);
      else assert.equal(evidence.oldBuilderId, "soyuz");
    }
  }
});

test("the reported 85 m² URL resolves to the two-bathroom project, not the other 85 m² house", () => {
  const find = slug => entries.find(entry => entry.from === `construction/projects/${slug}.html`);
  assert.equal(find("domanstroy-ds-85-5").to, "construction/projects/dom-pod-klyuch-85m2-dva-sanuzla.html");
  assert.equal(find("domanstroy-ds-85").to, "construction/projects/dom-pod-klyuch-85m2-kuhnya-gostinaya.html");
  assert.equal(find("soyuz-85").to, "construction/projects/dom-pod-klyuch-85m2-tri-spalni.html");
});

test("clean build emits immediate HTML redirects without adding legacy URLs to sitemap or navigation", () => {
  const sitemap = fs.readFileSync("dist/sitemap.xml", "utf8");
  const catalog = fs.readFileSync("dist/construction.html", "utf8");
  assert.equal((sitemap.match(/<loc>/gu) || []).length, 189);
  for (const entry of entries) {
    const html = fs.readFileSync(`dist/${entry.from}`, "utf8");
    const target = ctx.absolute(entry.to);
    assert.ok(html.includes(`<meta http-equiv="refresh" content="0; url=${ctx.href(entry.to)}">`), entry.from);
    assert.ok(html.includes(`<link rel="canonical" href="${target}">`), entry.from);
    assert.ok(html.includes(`<a href="${ctx.href(entry.to)}">`), entry.from);
    assert.doesNotMatch(html, /noindex|<script\b/iu);
    assert.ok(fs.existsSync(`dist/${entry.to}`));
    assert.ok(!sitemap.includes(`<loc>${ctx.absolute(entry.from)}</loc>`));
    assert.ok(sitemap.includes(`<loc>${target}</loc>`));
    assert.ok(!catalog.includes(`href="/${entry.from}"`));
  }
});

test("redirect manifest rejects duplicate paths, overwritten pages, off-site targets and chains", () => {
  const valid = entries[0];
  const validate = values => validateLegacyRedirects(values, canonicalFiles, projects);
  assert.throws(() => validate([valid, valid]), /Duplicate legacy/u);
  assert.throws(() => validate([{ ...valid, from: valid.to }]), /replace a canonical/u);
  assert.throws(() => validate([{ ...valid, from: "../outside.html" }]), /Invalid legacy/u);
  assert.throws(() => validate([{ ...valid, to: "https://example.com/" }]), /Invalid redirect target/u);
  assert.throws(() => validate([{ ...valid, to: entries[1].from }]), /not a canonical generated page/u);
  assert.throws(() => validate([{ ...valid, projectId: "missing-project" }]), /project identity/u);
  assert.throws(() => validate([{ ...valid, to: "construction.html", projectId: null }]), /explicit reason/u);
  assert.equal(validate([{ ...valid, to: "construction.html", projectId: null, fallbackReason: "Historical identity could not be established" }]).size, 1);
});

test("redirect URLs respect the configured production base and do not depend on JavaScript", () => {
  const nested = createContext({ ...site, productionOrigin: "https://example.com/site" }, {});
  const html = renderLegacyRedirect(nested, entries[0]);
  assert.ok(html.includes(`0; url=/site/${entries[0].to}`));
  assert.ok(html.includes(`<link rel="canonical" href="https://example.com/site/${entries[0].to}">`));
  assert.doesNotMatch(html, /<script\b/iu);
});
