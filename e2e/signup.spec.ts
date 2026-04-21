import { test, expect, type Route } from "@playwright/test";

// Intercept the Supabase signup endpoint and return a flat User payload.
// GoTrueClient treats a body without `access_token` as a User object, so we
// return one with a non-empty `identities` array to signal "new account".
async function mockSignupSuccess(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({
      id: "u_e2e_123",
      aud: "authenticated",
      role: "authenticated",
      email: "jane@example.com",
      email_confirmed_at: null,
      phone: "",
      confirmation_sent_at: new Date().toISOString(),
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
    }),
  });
}

test.describe("signup page", () => {
  test("renders form fields and submit button", async ({ page }) => {
    await page.goto("/signup");

    await expect(
      page.getByRole("heading", { name: /create your account/i })
    ).toBeVisible();
    await expect(page.getByLabel(/full name/i)).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /create account/i })
    ).toBeVisible();
  });

  test("valid submit redirects to /onboarding", async ({ page }) => {
    await page.route("**/auth/v1/signup**", mockSignupSuccess);

    await page.goto("/signup");

    await page.getByLabel(/full name/i).fill("Jane Doe");
    await page.getByLabel(/email/i).fill("jane@example.com");
    await page.getByLabel(/password/i).fill("Abcdefg1!");

    await page.getByRole("button", { name: /create account/i }).click();

    await page.waitForURL("**/onboarding", { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe("/onboarding");
  });

  test("logo link navigates to /", async ({ page }) => {
    await page.goto("/signup");

    await page.getByRole("link", { name: /reviewpulse home/i }).click();

    await page.waitForURL("**/");
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("'Log in' link navigates to /login", async ({ page }) => {
    await page.goto("/signup");

    await page.getByRole("link", { name: /^log in$/i }).click();

    await page.waitForURL("**/login");
    expect(new URL(page.url()).pathname).toBe("/login");
  });

  test("empty submit shows validation errors", async ({ page }) => {
    await page.goto("/signup");

    await page.getByRole("button", { name: /create account/i }).click();

    await expect(page.getByText(/name is required/i)).toBeVisible();
    await expect(page.getByText(/valid email/i)).toBeVisible();
    await expect(page.getByText(/at least 8 characters/i)).toBeVisible();
  });
});
