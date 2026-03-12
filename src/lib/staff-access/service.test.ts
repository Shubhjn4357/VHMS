import { STAFF_ACCESS_DEFAULTS } from "@/constants/staffAccessDefaults";
import { describe, expect, it } from "vitest";

import {
  normalizeStaffAccessEmail,
  parseStoredPermissions,
  resolveStaffAccessPermissionList,
} from "@/lib/staff-access/service";

describe("staff access helpers", () => {
  it("normalizes invite emails consistently", () => {
    expect(normalizeStaffAccessEmail("  Admin.Team@Hospital.COM ")).toBe(
      "admin.team@hospital.com",
    );
  });

  it("parses stored permissions and drops invalid entries", () => {
    expect(
      parseStoredPermissions(
        JSON.stringify([
          "dashboard.view",
          "dashboard.view",
          "patients.view",
          "invalid.permission",
        ]),
      ),
    ).toEqual(["dashboard.view", "patients.view"]);

    expect(parseStoredPermissions("not json")).toEqual([]);
  });

  it("falls back to role defaults when no explicit permissions are provided", () => {
    expect(resolveStaffAccessPermissionList("RECEPTION_STAFF")).toEqual(
      STAFF_ACCESS_DEFAULTS.RECEPTION_STAFF.defaultPermissions,
    );
  });

  it("filters custom permission lists to known permissions only", () => {
    expect(
      resolveStaffAccessPermissionList("ADMIN", [
        "dashboard.view",
        "billing.create",
        "dashboard.view",
        "not-real.permission" as never,
      ]),
    ).toEqual(["dashboard.view", "billing.create"]);
  });
});
