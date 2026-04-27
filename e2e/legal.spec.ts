import { test, expect } from "@playwright/test";

test.describe("Privacy policy page", () => {
  test("/privacy loads with 'Privacy Policy' heading", async ({ page }) => {
    const response = await page.goto("/privacy");
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /^privacy policy$/i })).toBeVisible();
  });

  test("all 7 sections visible", async ({ page }) => {
    await page.goto("/privacy");

    const headings: RegExp[] = [
      /1\. Information We Collect/i,
      /2\. How We Use Your Data/i,
      /3\. Storage & Security/i,
      /4\. Third Parties/i,
      /5\. Data Deletion & Export/i,
      /6\. Cookies & Tracking/i,
      /7\. Contact/i,
    ];

    for (const re of headings) {
      await expect(page.getByRole("heading", { level: 2, name: re })).toBeVisible();
    }
  });

  test("'← Back to Home' link navigates to /", async ({ page }) => {
    await page.goto("/privacy");
    const back = page.getByRole("link", { name: /back to home/i });
    await expect(back).toHaveAttribute("href", "/");
    await Promise.all([
      page.waitForURL(/\/$/, { timeout: 15000, waitUntil: "commit" }),
      back.click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/");
  });

  test("logo link navigates to /", async ({ page }) => {
    await page.goto("/privacy");
    const logo = page.locator("nav").getByRole("link").first();
    await expect(logo).toHaveAttribute("href", "/");
    await Promise.all([
      page.waitForURL(/\/$/, { timeout: 15000, waitUntil: "commit" }),
      logo.click(),
    ]);
    expect(new URL(page.url()).pathname).toBe("/");
  });
});
