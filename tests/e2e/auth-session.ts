import type { Page } from "@playwright/test";
import { encode } from "next-auth/jwt";

import { ROLE_PERMISSIONS } from "../../src/constants/permissions";
import type { AppRole } from "../../src/constants/roles";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const sessionCookieName = "authjs.session-token";
const sessionSecret = process.env.NEXTAUTH_SECRET ??
  "test-only-secret-change-before-production";

const ROLE_PROFILES: Record<
  AppRole,
  { email: string; id: string; name: string }
> = {
  SUPER_ADMIN: {
    email: "super_admin@vahi-hospital.test",
    id: "e2e-super-admin",
    name: "Super Admin Control",
  },
  ADMIN: {
    email: "admin@vahi-hospital.test",
    id: "usr_admin_seed",
    name: "Admin Control",
  },
  BILLING_STAFF: {
    email: "billing_staff@vahi-hospital.test",
    id: "usr_billing_seed",
    name: "Billing Desk",
  },
  RECEPTION_STAFF: {
    email: "reception_staff@vahi-hospital.test",
    id: "usr_reception_seed",
    name: "Reception Command",
  },
  DOCTOR: {
    email: "doctor@vahi-hospital.test",
    id: "e2e-doctor",
    name: "Doctor Review",
  },
  NURSE: {
    email: "nurse@vahi-hospital.test",
    id: "e2e-nurse",
    name: "Nurse Station",
  },
  OPERATOR: {
    email: "operator@vahi-hospital.test",
    id: "e2e-operator",
    name: "Operator Desk",
  },
  ACCOUNT_STAFF: {
    email: "account_staff@vahi-hospital.test",
    id: "e2e-account-staff",
    name: "Account Review",
  },
  AUDITOR: {
    email: "auditor@vahi-hospital.test",
    id: "usr_auditor_seed",
    name: "Audit Review",
  },
};

export async function authenticatePageAs(
  page: Page,
  role: AppRole,
) {
  const profile = ROLE_PROFILES[role];
  const token = await encode({
    secret: sessionSecret,
    salt: sessionCookieName,
    token: {
      sub: profile.id,
      email: profile.email,
      name: profile.name,
      role,
      permissions: ROLE_PERMISSIONS[role],
    },
  });

  await page.context().addCookies([
    {
      name: sessionCookieName,
      value: token,
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
      secure: false,
    },
  ]);
}
