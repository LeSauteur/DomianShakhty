import { execFileSync } from "node:child_process";
import assert from "node:assert/strict";
import fs from "node:fs";

execFileSync(process.execPath, ["scripts/build.mjs"], {
  env: { ...process.env, DOMIAN_BROWSER_TEST_FIXTURE: "1" },
  stdio: "inherit"
});
const home = fs.readFileSync("dist/index.html", "utf8");
assert.match(home, /name="google-site-verification" content="test-google"/u);
assert.match(home, /name="yandex-verification" content="test-yandex"/u);
assert.equal(fs.readFileSync("dist/googlefixture.html", "utf8"), "google-site-verification: googlefixture.html");
assert.equal(fs.readFileSync("dist/yandexfixture.html", "utf8"), "test-yandex");
