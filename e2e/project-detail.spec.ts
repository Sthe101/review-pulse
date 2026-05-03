import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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
  const email = `test+pd-${suffix}@reviewpulse.test`;
  const password = `TestPass!${suffix}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { userId: data.user.id, email, password };
}

const SENTIMENTS = ["positive", "neutral", "negative", "mixed"] as const;

async function seedProjectWithMixedReviews(
  admin: SupabaseClient,
  userId: string,
  reviewCount = 8,
) {
  const { data: project, error: projErr } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      name: "Project Detail E2E",
      industry: "E-commerce",
      review_source: "Mixed",
    })
    .select("id")
    .single();
  if (projErr || !project) throw projErr ?? new Error("project insert failed");

  // Each row has a distinct sentiment marker phrase so search/filter
  // assertions can be deterministic.
  const reviewRows = Array.from({ length: reviewCount }, (_, i) => {
    const sentiment = SENTIMENTS[i % SENTIMENTS.length] as string;
    const marker =
      sentiment === "positive"
        ? "great experience overall"
        : sentiment === "negative"
          ? "had serious issues today"
          : sentiment === "neutral"
            ? "decent and acceptable result"
            : "mixed feelings about this";
    return {
      project_id: project.id,
      content: `${marker} (review ${i + 1})`,
      rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
      author: `Reviewer ${i + 1}`,
      source: "Google",
      sentiment,
      sentiment_score: 0.5,
      themes: ["quality"],
    };
  });
  const { error: revErr } = await admin.from("reviews").insert(reviewRows);
  if (revErr) throw revErr;

  return { projectId: project.id };
}

async function seedAnalyses(admin: SupabaseClient, projectId: string) {
  // Insert two distinct analyses so we can assert "click loads specific one".
  const a = sampleAnalysisResponse;
  const newer = await admin
    .from("analyses")
    .insert({
      project_id: projectId,
      review_count: 8,
      summary:
        "Newer analysis: customers are loving the recent UI overhaul.",
      sentiment_positive: 70,
      sentiment_neutral: 10,
      sentiment_negative: 15,
      sentiment_mixed: 5,
      overall_score: 82,
      complaints: a.complaints,
      praises: a.praises,
      feature_requests: a.feature_requests,
      action_items: a.action_items,
      rating_distribution: a.rating_distribution,
      created_at: new Date(Date.now() - 1_000).toISOString(),
    })
    .select("id, summary, created_at")
    .single();
  if (newer.error || !newer.data) throw newer.error ?? new Error("newer ana");

  const older = await admin
    .from("analyses")
    .insert({
      project_id: projectId,
      review_count: 5,
      summary:
        "Older analysis: pricing complaints dominate this earlier batch.",
      sentiment_positive: 30,
      sentiment_neutral: 20,
      sentiment_negative: 45,
      sentiment_mixed: 5,
      overall_score: 42,
      complaints: a.complaints,
      praises: a.praises,
      feature_requests: a.feature_requests,
      action_items: a.action_items,
      rating_distribution: a.rating_distribution,
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id, summary, created_at")
    .single();
  if (older.error || !older.data) throw older.error ?? new Error("older ana");

  return {
    newer: { id: newer.data.id, summary: newer.data.summary },
    older: { id: older.data.id, summary: older.data.summary },
  };
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

test.describe("Project detail tabs", () => {
  test.skip(
    !envReady,
    "Skipped: requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (not the placeholder)",
  );

  test("reviews tab shows all reviews with sentiment colors", async ({
    page,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectWithMixedReviews(admin, userId, 8);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=reviews`);

      await expect(page.getByTestId("reviews-tab")).toBeVisible({
        timeout: 10_000,
      });

      // 8 cards on a single page (under the 20/page cap).
      const items = page.locator('[data-testid^="review-item-"]');
      await expect(items).toHaveCount(8);

      // Every sentiment colour is represented.
      for (const s of SENTIMENTS) {
        await expect(
          items.filter({ has: page.locator(`[data-sentiment="${s}"]`) }),
        ).not.toHaveCount(0);
      }

      // Spot-check that the colored left-border style is actually applied.
      const first = items.first();
      const borderLeft = await first.evaluate(
        (el) => getComputedStyle(el as HTMLElement).borderLeftStyle,
      );
      expect(borderLeft).toBe("solid");
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("filter buttons toggle active state + filter list", async ({
    page,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectWithMixedReviews(admin, userId, 8);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=reviews`);
      await expect(page.getByTestId("reviews-tab")).toBeVisible({
        timeout: 10_000,
      });

      const allBtn = page.getByTestId("reviews-filter-all");
      const positiveBtn = page.getByTestId("reviews-filter-positive");

      // Default: All is pressed.
      await expect(allBtn).toHaveAttribute("aria-pressed", "true");
      await expect(positiveBtn).toHaveAttribute("aria-pressed", "false");

      await positiveBtn.click();
      await expect(positiveBtn).toHaveAttribute("aria-pressed", "true");
      await expect(allBtn).toHaveAttribute("aria-pressed", "false");

      const items = page.locator('[data-testid^="review-item-"]');
      // 8 reviews cycling through 4 sentiments → 2 are positive.
      await expect(items).toHaveCount(2);
      for (const card of await items.all()) {
        await expect(card).toHaveAttribute("data-sentiment", "positive");
      }
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("search input filters by text", async ({ page }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectWithMixedReviews(admin, userId, 8);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=reviews`);
      await expect(page.getByTestId("reviews-tab")).toBeVisible({
        timeout: 10_000,
      });

      await page.getByTestId("reviews-search").fill("had serious issues");

      const items = page.locator('[data-testid^="review-item-"]');
      // The "had serious issues today" marker is on negative reviews — 2 of 8.
      await expect(items).toHaveCount(2);
      for (const card of await items.all()) {
        await expect(card).toContainText("had serious issues");
      }

      // Clearing the search restores the full list.
      await page.getByTestId("reviews-search").fill("");
      await expect(items).toHaveCount(8);
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("history tab click → loads specific analysis", async ({ page }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectWithMixedReviews(admin, userId, 8);
    const { newer, older } = await seedAnalyses(admin, projectId);

    try {
      await loginUI(page, email, password);
      await page.goto(`/projects/${projectId}?tab=history`);

      await expect(page.getByTestId("history-tab")).toBeVisible({
        timeout: 10_000,
      });

      // Both items show. The newer one is rendered first (sort desc).
      const newerItem = page.getByTestId(`history-item-${newer.id}`);
      const olderItem = page.getByTestId(`history-item-${older.id}`);
      await expect(newerItem).toBeVisible();
      await expect(olderItem).toBeVisible();

      // Default selection is the latest analysis.
      await expect(newerItem).toHaveAttribute("data-active", "true");
      await expect(olderItem).toHaveAttribute("data-active", "false");

      await olderItem.click();
      // Switches to Analysis tab and shows the OLDER summary.
      await expect(page.getByTestId("analysis-tab")).toBeVisible({
        timeout: 10_000,
      });
      await expect(page.getByTestId("analysis-summary")).toContainText(
        older.summary!.slice(0, 30),
      );
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("tab switching works via URL params", async ({ page }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectWithMixedReviews(admin, userId, 8);
    await seedAnalyses(admin, projectId);

    try {
      await loginUI(page, email, password);

      // Each ?tab=… URL renders the right tab content.
      const cases: Array<[string, string]> = [
        ["reviews", "reviews-tab"],
        ["analysis", "analysis-tab"],
        ["history", "history-tab"],
        ["add-reviews", "add-reviews-tab"],
      ];

      for (const [tab, testid] of cases) {
        await page.goto(`/projects/${projectId}?tab=${tab}`);
        await expect(page.getByTestId(testid)).toBeVisible({
          timeout: 10_000,
        });
        await expect(page.getByTestId(`tab-${tab}`)).toHaveAttribute(
          "aria-selected",
          "true",
        );
      }

      // Clicking a tab updates the URL too (history.replaceState).
      await page.goto(`/projects/${projectId}`);
      await page.getByTestId("tab-history").click();
      await expect(page).toHaveURL(/[?&]tab=history(?:$|&)/);
    } finally {
      await cleanupUser(admin, userId);
    }
  });
});
