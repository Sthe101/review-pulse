// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

const getUserMock = vi.hoisted(() => vi.fn());
const fromMock = vi.hoisted(() => vi.fn());
const redirectMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: getUserMock },
    from: fromMock,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: (path: string) => {
    redirectMock(path);
    throw new Error(`__REDIRECT__:${path}`);
  },
}));

import ProjectsPage from "@/app/(dashboard)/projects/page";

type Stub = ReturnType<typeof vi.fn>;

interface MockChains {
  projectsSelect: Stub;
  projectsOrder: Stub;
  reviewsSelect: Stub;
  analysesSelect: Stub;
  analysesOrder: Stub;
}

function setupChains(
  projectsRows: unknown[],
  reviewsRows: unknown[],
  analysesRows: unknown[]
): MockChains {
  const projectsOrder = vi.fn(() =>
    Promise.resolve({ data: projectsRows, error: null })
  );
  const projectsSelect = vi.fn(() => ({ order: projectsOrder }));

  const reviewsSelect = vi.fn(() =>
    Promise.resolve({ data: reviewsRows, error: null })
  );

  const analysesOrder = vi.fn(() =>
    Promise.resolve({ data: analysesRows, error: null })
  );
  const analysesSelect = vi.fn(() => ({ order: analysesOrder }));

  fromMock.mockImplementation((table: string) => {
    if (table === "projects") return { select: projectsSelect };
    if (table === "reviews") return { select: reviewsSelect };
    if (table === "analyses") return { select: analysesSelect };
    throw new Error(`Unexpected table: ${table}`);
  });

  return {
    projectsSelect,
    projectsOrder,
    reviewsSelect,
    analysesSelect,
    analysesOrder,
  };
}

describe("ProjectsPage server component", () => {
  beforeEach(() => {
    getUserMock.mockReset();
    fromMock.mockReset();
    redirectMock.mockReset();
  });

  it("redirects to /login when no authenticated user", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });
    setupChains([], [], []);

    await expect(ProjectsPage()).rejects.toThrow("__REDIRECT__:/login?next=/projects");
    expect(redirectMock).toHaveBeenCalledWith("/login?next=/projects");
  });

  it("fetches user's projects only via authenticated supabase context (no manual user_id filter)", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u_owner" } },
    });

    const ownerProject = {
      id: "p_owner_1",
      name: "Owned by U_OWNER",
      description: null,
      industry: "SaaS",
      review_source: "Mixed",
      is_demo: false,
      updated_at: new Date().toISOString(),
    };

    const chains = setupChains(
      [ownerProject],
      [{ project_id: "p_owner_1" }],
      [
        {
          project_id: "p_owner_1",
          sentiment_positive: 60,
          sentiment_neutral: 20,
          sentiment_negative: 20,
          overall_score: 72,
          created_at: new Date().toISOString(),
        },
      ]
    );

    const result = await ProjectsPage();
    expect(result).toBeDefined();

    // 1. Auth check ran.
    expect(getUserMock).toHaveBeenCalledTimes(1);

    // 2. Page queried the three relevant tables under the authenticated context
    //    — RLS scopes the result set to the current user. The page does NOT
    //    add an explicit `.eq("user_id", ...)` filter (which would be redundant
    //    and easy to get wrong); it relies on RLS at the DB layer.
    expect(fromMock).toHaveBeenCalledWith("projects");
    expect(fromMock).toHaveBeenCalledWith("reviews");
    expect(fromMock).toHaveBeenCalledWith("analyses");

    // 3. Selects the columns it needs and orders by updated_at desc.
    expect(chains.projectsSelect).toHaveBeenCalledWith(
      expect.stringContaining("id, name, description, industry, review_source, is_demo, updated_at")
    );
    expect(chains.projectsOrder).toHaveBeenCalledWith("updated_at", {
      ascending: false,
    });

    // 4. No redirect was triggered for an authenticated user.
    expect(redirectMock).not.toHaveBeenCalled();
  });
});
