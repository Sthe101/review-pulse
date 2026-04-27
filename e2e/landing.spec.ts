import { test, expect } from "@playwright/test";

test.describe("Marketing landing page", () => {
  test("loads with all 9 sections visible", async ({ page }) => {
    await page.goto("/");

    // 1 Hero
    await expect(page.getByRole("heading", { level: 1, name: /unfair advantage/i })).toBeVisible();
    // 2 Social proof
    await expect(page.getByText(/works with: google/i)).toBeVisible();
    // 3 Problem
    await expect(page.getByRole("heading", { name: /goldmine/i })).toBeVisible();
    // 4 Steps
    await expect(page.getByRole("heading", { name: /three steps to clarity/i })).toBeVisible();
    // 5 Pricing
    await expect(page.getByRole("heading", { name: /simple, honest pricing/i })).toBeVisible();
    // 6 Testimonials
    await expect(page.getByRole("heading", { name: /loved by teams/i })).toBeVisible();
    // 7 FAQ
    await expect(page.getByRole("heading", { name: /frequently asked questions/i })).toBeVisible();
    // 8 CTA
    await expect(page.getByRole("heading", { name: /stop guessing\. start understanding/i })).toBeVisible();
    // 9 Footer
    await expect(page.getByText(/© 2026 reviewpulse/i)).toBeVisible();
  });

  test("'See How It Works' scrolls to the steps section", async ({ page }) => {
    await page.goto("/");
    const steps = page.getByRole("heading", { name: /three steps to clarity/i });

    // Before clicking, the steps heading should not yet be in viewport (page is long)
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.getByRole("link", { name: /see how it works/i }).click();
    await expect(page).toHaveURL(/#how-it-works$/);
    await expect(steps).toBeInViewport();
  });

  test("hero 'Analyze Reviews Free' CTA navigates to /signup", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /analyze reviews free/i }).first();
    await expect(cta).toHaveAttribute("href", "/signup");
    await Promise.all([
      page.waitForURL(/\/signup(?:$|\?|#)/, { timeout: 15000, waitUntil: "commit" }),
      cta.click(),
    ]);
  });

  test("FAQ item: click expands, click again collapses", async ({ page }) => {
    await page.goto("/");
    const firstQ = page.getByRole("button", { name: /what types of reviews can i analyze/i });

    await expect(firstQ).toHaveAttribute("aria-expanded", "false");
    await firstQ.click();
    await expect(firstQ).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByText(/any text-based customer reviews/i)).toBeVisible();

    await firstQ.click();
    await expect(firstQ).toHaveAttribute("aria-expanded", "false");
    await expect(page.getByText(/any text-based customer reviews/i)).toHaveCount(0);
  });

  test("pricing 'Start Free' navigates to /signup", async ({ page }) => {
    await page.goto("/");
    const cta = page.getByRole("link", { name: /^start free$/i }).first();
    await expect(cta).toHaveAttribute("href", "/signup");
    await cta.scrollIntoViewIfNeeded();
    await Promise.all([
      page.waitForURL(/\/signup(?:$|\?|#)/, { timeout: 15000, waitUntil: "commit" }),
      cta.click(),
    ]);
  });

  test("footer 'Privacy Policy' link points to /privacy", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("footer").getByRole("link", { name: /privacy policy/i });
    await expect(link).toHaveAttribute("href", "/privacy");
  });

  test("footer 'Terms of Service' link points to /terms", async ({ page }) => {
    await page.goto("/");
    const link = page.locator("footer").getByRole("link", { name: /terms of service/i });
    await expect(link).toHaveAttribute("href", "/terms");
  });

  test("page is server-rendered (key content + JSON-LD present in initial HTML)", async ({ page }) => {
    const response = await page.request.get("/");
    expect(response.status()).toBe(200);
    const html = await response.text();

    // Hero copy in raw HTML — proves SSR (not client-rendered)
    expect(html).toMatch(/Unfair Advantage/);
    // Section headings
    expect(html).toMatch(/Three Steps to Clarity/);
    expect(html).toMatch(/Frequently Asked Questions/);
    expect(html).toMatch(/Simple, Honest Pricing/);
    // FAQ answer in initial HTML (server-rendered, even though accordion is collapsed)
    // -- not asserted because the closed accordion intentionally doesn't render the answer body
    // JSON-LD schema present
    expect(html).toMatch(/application\/ld\+json/);
    expect(html).toMatch(/"@type":"SoftwareApplication"/);
    expect(html).toMatch(/"@type":"FAQPage"/);
  });

  test("mobile viewport (375px): no horizontal scroll, hero stacks", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 800 });
    await page.goto("/");

    // No horizontal overflow
    const dims = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(dims.scrollWidth).toBeLessThanOrEqual(dims.clientWidth + 1);

    // Hero h1 + mockup card both visible — at this width they stack (flex-wrap on .hero-wrap)
    const h1 = page.getByRole("heading", { level: 1, name: /unfair advantage/i });
    const mockup = page.locator(".hero-mockup");
    await expect(h1).toBeVisible();
    await expect(mockup).toBeVisible();

    const h1Box = await h1.boundingBox();
    const mockupBox = await mockup.boundingBox();
    expect(h1Box).not.toBeNull();
    expect(mockupBox).not.toBeNull();
    // Stacked: mockup top should be at or below h1 bottom (allowing small overlap from gap)
    expect(mockupBox!.y).toBeGreaterThan(h1Box!.y + h1Box!.height - 20);
  });
});
