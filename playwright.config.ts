import { defineConfig, devices } from "@playwright/test";

/**
 * E2E (Playwright). Uruchomienie:
 *   npx playwright install   # jednorazowo pobiera przeglądarki
 *   npm run test:e2e
 *
 * Wymaga działającej bazy (docker compose up -d postgres) + seeda.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
