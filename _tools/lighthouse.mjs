import fs from "node:fs";
import process from "node:process";
import lighthouse from "lighthouse";
import { launch } from "chrome-launcher";

const url = process.env.LIGHTHOUSE_URL || "http://127.0.0.1:4173/DomianShakhty/";
const chrome = await launch({ chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"] });

try {
  const result = await lighthouse(url, {
    port: chrome.port,
    output: "json",
    logLevel: "error",
    onlyCategories: ["performance", "accessibility", "best-practices", "seo"]
  });
  const categories = Object.fromEntries(Object.entries(result.lhr.categories).map(([key, value]) => [key, Math.round(value.score * 100)]));
  const report = `# Lighthouse baseline\n\nURL: ${url}\n\n| Category | Score |\n| --- | ---: |\n${Object.entries(categories).map(([name, score]) => `| ${name} | ${score} |`).join("\n")}\n\n> SEO is measured on an intentional PRELAUNCH page with \`noindex,nofollow\`; this baseline must not be represented as a production indexability score.\n`;
  fs.writeFileSync("LIGHTHOUSE_BASELINE.md", report, "utf8");
  fs.mkdirSync("artifacts", { recursive: true });
  fs.writeFileSync("artifacts/lighthouse.json", result.report, "utf8");
  console.log(categories);
} finally {
  try {
    await chrome.kill();
  } catch (error) {
    if (error?.code !== "EPERM") throw error;
    console.warn("Chrome stopped; Windows deferred temporary-profile cleanup.");
  }
}

// chrome-launcher can leave an idle Windows handle after a successful report.
process.exit(0);
