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

// .env.local is the source of truth for the dev server Playwright spawns.
// We need the same values in this test process to drive the admin client.
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

test.describe("projects", () => {
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

  test("/projects shows empty state for new user", async ({ page }) => {
    await injectAuthCookie(page, user);

    await page.goto("/projects");

    await expect(
      page.getByTestId("projects-empty")
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/no projects yet/i)).toBeVisible();
    await expect(page.getByTestId("projects-grid")).toHaveCount(0);
    await expect(page.getByTestId("new-project-button")).toHaveCount(0);
  });

  test("create project → appears in list", async ({ page }) => {
    await injectAuthCookie(page, user);

    await page.goto("/projects");
    await expect(page.getByTestId("projects-empty")).toBeVisible();

    await page.getByTestId("empty-new-project-button").click();
    await expect(page.getByRole("dialog")).toBeVisible();

    const projectName = `E2E Project ${Date.now()}`;
    await page.getByLabel(/project name/i).fill(projectName);
    await page.getByLabel(/^description$/i).fill("Created by Playwright");
    await page.getByLabel(/^industry$/i).selectOption("SaaS");
    await page.getByLabel(/review source/i).selectOption("Google");

    const insertResponsePromise = page.waitForResponse(
      (r) =>
        r.url().includes("/rest/v1/projects") && r.request().method() === "POST",
      { timeout: 15_000 }
    );

    await page.getByRole("button", { name: /create project/i }).click();
    const insertResponse = await insertResponsePromise;
    if (insertResponse.status() >= 400) {
      const body = await insertResponse.text();
      throw new Error(
        `projects insert returned ${insertResponse.status()}: ${body}`
      );
    }

    // Modal pushes to /projects/[id] on success. waitUntil: 'commit' avoids
    // waiting for the detail page's full load (slow on first compile in dev).
    await page.waitForURL(/\/projects\/[a-f0-9-]+/, {
      timeout: 15_000,
      waitUntil: "commit",
    });

    await page.goto("/projects");
    await expect(page.getByTestId("projects-grid")).toBeVisible();
    await expect(page.getByText(projectName)).toBeVisible();
    await expect(page.getByTestId("projects-empty")).toHaveCount(0);
  });

  test("project card click → /projects/[id]", async ({ page }) => {
    const { projectId } = await seedProject({
      user,
      name: "Clickable Project",
    });

    await injectAuthCookie(page, user);
    await page.goto("/projects");

    const card = page.getByTestId(`project-card-${projectId}`);
    await expect(card).toBeVisible();
    await card.click();

    await page.waitForURL(new RegExp(`/projects/${projectId}$`), {
      timeout: 15_000,
      waitUntil: "commit",
    });
    expect(new URL(page.url()).pathname).toBe(`/projects/${projectId}`);
  });

  test("breadcrumb on project detail → back to /projects", async ({ page }) => {
    const { projectId } = await seedProject({
      user,
      name: "Breadcrumb Project",
    });

    await injectAuthCookie(page, user);
    await page.goto(`/projects/${projectId}`);

    await expect(page.getByTestId("breadcrumb")).toBeVisible();
    await page.getByTestId("breadcrumb-projects").click();

    await page.waitForURL(/\/projects$/, { timeout: 10_000 });
    expect(new URL(page.url()).pathname).toBe("/projects");
    await expect(page.getByRole("heading", { name: /^projects$/i })).toBeVisible();
  });
});
