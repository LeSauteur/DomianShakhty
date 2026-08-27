import { defineConfig } from "@playwright/test";

const port = Number(process.env.PLAYWRIGHT_PORT || 4173);
const localUrl = `http://127.0.0.1:${port}/DomianShakhty/`;

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
