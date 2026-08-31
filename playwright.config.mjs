import fs from "node:fs";
import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const config = JSON.parse(fs.readFileSync(new URL("./site.config.json", import.meta.url), "utf8"));
const basePath = config.mode === "prelaunch" ? (config.previewBasePath || "") : "";
const localUrl = `http://127.0.0.1:${port}${basePath}/`;

export default defineConfig({
  testDir: "./tests",
  testMatch: "**/*.spec.js",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: localUrl,
    colorScheme: "light",
    reducedMotion: "reduce",
    trace: "retain-on-failure"
  },
  webServer: {
    command: "node tests/static-server.mjs",
    url: localUrl,
    env: { ...process.env, PORT: String(port) },
    reuseExistingServer: !process.env.CI,
    timeout: 30_000
  }
});
