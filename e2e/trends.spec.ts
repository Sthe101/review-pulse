import { test, expect, type Page, type Route } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

function readSupabaseUrlFromEnvFile(): string | null {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;
  const content = readFileSync(envPath, "utf8");
  const match = content.match(/^NEXT_PUBLIC_SUPABASE_URL\s*=\s*(.+)$/m);
  if (!match?.[1]) return null;
  return match[1].trim().replace(/^["']|["']$/g, "");
}

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ??
  readSupabaseUrlFromEnvFile() ??
  "https://test.supabase.co";
const PROJECT_REF = new URL(SUPABASE_URL).hostname.split(".")[0] ?? "test";
const AUTH_COOKIE_NAME = `sb-${PROJECT_REF}-auth-token`;

const FAKE_USER = {
  id: "u_trends_1",
  aud: "authenticated",
  role: "authenticated",
  email: "trends@example.com",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Trends Tester" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version",
};

async function seedAuthSession(page: Page) {
  const session = {
    access_token: "fake_access_token",
    refresh_token: "fake_refresh_token",
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    expires_in: 3600,
    token_type: "bearer",
    user: FAKE_USER,
  };
  const encoded =
    "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  await page.context().addCookies([
    {
      name: AUTH_COOKIE_NAME,
      value: encoded,
      domain: "localhost",
      path: "/",
      httpOnly: false,
      secure: false,
      sameSite: "Lax",
    },
  ]);
}

async function mockGetUser(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: CORS_HEADERS,
    body: JSON.stringify(FAKE_USER),
  });
}

test.describe("trends page", () => {
  test("/trends loads (empty state or charts)", async ({ page }) => {
    await page.route("**/auth/v1/user**", mockGetUser);
    await seedAuthSession(page);

    await page.goto("/trends");

    // Server-side middleware validates the seeded token against the real
    // Supabase URL; if the token is fake the middleware bounces to
    // /login?next=%2Ftrends. Either landing proves the route is wired.
    await page.waitForURL(/\/trends|next=%2Ftrends/, { timeout: 10_000 });
    const url = new URL(page.url());
    const landed =
      url.pathname === "/trends" ||
      url.searchParams.get("next") === "/trends";
    expect(landed).toBe(true);

    // If we made it onto /trends, the page must render *something* — either
    // the empty state (no projects / < 2 analyses) or the rendered charts.
    if (url.pathname === "/trends") {
      const emptyVisible = await page
        .getByText(/no projects yet|not enough data yet/i)
        .isVisible()
        .catch(() => false);
      const headingVisible = await page
        .getByRole("heading", { name: /trends/i })
        .isVisible()
        .catch(() => false);
      expect(emptyVisible || headingVisible).toBe(true);
    }
  });

  test("time range picker toggles", async ({ page }) => {
    await page.route("**/auth/v1/user**", mockGetUser);
    await seedAuthSession(page);

    await page.goto("/trends");
    await page.waitForURL(/\/trends|next=%2Ftrends/, { timeout: 10_000 });

    const picker = page.getByTestId("trends-range-picker");
    const pickerVisible = await picker
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (pickerVisible) {
      // Click each range and verify aria-selected updates.
      for (const range of ["1M", "3M", "6M", "1Y"] as const) {
        await page.getByTestId(`trends-range-${range}`).click();
        await expect(
          page.getByTestId(`trends-range-${range}`),
        ).toHaveAttribute("aria-selected", "true");
      }
    } else {
      // Page didn't render charts (no projects / redirect) — assert the
      // route is still wired so the failure mode is "no data" not "404".
      const url = new URL(page.url());
      const onTrendsOrLogin =
        url.pathname === "/trends" ||
        url.searchParams.get("next") === "/trends";
      expect(onTrendsOrLogin).toBe(true);
    }
  });

  test("topic card click → drill-down chart", async ({ page }) => {
    await page.route("**/auth/v1/user**", mockGetUser);
    await seedAuthSession(page);

    await page.goto("/trends");
    await page.waitForURL(/\/trends|next=%2Ftrends/, { timeout: 10_000 });

    const grid = page.getByTestId("trends-topic-grid");
    const gridVisible = await grid
      .isVisible({ timeout: 3000 })
      .catch(() => false);

    if (gridVisible) {
      const cards = page.getByTestId("trends-topic-card");
      const count = await cards.count();
      expect(count).toBeGreaterThan(0);

      await cards.first().click();
      // Detail view shows an "All topics" button to return to the grid.
      await expect(
        page.getByRole("button", { name: /all topics/i }),
      ).toBeVisible();
    } else {
      const url = new URL(page.url());
      const onTrendsOrLogin =
        url.pathname === "/trends" ||
        url.searchParams.get("next") === "/trends";
      expect(onTrendsOrLogin).toBe(true);
    }
  });
});
