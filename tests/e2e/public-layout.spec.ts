import { expect, test, type Page } from "@playwright/test";

test.describe.configure({ mode: "serial", timeout: 180_000 });

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - window.innerWidth > 1;
  });

  expect(overflow).toBeFalsy();
}

async function expectNoEncodingArtifacts(page: Page) {
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/\u00C2\u00A9|\u00C2\u00B7|\u00E2\u20AC\u2122|\u00E2\u20AC|\u00E2\u201A\u00B9|\uFFFD/);
}

for (const [route, headingName] of [
  ["/", /The hospital no longer runs on disconnected admin screens\./],
  ["/about", /A hospital system designed around real operating pressure, not disconnected admin screens\./],
  ["/features", /All core hospital workflows run from one operational spine\./],
  ["/solutions", /Designed for hospitals that need speed at the desk and control in the back office\./],
  ["/contact", /Start a hospital deployment conversation with the right operational context\./],
] as const) {
  test(`public route ${route} renders without horizontal overflow`, async ({
    page,
  }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: headingName })).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoEncodingArtifacts(page);
  });
}

test("public blog index and article routes render without encoding artifacts", async ({
  page,
}) => {
  await page.goto("/blog", { waitUntil: "domcontentloaded" });
  await expect(
    page.getByRole("heading", {
      name: "Hospital workflow notes, launch updates, and deployment insights.",
    }),
  ).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await expectNoEncodingArtifacts(page);

  const firstArticle = page.getByRole("link", { name: "Read article" }).first();
  if (await firstArticle.count()) {
    const href = await firstArticle.getAttribute("href");
    if (href) {
      await page.goto(href, { waitUntil: "domcontentloaded" });
      await expect(page.getByRole("link", { name: "Back to blog" })).toBeVisible();
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await expectNoHorizontalOverflow(page);
      await expectNoEncodingArtifacts(page);
    }
  }
});

test.describe("mobile public shell", () => {
  test.use({
    viewport: { width: 390, height: 844 },
  });

  test("menu opens and anchor navigation works on the public home page", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    await expectNoHorizontalOverflow(page);
    await expectNoEncodingArtifacts(page);

    await page.getByRole("button", { name: "Options" }).click();
    await expect(page.getByRole("menu")).toBeVisible();
    await page.getByRole("menuitem", { name: "Workflow" }).click();

    await expect(page).toHaveURL(/#workflow$/);
    await expect(
      page.getByRole("heading", {
        name: "The product follows real hospital handoffs instead of isolated admin screens.",
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoEncodingArtifacts(page);
  });

  test("login and access-denied remain readable and actionable on mobile", async ({
    page,
  }) => {
    await page.goto("/login", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", {
        name: "Staff access starts before sign-in, not after.",
      }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoEncodingArtifacts(page);

    await page.goto(
      "/access-denied?reason=not_allowlisted&email=staff%40example.com",
      { waitUntil: "domcontentloaded" },
    );
    await expect(
      page.getByRole("heading", {
        name: "This Google account is not approved for dashboard access.",
      }),
    ).toBeVisible();
    await expect(page.getByText("Attempted account: staff@example.com")).toBeVisible();
    await expectNoHorizontalOverflow(page);
    await expectNoEncodingArtifacts(page);
  });
});
