import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

type FakeProject = {
  id: string;
  name: string;
  industry: string;
  is_demo: boolean;
  updated_at: string;
};

const orderMock = vi.hoisted(() => vi.fn());
const limitMock = vi.hoisted(() => vi.fn());
const projectsData = vi.hoisted<{ value: FakeProject[] }>(() => ({
  value: [],
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "projects") {
        return {
          select: () => ({
            order: (col: string, opts: { ascending: boolean }) => {
              orderMock(col, opts);
              return {
                limit: (n: number) => {
                  limitMock(n);
                  return Promise.resolve({
                    data: projectsData.value.slice(0, n),
                    error: null,
                  });
                },
              };
            },
          }),
        };
      }
      return {};
    },
  }),
}));

import { RecentProjects } from "@/components/dashboard/recent-projects";

beforeEach(() => {
  orderMock.mockReset();
  limitMock.mockReset();
  projectsData.value = [];
});

function makeProject(overrides: Partial<FakeProject> = {}): FakeProject {
  return {
    id: "p_default",
    name: "Default Project",
    industry: "SaaS",
    is_demo: false,
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("RecentProjects", () => {
  it("shows the empty state when there are 0 projects", async () => {
    projectsData.value = [];

    const ui = await RecentProjects();
    render(ui);

    expect(screen.getByTestId("recent-projects-empty")).toBeInTheDocument();
    expect(screen.getByText(/no projects yet/i)).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /create first project/i });
    expect(cta.getAttribute("href")).toBe("/projects/new");
    // No grid + no "View all" link when empty.
    expect(screen.queryByTestId("recent-projects-grid")).toBeNull();
    expect(screen.queryByRole("link", { name: /view all/i })).toBeNull();
  });

  it("shows a demo project with the 'Demo' badge and dashed border", async () => {
    projectsData.value = [
      makeProject({
        id: "p_demo",
        name: "Sample: SaaS Reviews",
        is_demo: true,
      }),
      makeProject({ id: "p_real", name: "Real Project", is_demo: false }),
    ];

    const ui = await RecentProjects();
    render(ui);

    const demoCard = screen.getByTestId("project-card-p_demo");
    expect(demoCard.getAttribute("data-demo")).toBe("true");
    // The Card sits inside the Link wrapper — assert the badge inside it.
    const inner = demoCard.querySelector('[class*="card"]') as HTMLElement;
    expect(inner.style.border).toMatch(/dashed/);
    // "Demo" badge is rendered inside the demo card only.
    const demoBadges = demoCard.querySelectorAll("span.badge");
    expect(demoBadges.length).toBeGreaterThan(0);
    expect(
      Array.from(demoBadges).some((b) => /demo/i.test(b.textContent ?? "")),
    ).toBe(true);

    // Real project: no Demo badge, solid border.
    const realCard = screen.getByTestId("project-card-p_real");
    expect(realCard.getAttribute("data-demo")).toBe("false");
    const realInner = realCard.querySelector('[class*="card"]') as HTMLElement;
    expect(realInner.style.border).not.toMatch(/dashed/);
    expect(
      Array.from(realCard.querySelectorAll("span.badge")).some((b) =>
        /demo/i.test(b.textContent ?? ""),
      ),
    ).toBe(false);
  });

  it("renders at most 3 projects (limit clause is 3)", async () => {
    // Seed 5 — the fake client honors .limit(n) by slicing to n, mirroring
    // what Supabase does, so we can assert both the call AND the render.
    projectsData.value = [
      makeProject({ id: "p1", name: "P1" }),
      makeProject({ id: "p2", name: "P2" }),
      makeProject({ id: "p3", name: "P3" }),
      makeProject({ id: "p4", name: "P4" }),
      makeProject({ id: "p5", name: "P5" }),
    ];

    const ui = await RecentProjects();
    render(ui);

    expect(limitMock).toHaveBeenCalledWith(3);
    const grid = screen.getByTestId("recent-projects-grid");
    const cards = grid.querySelectorAll('[data-testid^="project-card-"]');
    expect(cards).toHaveLength(3);
    // First three IDs in seed order are present; p4/p5 are not.
    expect(screen.getByTestId("project-card-p1")).toBeInTheDocument();
    expect(screen.getByTestId("project-card-p2")).toBeInTheDocument();
    expect(screen.getByTestId("project-card-p3")).toBeInTheDocument();
    expect(screen.queryByTestId("project-card-p4")).toBeNull();
    expect(screen.queryByTestId("project-card-p5")).toBeNull();
  });

  it("requests projects ordered by updated_at descending", async () => {
    projectsData.value = [
      makeProject({
        id: "p_new",
        name: "Newer",
        updated_at: "2026-04-26T10:00:00.000Z",
      }),
      makeProject({
        id: "p_mid",
        name: "Middle",
        updated_at: "2026-04-20T10:00:00.000Z",
      }),
      makeProject({
        id: "p_old",
        name: "Older",
        updated_at: "2026-01-01T10:00:00.000Z",
      }),
    ];

    const ui = await RecentProjects();
    render(ui);

    expect(orderMock).toHaveBeenCalledTimes(1);
    expect(orderMock).toHaveBeenCalledWith("updated_at", { ascending: false });

    // Sanity: cards render in the order returned (newest first).
    const grid = screen.getByTestId("recent-projects-grid");
    const ids = Array.from(
      grid.querySelectorAll('[data-testid^="project-card-"]'),
    ).map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual([
      "project-card-p_new",
      "project-card-p_mid",
      "project-card-p_old",
    ]);
  });
});
