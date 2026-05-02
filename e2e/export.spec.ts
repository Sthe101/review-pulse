import { test, expect } from "@playwright/test";
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
  const suffix = Date.now();
  const email = `test+export-${suffix}@reviewpulse.test`;
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
      name: "Export E2E Project",
      industry: "E-commerce",
      review_source: "Mixed",
    })
    .select("id")
    .single();
  if (projErr || !project) throw projErr ?? new Error("project insert failed");

  const reviewRows = mixedReviews.slice(0, 8).map((r) => ({
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
    // best-effort cleanup
  }
}

test.describe("CSV export", () => {
  test.skip(
    !envReady,
    "Skipped: requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (not the placeholder)",
  );

  test("click CSV export → file downloads", async ({ page }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAnalysis(admin, userId);

    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page
        .getByRole("button", { name: /sign in|log in/i })
        .click();
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });

      await page.goto(`/projects/${projectId}?tab=analysis`);
      await expect(
        page.getByTestId("export-csv-button"),
      ).toBeVisible({ timeout: 10_000 });

      const [download] = await Promise.all([
        page.waitForEvent("download", { timeout: 15_000 }),
        page.getByTestId("export-csv-button").click(),
      ]);

      expect(download.suggestedFilename()).toMatch(
        /^reviewpulse-export-e2e-project-\d{4}-\d{2}-\d{2}\.csv$/,
      );
    } finally {
      await cleanupUser(admin, userId);
    }
  });

  test("downloaded file opens in spreadsheet app (check content-type)", async ({
    page,
    context,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { analysisId } = await seedProjectAnalysis(admin, userId);

    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page
        .getByRole("button", { name: /sign in|log in/i })
        .click();
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });

      const res = await context.request.post(
        `/api/export/${analysisId}?format=csv`,
      );
      expect(res.status()).toBe(200);

      const contentType = res.headers()["content-type"] ?? "";
      expect(contentType).toMatch(/^text\/csv/i);
      expect(contentType).toMatch(/charset=utf-8/i);

      const dispo = res.headers()["content-disposition"] ?? "";
      expect(dispo).toMatch(/attachment/i);
      expect(dispo).toMatch(/\.csv"?$/);

      const body = await res.text();
      expect(body).toContain("ReviewPulse Analysis Report");
      expect(body).toContain("INDIVIDUAL REVIEWS");
    } finally {
      await cleanupUser(admin, userId);
    }
  });
});
