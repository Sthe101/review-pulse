import { test, expect, type Route, type Page } from "@playwright/test";
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
  id: "u_onb_1",
  aud: "authenticated",
  role: "authenticated",
  email: "onb@example.com",
  email_confirmed_at: new Date().toISOString(),
  app_metadata: { provider: "email", providers: ["email"] },
  user_metadata: { full_name: "Onb Tester" },
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Flat User body (no access_token) signals GoTrueClient to treat it as "new user"
async function mockSignupSuccess(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      ...FAKE_USER,
      email_confirmed_at: null,
      identities: [
        {
          id: "i_onb_1",
          user_id: "u_onb_1",
          identity_data: { email: "onb@example.com", sub: "u_onb_1" },
          provider: "email",
          last_sign_in_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ],
    }),
  });
}

// GoTrueClient calls GET /auth/v1/user with the session's access_token; our
// mock returns the same user we seeded into the cookie.
async function mockGetUser(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers":
          "authorization, x-client-info, apikey, content-type",
      },
    });
    return;
  }
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    headers: { "Access-Control-Allow-Origin": "*" },
    body: JSON.stringify(FAKE_USER),
  });
}

// Seed an @supabase/ssr-formatted auth cookie on localhost so the browser
// client boots with a session. Format matches `createStorageFromOptions`:
// name `sb-<project-ref>-auth-token`, value `base64-<base64url(JSON)>`.
// Project ref is derived from `NEXT_PUBLIC_SUPABASE_URL` (fallback `test.supabase.co`
// → ref `test`).
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

// Capture PATCHes to profiles so we can assert the payload later.
type CapturedPatch = { payload: Record<string, unknown>; query: string };

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version",
};

function makeProfilesPatchHandler(captured: CapturedPatch[]) {
  return async (route: Route) => {
    const req = route.request();
    const method = req.method();
    if (method === "OPTIONS") {
      await route.fulfill({ status: 204, headers: CORS_HEADERS });
      return;
    }
    if (method === "PATCH") {
      const body = req.postDataJSON() as Record<string, unknown>;
      captured.push({ payload: body, query: req.url() });
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        headers: CORS_HEADERS,
        body: "[]",
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: CORS_HEADERS,
      body: "[]",
    });
  };
}

test.describe("onboarding page", () => {
  test("after signup → lands on /onboarding", async ({ page }) => {
    await page.route("**/auth/v1/signup**", mockSignupSuccess);

    await page.goto("/signup");
    await page.getByLabel(/full name/i).fill("Onb Tester");
    await page.getByLabel(/email/i).fill("onb@example.com");
    await page.getByLabel(/password/i).fill("Abcdefg1!");
    await page.getByRole("button", { name: /create account/i }).click();

    // Protected-route middleware without a real cookie bounces to
    // /login?next=%2Fonboarding, but the client router briefly lands on
    // /onboarding first — either is proof the signup handler fired the
    // right destination.
    await page.waitForURL(
      /\/onboarding(?:$|\?)|[?&]next=%2Fonboarding/,
      { timeout: 10_000 }
    );
    const url = new URL(page.url());
    const landed =
      url.pathname === "/onboarding" ||
      url.searchParams.get("next") === "/onboarding";
    expect(landed).toBe(true);
  });

  test("complete all 4 steps → redirected to /dashboard", async ({ page }) => {
    const captured: CapturedPatch[] = [];
    await page.route("**/auth/v1/user**", mockGetUser);
    await page.route("**/rest/v1/profiles**", makeProfilesPatchHandler(captured));
    await seedAuthSession(page);

    await page.goto("/onboarding");

    await page.getByText(/Business Owner/i).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByText(/E-commerce/i).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByRole("button", { name: /^Google$/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByText(/Find & Fix Complaints/i).click();
    await page.getByRole("button", { name: /get started/i }).click();

    await page.waitForURL(
      /\/dashboard(?:$|\?)|[?&]next=%2Fdashboard/,
      { timeout: 10_000 }
    );
    const url = new URL(page.url());
    const landed =
      url.pathname === "/dashboard" ||
      url.searchParams.get("next") === "/dashboard";
    expect(landed).toBe(true);
  });

  test("skip → redirected to /dashboard", async ({ page }) => {
    const captured: CapturedPatch[] = [];
    await page.route("**/auth/v1/user**", mockGetUser);
    await page.route("**/rest/v1/profiles**", makeProfilesPatchHandler(captured));
    await seedAuthSession(page);

    await page.goto("/onboarding");

    await page.getByRole("button", { name: /skip/i }).click();

    await page.waitForURL(
      /\/dashboard(?:$|\?)|[?&]next=%2Fdashboard/,
      { timeout: 10_000 }
    );
    const url = new URL(page.url());
    const landed =
      url.pathname === "/dashboard" ||
      url.searchParams.get("next") === "/dashboard";
    expect(landed).toBe(true);
  });

  test("answers saved in profiles.onboarding_data", async ({ page }) => {
    const captured: CapturedPatch[] = [];
    await page.route("**/auth/v1/user**", mockGetUser);
    await page.route("**/rest/v1/profiles**", makeProfilesPatchHandler(captured));
    await seedAuthSession(page);

    await page.goto("/onboarding");

    await page.getByText(/Business Owner/i).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByText(/E-commerce/i).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByRole("button", { name: /^Google$/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await page.getByText(/Track Sentiment/i).click();
    await page.getByRole("button", { name: /get started/i }).click();

    await page.waitForURL(/\/dashboard|next=%2Fdashboard/, { timeout: 10_000 });

    expect(captured.length).toBeGreaterThanOrEqual(1);
    const dataPatch = captured.find((c) => c.payload.onboarding_data);
    expect(dataPatch).toBeDefined();
    const data = dataPatch!.payload.onboarding_data as Record<string, unknown>;
    expect(data.role).toBe("owner");
    expect(data.industry).toBe("ecommerce");
    expect(data.sources).toEqual(["google"]);
    expect(data.goal).toBe("sentiment");
  });

  test("back navigation works through all steps", async ({ page }) => {
    await page.route("**/auth/v1/user**", mockGetUser);

    await page.goto("/onboarding");

    // Step 1 → 2: no Back yet
    await expect(page.getByRole("button", { name: /back/i })).toHaveCount(0);
    await page.getByText(/Business Owner/i).click();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 2: Back appears
    await expect(page.getByRole("button", { name: /back/i })).toBeVisible();
    await page.getByText(/E-commerce/i).click();
    await page.getByRole("button", { name: /continue/i }).click();

    // Step 3 → 4
    await page.getByRole("button", { name: /^Google$/i }).click();
    await page.getByRole("button", { name: /continue/i }).click();

    await expect(
      page.getByRole("button", { name: /get started/i })
    ).toBeVisible();

    // Back from step 4 → 3
    await page.getByRole("button", { name: /back/i }).click();
    await expect(
      page.getByRole("button", { name: /^Google$/i })
    ).toBeVisible();

    // Back → step 2
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/E-commerce/i).first()).toBeVisible();

    // Back → step 1 (Back should disappear)
    await page.getByRole("button", { name: /back/i }).click();
    await expect(page.getByText(/Business Owner/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /back/i })).toHaveCount(0);
  });
});
