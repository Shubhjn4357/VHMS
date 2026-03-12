import { describe, expect, it } from "vitest";

import { slugifyBlogTitle } from "@/lib/blog/slug";

describe("blog slug helper", () => {
  it("creates stable lowercase slugs from noisy titles", () => {
    expect(
      slugifyBlogTitle("  Designing a Queue Board for Real Reception Pressure! "),
    ).toBe("designing-a-queue-board-for-real-reception-pressure");
  });

  it("trims output to the configured maximum slug length", () => {
    const source = `Hospital ${"operations ".repeat(30)}`;

    expect(slugifyBlogTitle(source)).toHaveLength(160);
  });
});
