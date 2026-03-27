import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  workers: 2,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
  ],
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
      command:
        "node ./node_modules/next/dist/bin/next dev --hostname localhost --port 3000",
      url: baseURL,
      reuseExistingServer: true,
      env: {
        ...process.env,
        APP_NAME: process.env.APP_NAME ?? "Vahi Hospital OS",
        GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID ?? "test-google-client-id",
        GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET ??
          "test-google-client-secret",
        HOSPITAL_NAME: process.env.HOSPITAL_NAME ?? "Vahi Hospital",
        NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ??
          "test-only-secret-change-before-production",
        NEXTAUTH_URL: baseURL,
      },
      timeout: 120_000,
    },
});
