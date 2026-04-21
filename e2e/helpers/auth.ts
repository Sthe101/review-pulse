import type { Page } from "@playwright/test";

export async function loginAsTestUser(
  page: Page,
  email: string,
  password: string
) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 15_000 });
}

export async function signupTestUser(page: Page) {
  const suffix = Date.now();
  const email = `test+${suffix}@reviewpulse.test`;
  const password = `TestPass!${suffix}`;

  await page.goto("/signup");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign up|create account/i }).click();
  await page.waitForURL(/\/dashboard|\/onboarding/, { timeout: 15_000 });

  return { email, password };
}
