import { test, expect, type Route } from "@playwright/test";

// Supabase `auth.resetPasswordForEmail` hits `POST /auth/v1/recover`.
// Success response is an empty object.
async function mockRecoverySuccess(route: Route) {
  await route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({}),
  });
}

test.describe("forgot-password page", () => {
  test("renders email form", async ({ page }) => {
    await page.goto("/forgot-password");

    await expect(
      page.getByRole("heading", { name: /reset your password/i })
    ).toBeVisible();
    await expect(page.getByLabel(/email/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /send reset link/i })
    ).toBeVisible();
  });

  test("successful submit shows success state", async ({ page }) => {
    await page.route("**/auth/v1/recover**", mockRecoverySuccess);

    await page.goto("/forgot-password");

    await page.getByLabel(/email/i).fill("jane@example.com");
    await page
      .getByRole("button", { name: /send reset link/i })
      .click();

    await expect(
      page.getByRole("heading", { name: /check your email/i })
    ).toBeVisible();

    // Form is gone — email input + submit button no longer present.
    await expect(page.getByLabel(/email/i)).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: /send reset link/i })
    ).toHaveCount(0);
  });

  test("'Back to login' on success state navigates to /login", async ({
    page,
  }) => {
    await page.route("**/auth/v1/recover**", mockRecoverySuccess);

    await page.goto("/forgot-password");

    await page.getByLabel(/email/i).fill("jane@example.com");
    await page
      .getByRole("button", { name: /send reset link/i })
      .click();

    await expect(
      page.getByRole("heading", { name: /check your email/i })
    ).toBeVisible();

    await page.getByRole("link", { name: /back to login/i }).click();

    await page.waitForURL("**/login");
    expect(new URL(page.url()).pathname).toBe("/login");
  });
});
