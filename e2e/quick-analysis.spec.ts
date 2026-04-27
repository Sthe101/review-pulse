import { test, expect, type Route } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";

const FIXTURE_URL = "/test-paste";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, prefer, x-supabase-api-version, accept-profile, content-profile",
};

function readSupabaseUrlFromEnvFile(): string {
  const envPath = path.join(process.cwd(), ".env.local");
  try {
    const c = fs.readFileSync(envPath, "utf8");
    const m = c.match(
      /^\s*NEXT_PUBLIC_SUPABASE_URL\s*=\s*"?([^"\n\r]+?)"?\s*$/m,
    );
    if (m && m[1]) return m[1].trim();
  } catch {
    // .env.local missing — fall through to env-var fallback.
  }
  return process.env.NEXT_PUBLIC_SUPABASE_URL || "https://test.supabase.co";
}

const SUPABASE_URL = readSupabaseUrlFromEnvFile();
const SUPABASE_ORIGIN = new URL(SUPABASE_URL).origin;

const sampleAnalysis = {
  summary:
    "Customers love the product quality and fast shipping but repeatedly call out slow support response times.",
  sentiment: { positive: 58, neutral: 12, negative: 22, mixed: 8 },
  overall_score: 74,
  complaints: [
    {
      text: "Slow customer support response times",
      count: 14,
      severity: "high",
      examples: ["Support took three weeks to reply"],
    },
    {
      text: "iOS app stability issues",
      count: 6,
      severity: "medium",
      examples: ["App crashes on iOS sometimes"],
    },
  ],
  praises: [
    {
      text: "Fast shipping",
      count: 18,
      examples: ["Shipping was fast"],
    },
    {
      text: "Product quality exceeds expectations",
      count: 12,
      examples: [],
    },
  ],
  feature_requests: [
    { text: "Clearer onboarding tutorial", count: 4, examples: [] },
  ],
  action_items: [
    {
      title: "Reduce first-response time on support tickets",
      description: "Target <4h median response.",
      priority: "high",
    },
  ],
  rating_distribution: { "1": 6, "2": 4, "3": 5, "4": 8, "5": 27 },
};

async function fulfillProjectsInsert(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  await route.fulfill({
    status: 201,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ id: "proj_e2e_1" }),
  });
}

async function fulfillReviewsInsert(route: Route) {
  if (route.request().method() === "OPTIONS") {
    await route.fulfill({ status: 204, headers: CORS_HEADERS });
    return;
  }
  await route.fulfill({
    status: 201,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    body: "[]",
  });
}

async function fulfillAnalyze(route: Route, delayMs = 600) {
  if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
  await route.fulfill({
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      analysis_id: "an_e2e_1",
      analysis: sampleAnalysis,
    }),
  });
}

async function setupAllMocks(
  page: import("@playwright/test").Page,
  analyzeDelayMs = 600,
) {
  await page.route(
    `${SUPABASE_ORIGIN}/rest/v1/projects*`,
    fulfillProjectsInsert,
  );
  await page.route(
    `${SUPABASE_ORIGIN}/rest/v1/reviews*`,
    fulfillReviewsInsert,
  );
  await page.route("**/api/analyze", (r) => fulfillAnalyze(r, analyzeDelayMs));
}

test.describe("paste-and-analyze", () => {
  test("paste 3 reviews → click Analyze → see progress → see results", async ({
    page,
  }) => {
    await setupAllMocks(page, 800);
    await page.goto(FIXTURE_URL);

    const textarea = page.getByLabel(/paste reviews/i);
    await textarea.fill("review one\n\nreview two\n\nreview three");

    await expect(page.getByTestId("review-count")).toContainText(/3 reviews/i);

    await page.getByRole("button", { name: /analyze 3 reviews/i }).click();

    await expect(page.getByTestId("loading-view")).toBeVisible();
    const steps = page.locator('[data-testid^="analyze-step-"]');
    await expect(steps).toHaveCount(7);

    await expect(page.getByTestId("compact-results")).toBeVisible({
      timeout: 15_000,
    });
  });

  test("results show executive summary, sentiment donut, top issues", async ({
    page,
  }) => {
    await setupAllMocks(page, 200);
    await page.goto(FIXTURE_URL);

    await page
      .getByLabel(/paste reviews/i)
      .fill("alpha review\n\nbeta review");
    await page.getByRole("button", { name: /analyze 2 reviews/i }).click();

    const results = page.getByTestId("compact-results");
    await expect(results).toBeVisible({ timeout: 15_000 });

    // Executive summary
    await expect(results).toContainText(sampleAnalysis.summary);

    // Sentiment donut: DonutChart renders an SVG with role="img" and an
    // aria-label containing "sentiment".
    const donut = results.locator("svg[role='img']").first();
    await expect(donut).toBeVisible();

    // Top issues — match the bulleted list items, not the summary paragraph
    // (which mentions "fast shipping" inline and would otherwise collide).
    await expect(results.getByText(/top complaints/i)).toBeVisible();
    await expect(
      results.getByText(/^•\s*Slow customer support response times$/),
    ).toBeVisible();
    await expect(results.getByText(/top praises/i)).toBeVisible();
    await expect(results.getByText(/^•\s*Fast shipping$/)).toBeVisible();

    // Action buttons
    await expect(
      results.getByRole("button", { name: /open full report/i }),
    ).toBeVisible();
    await expect(
      results.getByRole("button", { name: /new analysis/i }),
    ).toBeVisible();
  });

  test("'Open Full Report' navigates to the project page", async ({
    page,
  }) => {
    await setupAllMocks(page, 100);
    await page.goto(FIXTURE_URL);

    await page.getByLabel(/paste reviews/i).fill("solo review");
    await page.getByRole("button", { name: /analyze 1 review/i }).click();

    await expect(page.getByTestId("compact-results")).toBeVisible({
      timeout: 15_000,
    });

    // /projects/[id] is auth-protected by middleware; like other E2E suites
    // here, we accept either landing on /projects/proj_e2e_1 OR redirecting
    // to /login?next=/projects/proj_e2e_1 — both prove the client-side push
    // fired with the right destination.
    await Promise.all([
      page.waitForURL(
        /\/projects\/proj_e2e_1(?:$|\?|#)|[?&]next=%2Fprojects%2Fproj_e2e_1/,
        { timeout: 15_000, waitUntil: "commit" },
      ),
      page.getByRole("button", { name: /open full report/i }).click(),
    ]);

    const url = new URL(page.url());
    const ok =
      url.pathname === "/projects/proj_e2e_1" ||
      url.searchParams.get("next") === "/projects/proj_e2e_1";
    expect(ok).toBe(true);
  });

  test("empty paste → error toast", async ({ page }) => {
    await setupAllMocks(page, 100);
    await page.goto(FIXTURE_URL);

    // Don't paste anything — click Analyze with empty textarea.
    await page.getByRole("button", { name: /analyze/i }).click();

    // Sonner renders a toast with the error text. It mounts in a portal at
    // the page root; getByText scoped to body finds it.
    await expect(
      page.getByText(/please paste at least one review/i),
    ).toBeVisible({ timeout: 5_000 });

    // Also: still on /test-paste (no project insert / API call happened).
    expect(new URL(page.url()).pathname).toBe(FIXTURE_URL);
  });
});
