import { describe, expect, it } from "vitest";

import {
  clampRolloutPercentage,
  flagToEnvKey,
  parseEnvBoolean,
  parseTargetRoles,
  resolveFeatureFlagForSubject,
  resolveEnvOverride,
} from "@/lib/feature-flags/service";

describe("feature flag helpers", () => {
  it("maps camelCase flags to env keys", () => {
    expect(flagToEnvKey("offlineDrafts")).toBe("FEATURE_FLAG_OFFLINE_DRAFTS");
    expect(flagToEnvKey("dashboardCustomization")).toBe(
      "FEATURE_FLAG_DASHBOARD_CUSTOMIZATION",
    );
  });

  it("parses boolean-like env values", () => {
    expect(parseEnvBoolean("true")).toBe(true);
    expect(parseEnvBoolean(" YES ")).toBe(true);
    expect(parseEnvBoolean("off")).toBe(false);
    expect(parseEnvBoolean("0")).toBe(false);
    expect(parseEnvBoolean("maybe")).toBeNull();
    expect(parseEnvBoolean(undefined)).toBeNull();
  });

  it("resolves env overrides from a supplied environment object", () => {
    expect(
      resolveEnvOverride("offlineDrafts", {
        NODE_ENV: "test",
        FEATURE_FLAG_OFFLINE_DRAFTS: "on",
      }),
    ).toBe(true);
    expect(
      resolveEnvOverride("communications", {
        NODE_ENV: "test",
        FEATURE_FLAG_COMMUNICATIONS: "false",
      }),
    ).toBe(false);
    expect(resolveEnvOverride("blogCms", { NODE_ENV: "test" })).toBeNull();
  });

  it("parses target role arrays safely", () => {
    expect(parseTargetRoles("[\"ADMIN\",\"DOCTOR\"]")).toEqual([
      "ADMIN",
      "DOCTOR",
    ]);
    expect(parseTargetRoles("[\"ADMIN\",\"INVALID\"]")).toEqual(["ADMIN"]);
    expect(parseTargetRoles("not-json")).toEqual([]);
  });

  it("clamps rollout percentages to supported bounds", () => {
    expect(clampRolloutPercentage(25)).toBe(25);
    expect(clampRolloutPercentage(-10)).toBe(0);
    expect(clampRolloutPercentage(180)).toBe(100);
  });

  it("resolves role-targeted and gradual flags deterministically", () => {
    expect(
      resolveFeatureFlagForSubject({
        key: "communications",
        envEnabled: null,
        dbEnabled: true,
        rolloutPercentage: 100,
        targetRoles: ["ADMIN"],
      }, {
        role: "DOCTOR",
        stableId: "doctor@vahi.test",
      }),
    ).toBe(false);

    expect(
      resolveFeatureFlagForSubject({
        key: "communications",
        envEnabled: null,
        dbEnabled: true,
        rolloutPercentage: 100,
        targetRoles: ["ADMIN"],
      }, {
        role: "ADMIN",
        stableId: "admin@vahi.test",
      }),
    ).toBe(true);

    expect(
      resolveFeatureFlagForSubject({
        key: "blogCms",
        envEnabled: null,
        dbEnabled: true,
        rolloutPercentage: 0,
        targetRoles: [],
      }, {
        role: "ADMIN",
        stableId: "admin@vahi.test",
      }),
    ).toBe(false);
  });
});
