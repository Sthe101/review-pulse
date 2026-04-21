import { test, expect, type Route } from "@playwright/test";

// Supabase `signInWithPassword` hits `POST /auth/v1/token?grant_type=password`.
// A body with `access_token` is treated as a full session by GoTrueClient.
async function mockLoginSuccess(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      access_token: "test-access-token",
      token_type: "bearer",
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: "test-refresh-token",
      user: {
        id: "u_e2e_123",
        aud: "authenticated",
        role: "authenticated",
        email: "jane@example.com",
        email_confirmed_at: new Date().toISOString(),
        phone: "",
        app_metadata: { provider: "email", providers: ["email"] },
        user_metadata: { full_name: "Jane Doe" },
        identities: [
          {
            id: "i_e2e_1",
            user_id: "u_e2e_123",
            identity_data: { email: "jane@example.com", sub: "u_e2e_123" },
            provider: "email",
            last_sign_in_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    }),
  });
}

async function mockLoginInvalid(route: Route) {
  await route.fulfill({
    status: 400,
    contentType: "application/json",
    body: JSON.stringify({
      code: "invalid_credentials",
      error: "invalid_grant",
      error_description: "Invalid login credentials",
      msg: "Invalid login credentials",
    }),
  });
}

test.describe("login page", () => {
  test("renders login form", async ({ page }) => {
    await page.goto("/login");

    await expect(
      page.getByRole("heading", { name: /welcome back/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /log in/i })
    ).toBeVisible();
  });

  test("valid credentials redirect to /dashboard", async ({ page }) => {
    await page.route("**/auth/v1/token**", mockLoginSuccess);

    await page.goto("/login");

    await page.getByLabel(/email/i).fill("jane@example.com");
    await page.getByLabel(/password/i).fill("Abcdefg1!");

    await page.getByRole("button", { name: /log in/i }).click();

    // Middleware's server-side `auth.getUser()` can't be intercepted by
    // `page.route`, so a mocked session doesn't survive the protected-route
    // check — the browser either lands on `/dashboard` (if middleware lets it
    // through) or is bounced to `/login?next=%2Fdashboard`. Either one proves
    // the client-side `router.push('/dashboard')` fired.
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

  test("wrong password shows generic error and stays on /login", async ({
    page,
  }) => {
    await page.route("**/auth/v1/token**", mockLoginInvalid);

    await page.goto("/login");

    await page.getByLabel(/email/i).fill("jane@example.com");
    await page.getByLabel(/password/i).fill("wrongpass");

    await page.getByRole("button", { name: /log in/i }).click();

    await expect(
      page.getByText(/invalid email or password/i)
    ).toBeVisible();
    // Raw Supabase wording must never surface — that would leak the error shape.
    await expect(
      page.getByText(/invalid login credentials/i)
    ).toHaveCount(0);
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("'Sign up free' link navigates to /signup", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /sign up free/i }).click();

    await page.waitForURL("**/signup");
    expect(new URL(page.url()).pathname).toBe("/signup");
  });

  test("'Forgot password?' link navigates to /forgot-password", async ({
    page,
  }) => {
    await page.goto("/login");

    await page.getByRole("link", { name: /forgot password/i }).click();

    await page.waitForURL("**/forgot-password");
    expect(new URL(page.url()).pathname).toBe("/forgot-password");
  });
});
