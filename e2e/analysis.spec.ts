import { test, expect } from "@playwright/test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mixedReviews } from "../src/test/fixtures/reviews";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;

const envReady =
  !!SUPABASE_URL &&
  !!SERVICE_ROLE &&
  !!ANTHROPIC_KEY &&
  !SUPABASE_URL.includes("test.supabase.co");

function adminClient(): SupabaseClient {
  return createClient(SUPABASE_URL!, SERVICE_ROLE!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function createTestUser(admin: SupabaseClient) {
  const suffix = Date.now();
  const email = `test+analyze-${suffix}@reviewpulse.test`;
  const password = `TestPass!${suffix}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");
  return { userId: data.user.id, email, password };
}

async function seedProjectAndReviews(admin: SupabaseClient, userId: string) {
  const { data: project, error: projErr } = await admin
    .from("projects")
    .insert({
      user_id: userId,
      name: "Analyze E2E Project",
      industry: "SaaS",
      review_source: "Mixed",
    })
    .select("id")
    .single();
  if (projErr || !project) throw projErr ?? new Error("project insert failed");

  const rows = mixedReviews.slice(0, 8).map((r) => ({
    project_id: project.id,
    content: r.content,
    rating: r.rating,
    author: r.author,
    source: r.source,
    review_date: r.review_date,
  }));
  const { error: revErr } = await admin.from("reviews").insert(rows);
  if (revErr) throw revErr;

  return { projectId: project.id };
}

async function cleanupUser(admin: SupabaseClient, userId: string) {
  try {
    await admin.auth.admin.deleteUser(userId);
  } catch {
    // best-effort cleanup
  }
}

test.describe("POST /api/analyze", () => {
  test.skip(
    !envReady,
    "Skipped: requires NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY (not the placeholder) to run",
  );

  test("authenticated request with valid data returns 200 with a full analysis and persists it", async ({
    page,
    context,
  }) => {
    const admin = adminClient();
    const { userId, email, password } = await createTestUser(admin);
    const { projectId } = await seedProjectAndReviews(admin, userId);

    try {
      await page.goto("/login");
      await page.getByLabel(/email/i).fill(email);
      await page.getByLabel(/password/i).fill(password);
      await page
        .getByRole("button", { name: /sign in|log in/i })
        .click();
      await page.waitForURL(/\/(dashboard|onboarding)/, { timeout: 20_000 });

      const response = await context.request.post("/api/analyze", {
        data: { project_id: projectId },
        headers: { "content-type": "application/json" },
      });

      expect(response.status()).toBe(200);

      const body = (await response.json()) as {
        analysis_id: string;
        analysis: {
          summary: string;
          sentiment: {
            positive: number;
            neutral: number;
            negative: number;
            mixed: number;
          };
          overall_score: number;
          complaints: unknown[];
          praises: unknown[];
          feature_requests: unknown[];
          action_items: unknown[];
          rating_distribution: Record<string, number>;
        };
      };

      expect(typeof body.analysis_id).toBe("string");
      expect(typeof body.analysis.summary).toBe("string");
      expect(body.analysis.summary.length).toBeGreaterThan(0);

      const s = body.analysis.sentiment;
      expect(typeof s.positive).toBe("number");
      expect(typeof s.neutral).toBe("number");
      expect(typeof s.negative).toBe("number");
      expect(typeof s.mixed).toBe("number");
      expect(s.positive + s.neutral + s.negative + s.mixed).toBe(100);

      expect(body.analysis.overall_score).toBeGreaterThanOrEqual(0);
      expect(body.analysis.overall_score).toBeLessThanOrEqual(100);
      expect(Array.isArray(body.analysis.complaints)).toBe(true);
      expect(Array.isArray(body.analysis.praises)).toBe(true);
      expect(Array.isArray(body.analysis.feature_requests)).toBe(true);
      expect(Array.isArray(body.analysis.action_items)).toBe(true);
      expect(body.analysis.rating_distribution).toMatchObject({
        "1": expect.any(Number),
        "2": expect.any(Number),
        "3": expect.any(Number),
        "4": expect.any(Number),
        "5": expect.any(Number),
      });

      const { data: saved, error: readErr } = await admin
        .from("analyses")
        .select("id, project_id, summary, overall_score, review_count")
        .eq("id", body.analysis_id)
        .single();

      expect(readErr).toBeNull();
      expect(saved).toMatchObject({
        id: body.analysis_id,
        project_id: projectId,
      });
      expect(typeof saved?.summary).toBe("string");
      expect(saved?.review_count).toBe(8);
    } finally {
      await cleanupUser(admin, userId);
    }
  });
});
