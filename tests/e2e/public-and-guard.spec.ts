import { expect, test } from "@playwright/test";

test.describe.configure({ timeout: 60_000 });

test("offline fallback page is publicly reachable", async ({ page }) => {
  await page.goto("/offline", { waitUntil: "domcontentloaded" });

  await expect(
    page.getByRole("heading", {
      name:
        "Connection lost. Local drafts and queued actions stay on this device.",
    }),
  ).toBeVisible();
});

test("dashboard redirects unauthenticated users to login", async ({ page }) => {
  await page.goto("/dashboard", { waitUntil: "domcontentloaded" });

  await page.waitForURL(/\/login\?callbackUrl=%2Fdashboard$/, {
    timeout: 30_000,
  });
  await expect(page).toHaveURL(/\/login\?callbackUrl=%2Fdashboard$/);
});
