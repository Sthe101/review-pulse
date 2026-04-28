import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  createRealTestUser,
  deleteRealTestUser,
  injectAuthCookie,
  seedProject,
  seedReviews,
  type RealTestUser,
} from "./helpers/auth-real";

function loadEnvLocal(): void {
  const envPath = join(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return;
  const content = readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/);
    if (!m) continue;
    const key = m[1]!;
    const val = m[2]!.trim().replace(/^["']|["']$/g, "");
    if (!process.env[key]) process.env[key] = val;
  }
}
loadEnvLocal();

const HAVE_SUPABASE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  !!process.env.SUPABASE_SERVICE_ROLE_KEY &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== "https://test.supabase.co";

const HAVE_ANTHROPIC =
  !!process.env.ANTHROPIC_API_KEY &&
  process.env.ANTHROPIC_API_KEY !== "missing-key";

test.describe("add reviews", () => {
  test.skip(
    !HAVE_SUPABASE,
    "needs real NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY"
  );

  let user: RealTestUser;

  test.beforeEach(async () => {
    user = await createRealTestUser();
  });

  test.afterEach(async () => {
    if (user?.id) await deleteRealTestUser(user.id);
  });

  test("paste reviews → count shown → Add → analysis appears", async ({
    page,
  }) => {
    test.skip(!HAVE_ANTHROPIC, "needs real ANTHROPIC_API_KEY");
    test.setTimeout(120_000);

    const { projectId } = await seedProject({
      user,
      name: "Paste-Add E2E",
    });

    await injectAuthCookie(page, user);
    // Default waitUntil ("load") so the JS bundle is downloaded + React has
    // hydrated before fill(). With waitUntil: "commit" the textarea is in the
    // DOM but React's onChange isn't wired yet, and the count never updates.
    await page.goto(`/projects/${projectId}?tab=add-reviews`);

    const textarea = page.getByTestId("paste-textarea");
    await expect(textarea).toBeVisible({ timeout: 15_000 });

    const sample = [
      "Shipping was incredibly fast and packaging was solid. Five stars all the way.",
      "The product quality is just OK for the price — packaging looked nice but the build feels cheap.",
      "Customer support was helpful but it took three days to get a response. Disappointing.",
    ].join("\n\n");

    await textarea.fill(sample);

    await expect(page.getByTestId("paste-review-count")).toHaveText(
      /^3 reviews/
    );

    const submit = page.getByTestId("paste-submit-button");
    await expect(submit).toBeEnabled();

    const analyzeResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/analyze") &&
        !r.url().includes("/api/analyze/") &&
        r.request().method() === "POST",
      { timeout: 90_000 }
    );

    await submit.click();
    const analyzeResponse = await analyzeResponsePromise;
    if (analyzeResponse.status() >= 400) {
      const body = await analyzeResponse.text();
      throw new Error(
        `/api/analyze returned ${analyzeResponse.status()}: ${body}`
      );
    }

    await expect(page.getByTestId("tab-analysis")).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 30_000 }
    );
    // After tab switch, AnalysisTab still renders the empty state until
    // router.refresh() rehydrates the server-fetched `analysis` prop. Give it
    // up to 30s to swap from <analysis-empty> to <analysis-tab>.
    await expect(page.getByTestId("analysis-tab")).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("analysis-summary")).toBeVisible();
  });

  test("reviews visible in Reviews tab after adding", async ({ page }) => {
    const { projectId } = await seedProject({
      user,
      name: "Reviews-tab E2E",
    });
    await seedReviews({
      user,
      projectId,
      contents: [
        "Excellent service, will buy again.",
        "Item arrived broken and refund took too long.",
      ],
    });

    await injectAuthCookie(page, user);
    await page.goto(`/projects/${projectId}?tab=reviews`, {
      waitUntil: "commit",
    });

    await expect(page.getByTestId("reviews-tab")).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByTestId("tab-reviews")).toHaveAttribute(
      "aria-selected",
      "true"
    );

    await expect(
      page.getByText("Excellent service, will buy again.")
    ).toBeVisible();
    await expect(
      page.getByText("Item arrived broken and refund took too long.")
    ).toBeVisible();
    await expect(page.getByTestId("reviews-empty")).toHaveCount(0);
  });
});
