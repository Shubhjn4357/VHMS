import { describe, expect, it } from "vitest";

import { resolveSessionPermissions } from "@/lib/auth/session-access";

describe("resolveSessionPermissions", () => {
  it("falls back to bootstrap role permissions when the session lacks them", () => {
    const permissions = resolveSessionPermissions({
      email: "owner@hospital.test",
    }, {
      superAdminEmails: ["owner@hospital.test"],
      adminEmails: [],
    });

    expect(permissions).toContain("dashboard.view");
    expect(permissions).toContain("patients.view");
    expect(permissions).toContain("settings.manage");
  });

  it("prefers explicit session permissions when present", () => {
    const permissions = resolveSessionPermissions({
      email: "shubhamjain.com.in@gmail.com",
      permissions: ["dashboard.view", "patients.view"],
      role: "RECEPTION",
    });

    expect(permissions).toEqual(["dashboard.view", "patients.view"]);
  });

  it("uses the persisted app role when the session includes one", () => {
    const permissions = resolveSessionPermissions({
      email: "user@hospital.test",
      role: "ADMIN",
    });

    expect(permissions).toContain("dashboard.view");
    expect(permissions).toContain("billing.finalize");
  });
});
