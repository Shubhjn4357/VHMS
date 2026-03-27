import { expect, test, type Page } from "@playwright/test";

import { authenticatePageAs } from "./auth-session";

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function expectDashboardRoute(
  page: Page,
  route: string,
  headingName: string | RegExp,
) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(new RegExp(`${route.replaceAll("/", "\\/")}$`));
  const heading = typeof headingName === "string"
    ? page.getByRole("heading", { level: 1, name: headingName, exact: true })
    : page.getByRole("heading", { level: 1, name: headingName });
  await expect(heading).toBeVisible();
}

async function expectAccessDenied(page: Page, route: string) {
  await page.goto(route, { waitUntil: "domcontentloaded" });
  await page.waitForURL(/\/access-denied(?:\?|$)/, { timeout: 30_000 });
  await expect(page.getByRole("heading", {
    name: "This Google account is not approved for dashboard access.",
  })).toBeVisible();
}

test("admin can open access-control routes and see admin-only navigation", async ({
  page,
}) => {
  await authenticatePageAs(page, "ADMIN");

  await expectDashboardRoute(
    page,
    "/dashboard/staff-access",
    "Staff access",
  );
  await expect(page.getByRole("link", { name: /Settings/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /Staff Access/i })).toBeVisible();

  await expectDashboardRoute(
    page,
    "/dashboard/settings",
    "Settings",
  );
});

test("reception staff can run appointment workflows but cannot open reports", async ({
  page,
}) => {
  await authenticatePageAs(page, "RECEPTION_STAFF");

  await expectDashboardRoute(
    page,
    "/dashboard/appointments",
    "Appointments",
  );
  await expect(
    page.getByText(/Run scheduling, queue movement, patient check-in/i),
  ).toBeVisible();

  await expectAccessDenied(page, "/dashboard/reports");
});

test("billing staff can open billing but are blocked from staff access", async ({
  page,
}) => {
  await authenticatePageAs(page, "BILLING_STAFF");

  await expectDashboardRoute(
    page,
    "/dashboard/billing",
    "Billing",
  );
  await expect(
    page.getByText(/Manage charge configuration, invoice drafting/i),
  ).toBeVisible();

  await expectAccessDenied(page, "/dashboard/staff-access");
});

test("auditor can review reports and audit logs but cannot open appointments", async ({
  page,
}) => {
  await authenticatePageAs(page, "AUDITOR");

  await expectDashboardRoute(
    page,
    "/dashboard/reports",
    "Reports",
  );
  await expect(
    page.getByText(/Export operational reporting across billing, occupancy/i),
  ).toBeVisible();

  await expectDashboardRoute(
    page,
    "/dashboard/audit-logs",
    "Audit logs",
  );

  await expectAccessDenied(page, "/dashboard/appointments");
});
