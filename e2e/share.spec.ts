import { test, expect, type Browser } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mixedReviews } from "../src/test/fixtures/reviews";
import { sampleAnalysisResponse } from "../src/test/fixtures/analysis";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

const envReady =
  !!SUPABASE_URL &&
  !!SERVICE_ROLE &&
  !SUPABASE_URL.includes("test.supabase.co");

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createTestUser(admin: SupabaseClient) {
  const suffix = Date.now() + Math.floor(Math.random() * 1000);
  const email = `test+share-${suffix}@reviewpulse.test`;
  const password = `TestPass!${suffix}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { userId: data.user.id, email, password };
}

async function seedProjectAnalysis(admin: SupabaseClient, userId: string) {
  const { data: project, error: projErr } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      name: "Share E2E Project",
      industry: "E-commerce",
      review_source: "Mixed",
    })
    .select("id")
    .single();
  if (projErr || !project) throw projErr ?? new Error("project insert failed");

  const reviewRows = mixedReviews.slice(0, 6).map((r) => ({
    project_id: project.id,
    content: r.content,
    rating: r.rating,
    author: r.author,
    source: r.source,
    review_date: r.review_date,
    sentiment: "positive",
    sentiment_score: 0.8,
    themes: ["quality"],
  }));
  const { error: revErr } = await admin.from("reviews").insert(reviewRows);
  if (revErr) throw revErr;

  const a = sampleAnalysisResponse;
  const { data: analysis, error: anaErr } = await admin
    .from("analyses")
    .insert({
      project_id: project.id,
      review_count: reviewRows.length,
      summary: a.summary,
      sentiment_positive: a.sentiment.positive,
      sentiment_neutral: a.sentiment.neutral,
      sentiment_negative: a.sentiment.negative,
      sentiment_mixed: a.sentiment.mixed,
      overall_score: a.overall_score,
      complaints: a.complaints,
      praises: a.praises,
      feature_requests: a.feature_requests,
      action_items: a.action_items,
      rating_distribution: a.rating_distribution,
    })
    .select("id")
    .single();
  if (anaErr || !analysis) throw anaErr ?? new Error("analysis insert failed");

  return { projectId: project.id, analysisId: analysis.id };
}

async function cleanupUser(admin: SupabaseClient, userId: string) {
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // best-effort
  }
}

async function loginUI(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });
}

async function newIncognito(browser: Browser) {
  const ctx = await browser.newContext({ storageState: undefined });
  const page = await ctx.newPage();
  return { ctx, page };
}

test.describe("Public sharing", () => {
  test.skip(
    !envReady,
    "Skipped: requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (not the placeholder)",
  );

  test("click Share → URL copied → toast shown", async ({
    page,
    context,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAnalysis(admin, userId);

    try {
      // Clipboard read permission for assertion
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=analysis`);

      const shareBtn = page.getByTestId("share-button");
      await expect(shareBtn).toBeVisible({ timeout: 10_000 });
      await shareBtn.click();

      // Toast appears (sonner)
      await expect(
        page.getByText(/share link (copied|ready)/i),
      ).toBeVisible({ timeout: 8_000 });

      // The URL input now reflects the share URL
      const input = page.getByTestId("share-url-input");
      await expect(input).toBeVisible();
      const value = await input.inputValue();
      expect(value).toMatch(/\/report\/[0-9a-f]{16,64}$/);

      // Clipboard contains the same URL
      const copied = await page.evaluate(() => navigator.clipboard.readText());
      expect(copied).toBe(value);
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("open share URL in incognito → analysis visible", async ({
    page,
    browser,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAnalysis(admin, userId);

    try {
      // Owner creates the share via UI
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=analysis`);
      await page.getByTestId("share-button").click();
      await expect(page.getByTestId("share-url-input")).toBeVisible({
        timeout: 8_000,
      });
      const url = await page.getByTestId("share-url-input").inputValue();
      expect(url).toMatch(/\/report\/[0-9a-f]{16,64}$/);

      // Open in a fresh, unauthenticated browser context
      const { ctx, page: anon } = await newIncognito(browser);
      try {
        await anon.goto(url);
        await expect(anon.getByTestId("public-report")).toBeVisible({
          timeout: 10_000,
        });
        // The summary text from the seeded analysis should render
        await expect(anon.getByTestId("analysis-summary")).toContainText(
          sampleAnalysisResponse.summary.slice(0, 30),
        );
      } finally {
        await ctx.close();
      }
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("shared page has \"Powered by ReviewPulse\" footer", async ({
    page,
    browser,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAnalysis(admin, userId);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=analysis`);
      await page.getByTestId("share-button").click();
      await expect(page.getByTestId("share-url-input")).toBeVisible({
        timeout: 8_000,
      });
      const url = await page.getByTestId("share-url-input").inputValue();

      const { ctx, page: anon } = await newIncognito(browser);
      try {
        await anon.goto(url);
        const attribution = anon.getByTestId("public-report-attribution");
        await expect(attribution).toBeVisible({ timeout: 10_000 });
        await expect(attribution).toHaveText(/powered by reviewpulse/i);
      } finally {
        await ctx.close();
      }
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("footer CTA links to /signup", async ({ page, browser }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAnalysis(admin, userId);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=analysis`);
      await page.getByTestId("share-button").click();
      await expect(page.getByTestId("share-url-input")).toBeVisible({
        timeout: 8_000,
      });
      const url = await page.getByTestId("share-url-input").inputValue();

      const { ctx, page: anon } = await newIncognito(browser);
      try {
        await anon.goto(url);
        const cta = anon.getByTestId("public-report-cta-link");
        await expect(cta).toBeVisible({ timeout: 10_000 });
        const href = await cta.getAttribute("href");
        expect(href).toBe("/signup");

        await cta.click();
        await anon.waitForURL(/\/signup(?:\?|$)/, { timeout: 10_000 });
        expect(new URL(anon.url()).pathname).toBe("/signup");
      } finally {
        await ctx.close();
      }
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("disable share → URL returns 404", async ({
    page,
    context,
    browser,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAnalysis(admin, userId);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=analysis`);
      await page.getByTestId("share-button").click();
      await expect(page.getByTestId("share-url-input")).toBeVisible({
        timeout: 8_000,
      });
      const url = await page.getByTestId("share-url-input").inputValue();
      const tokenMatch = url.match(/\/report\/([0-9a-f]{16,64})$/);
      expect(tokenMatch).not.toBeNull();
      const token = tokenMatch?.[1] ?? "";

      // Confirm it's reachable first
      const { ctx: ctx1, page: anon1 } = await newIncognito(browser);
      try {
        const r1 = await anon1.goto(url);
        expect(r1?.status()).toBe(200);
      } finally {
        await ctx1.close();
      }

      // Disable via API (the page's logged-in session has the cookies)
      const del = await context.request.delete(`/api/share/${token}`);
      expect(del.status()).toBe(200);

      // Now the public URL should 404
      const { ctx: ctx2, page: anon2 } = await newIncognito(browser);
      try {
        const r2 = await anon2.goto(url);
        expect(r2?.status()).toBe(404);
      } finally {
        await ctx2.close();
      }
    } finally {
      await cleanupUser(admin, userId);
    }
  });
});
