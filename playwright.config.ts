import { defineConfig, devices } from "@playwright/test";

// DATABASE_URL dsb. untuk global setup/teardown.
try {
  process.loadEnvFile(".env");
} catch {
  // .env opsional di CI (env diatur langsung)
}

const PORT = 3100;

/**
 * E2E alur utama. Butuh: PostgreSQL + migrasi + seed, build produksi (`npm run build`),
 * dan koneksi internet (Open-Meteo). Jalankan: npm run test:e2e
 */
export default defineConfig({
  testDir: "tests/e2e",
  // Satu server & satu database bersama; rate limit per IP → jalankan berurutan.
  workers: 1,
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  globalSetup: "./tests/e2e/global-setup.ts",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
    // Aplikasi menghormati prefers-reduced-motion (tanpa smooth scroll) → elemen stabil saat diklik.
    reducedMotion: "reduce",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: `npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
