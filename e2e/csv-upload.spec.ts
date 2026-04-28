import { test, expect } from "@playwright/test";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import {
  createRealTestUser,
  deleteRealTestUser,
  injectAuthCookie,
  seedProject,
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

const FIXTURE_PATH = join(process.cwd(), "e2e", "fixtures", "sample-reviews.csv");

test.describe("CSV upload", () => {
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

  test("upload a real CSV file → preview shown with column mapping", async ({
    page,
  }) => {
    const { projectId } = await seedProject({ user, name: "CSV-preview E2E" });

    await injectAuthCookie(page, user);
    await page.goto(`/projects/${projectId}?tab=add-reviews`);

    await expect(page.getByTestId("subtab-csv")).toBeVisible({ timeout: 15_000 });
    await page.getByTestId("subtab-csv").click();

    await expect(page.getByTestId("csv-drop-zone")).toBeVisible();

    await page.getByTestId("csv-file-input").setInputFiles(FIXTURE_PATH);

    await expect(page.getByTestId("csv-file-info")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("csv-file-info")).toContainText(
      "sample-reviews.csv"
    );

    await expect(page.getByTestId("csv-column-mapping")).toBeVisible();
    await expect(page.getByTestId("csv-map-content")).toHaveValue("review");
    await expect(page.getByTestId("csv-map-rating")).toHaveValue("rating");
    await expect(page.getByTestId("csv-map-source")).toHaveValue("source");
    await expect(page.getByTestId("csv-map-author")).toHaveValue("author");

    await expect(page.getByTestId("csv-preview")).toBeVisible();
    await expect(page.getByTestId("csv-preview-row-0")).toContainText(
      "Shipping was incredibly fast"
    );
    await expect(page.getByTestId("csv-preview-row-1")).toContainText(
      "product quality is just OK"
    );

    await expect(page.getByTestId("csv-row-count")).toContainText(/5 reviews/);

    await expect(page.getByTestId("csv-import-button")).toBeEnabled();
  });

  test("click Import → reviews saved → analysis starts", async ({ page }) => {
    test.skip(!HAVE_ANTHROPIC, "needs real ANTHROPIC_API_KEY");
    test.setTimeout(120_000);

    const { projectId } = await seedProject({ user, name: "CSV-import E2E" });

    await injectAuthCookie(page, user);
    await page.goto(`/projects/${projectId}?tab=add-reviews`);

    await page.getByTestId("subtab-csv").click();
    await expect(page.getByTestId("csv-drop-zone")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("csv-file-input").setInputFiles(FIXTURE_PATH);
    await expect(page.getByTestId("csv-file-info")).toBeVisible({
      timeout: 10_000,
    });

    const importBtn = page.getByTestId("csv-import-button");
    await expect(importBtn).toBeEnabled();

    const analyzeResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes("/api/analyze") &&
        !r.url().includes("/api/analyze/") &&
        r.request().method() === "POST",
      { timeout: 90_000 }
    );

    await importBtn.click();
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
    await expect(page.getByTestId("analysis-tab")).toBeVisible({
      timeout: 30_000,
    });
  });

  test("'Remove' clears the file", async ({ page }) => {
    const { projectId } = await seedProject({ user, name: "CSV-remove E2E" });

    await injectAuthCookie(page, user);
    await page.goto(`/projects/${projectId}?tab=add-reviews`);

    await page.getByTestId("subtab-csv").click();
    await expect(page.getByTestId("csv-drop-zone")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByTestId("csv-file-input").setInputFiles(FIXTURE_PATH);
    await expect(page.getByTestId("csv-file-info")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("csv-drop-zone")).toHaveCount(0);

    await page.getByTestId("csv-reset-button").click();

    await expect(page.getByTestId("csv-file-info")).toHaveCount(0);
    await expect(page.getByTestId("csv-preview")).toHaveCount(0);
    await expect(page.getByTestId("csv-drop-zone")).toBeVisible();
    await expect(page.getByTestId("csv-import-button")).toBeDisabled();
  });
});
