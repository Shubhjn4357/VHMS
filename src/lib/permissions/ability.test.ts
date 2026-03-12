import { describe, expect, it } from "vitest";

import {
  hasEveryPermission,
  hasPermission,
  hasSomePermission,
} from "@/lib/permissions/ability";

describe("permission helpers", () => {
  const permissions = [
    "dashboard.view",
    "patients.view",
    "billing.create",
  ] as const;

  it("detects a single permission correctly", () => {
    expect(hasPermission(permissions.slice(), "billing.create")).toBe(true);
    expect(hasPermission(permissions.slice(), "appointments.view")).toBe(false);
  });

  it("requires every permission when using all-of checks", () => {
    expect(
      hasEveryPermission(permissions.slice(), [
        "dashboard.view",
        "patients.view",
      ]),
    ).toBe(true);
    expect(
      hasEveryPermission(permissions.slice(), [
        "dashboard.view",
        "appointments.view",
      ]),
    ).toBe(false);
  });

  it("allows any matching permission when using some-of checks", () => {
    expect(
      hasSomePermission(permissions.slice(), [
        "appointments.view",
        "billing.create",
      ]),
    ).toBe(true);
    expect(
      hasSomePermission(permissions.slice(), [
        "appointments.view",
        "analytics.view",
      ]),
    ).toBe(false);
  });
});
