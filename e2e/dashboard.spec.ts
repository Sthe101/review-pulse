import { test, expect, type Route } from "@playwright/test";

const SHELL_URL = "/test-shell";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function mockSignOut(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  await route.fulfill({
    status: 204,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: "",
  });
}

test.describe("dashboard shell", () => {
  test("authenticated user sees dashboard with sidebar", async ({ page }) => {
    await page.goto(SHELL_URL);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toBeVisible();
    await expect(sidebar.getByText("Dashboard")).toBeVisible();
    await expect(sidebar.getByText("Projects")).toBeVisible();
    await expect(sidebar.getByText("Settings")).toBeVisible();
    await expect(sidebar.getByText("Jane Doe")).toBeVisible();
    await expect(sidebar.getByText(/12\/50/)).toBeVisible();
  });

  test("sidebar nav items navigate correctly", async ({ page }) => {
    await page.goto(SHELL_URL);
    const sidebar = page.getByTestId("sidebar");

    // Projects is unauth-protected so middleware will redirect to /login?next=/projects.
    // We assert URL change rather than landing on the target — Playwright's
    // waitForURL matches regardless of HTTP status (Step 6 pattern).
    await Promise.all([
      page.waitForURL(
        /\/projects(?:$|\?|#)|[?&]next=%2Fprojects/,
        { timeout: 15_000, waitUntil: "commit" }
      ),
      sidebar.getByText("Projects").click(),
    ]);
    const url = new URL(page.url());
    const ok =
      url.pathname === "/projects" ||
      url.searchParams.get("next") === "/projects";
    expect(ok).toBe(true);
  });

  test("sidebar collapses and expands", async ({ page }) => {
    await page.goto(SHELL_URL);
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await expect(sidebar.getByText("Settings")).toBeVisible();

    await page.getByRole("button", { name: /collapse sidebar/i }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "true");
    await expect(sidebar.getByText("Settings")).toHaveCount(0);

    await page.getByRole("button", { name: /expand sidebar/i }).click();
    await expect(sidebar).toHaveAttribute("data-collapsed", "false");
    await expect(sidebar.getByText("Settings")).toBeVisible();
  });

  test("dark mode toggle works", async ({ page }) => {
    await page.goto(SHELL_URL);
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);

    await page.getByRole("button", { name: /switch to dark mode/i }).click();
    await expect(page.locator("html")).toHaveClass(/(^|\s)dark(\s|$)/);

    await page
      .getByRole("button", { name: /switch to light mode/i })
      .click();
    await expect(page.locator("html")).not.toHaveClass(/(^|\s)dark(\s|$)/);
  });

  test("sign out redirects to landing", async ({ page }) => {
    await page.route("**/auth/v1/logout**", mockSignOut);
    await page.goto(SHELL_URL);

    const sidebar = page.getByTestId("sidebar");
    await sidebar.getByText("Jane Doe").click();
    const dropdown = page.getByTestId("user-dropdown");
    await expect(dropdown).toBeVisible();

    await Promise.all([
      page.waitForURL(/^[^?#]*\/(?:$|\?|#)/, {
        timeout: 15_000,
        waitUntil: "commit",
      }),
      dropdown.getByText("Sign out").click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("mobile (375px): hamburger visible, sidebar hidden", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(SHELL_URL);

    await expect(page.getByRole("button", { name: /toggle navigation/i })).toBeVisible();
    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toHaveAttribute("data-mobile-open", "false");
    // CSS translates the sidebar off-screen at <=768px until .mobile-open is set.
    const transform = await sidebar.evaluate(
      (el) => getComputedStyle(el).transform
    );
    expect(transform).not.toBe("none");
  });

  test("mobile: hamburger click → sidebar slides in", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto(SHELL_URL);

    const sidebar = page.getByTestId("sidebar");
    await expect(sidebar).toHaveAttribute("data-mobile-open", "false");

    await page.getByRole("button", { name: /toggle navigation/i }).click();
    await expect(sidebar).toHaveAttribute("data-mobile-open", "true");
    await expect(sidebar).toHaveClass(/mobile-open/);

    // Slid into view: transform should be the identity matrix at width <=768px.
    const transform = await sidebar.evaluate(
      (el) => getComputedStyle(el).transform
    );
    expect(transform === "none" || transform.includes("matrix(1, 0, 0, 1, 0, 0)")).toBe(
      true
    );
  });
});
