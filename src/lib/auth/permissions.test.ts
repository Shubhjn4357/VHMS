import { describe, expect, it } from "vitest";

import {
  fallbackDisplayName,
  resolveBootstrapRole,
} from "@/lib/auth/permissions";

describe("auth access helpers", () => {
  it("matches bootstrap emails against the configured role buckets", () => {
    const access = {
      superAdminEmails: ["owner@hospital.test"],
      adminEmails: ["admin@hospital.test", "ops@hospital.test"],
    };

    expect(resolveBootstrapRole("owner@hospital.test", access)).toBe(
      "SUPER_ADMIN",
    );
    expect(resolveBootstrapRole("admin@hospital.test", access)).toBe("ADMIN");
    expect(resolveBootstrapRole("user@hospital.test", access)).toBeNull();
  });

  it("creates a readable fallback display name from the email local part", () => {
    expect(fallbackDisplayName("front_desk-lead@hospital.test")).toBe(
      "Front Desk Lead",
    );
  });
});
