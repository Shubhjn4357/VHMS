import { describe, expect, it } from "vitest";

import {
  hasExactSearchMatch,
  includesSearchQuery,
  normalizeSearchQuery,
} from "@/lib/search/service";

describe("search helpers", () => {
  it("normalizes search input for matching", () => {
    expect(normalizeSearchQuery("  VHMS-BIL-1001  ")).toBe("vhms-bil-1001");
  });

  it("matches partial queries across nullable values", () => {
    expect(
      includesSearchQuery(
        ["VHMS-20260310-1001", null, "Ritika Sharma"],
        "ritika",
      ),
    ).toBe(true);
    expect(
      includesSearchQuery(
        ["VHMS-20260310-1001", null, "Ritika Sharma"],
        "nasir",
      ),
    ).toBe(false);
  });

  it("detects exact matches after trimming and lowercasing", () => {
    expect(
      hasExactSearchMatch(
        [" VHMS-BIL-20260310-1001 ", "ritika@example.com"],
        "vhms-bil-20260310-1001",
      ),
    ).toBe(true);
    expect(
      hasExactSearchMatch(
        ["VHMS-BIL-20260310-1001", "ritika@example.com"],
        "vhms-bil",
      ),
    ).toBe(false);
  });
});
