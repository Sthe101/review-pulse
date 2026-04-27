import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const fromMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({ from: fromMock }),
}));

import { StatCards } from "@/components/dashboard/stat-cards";

type StatFixture = {
  reviewsCount: number;
  projectsCount: number;
  analysesCount: number;
  scores: number[];
};

function setupQueries(f: StatFixture) {
  fromMock.mockImplementation((table: string) => ({
    select: (
      _col: string,
      opts?: { count?: string; head?: boolean }
    ) => {
      if (table === "reviews") {
        return Promise.resolve({ count: f.reviewsCount, error: null });
      }
      if (table === "projects") {
        return Promise.resolve({ count: f.projectsCount, error: null });
      }
      if (table === "analyses") {
        if (opts?.head) {
          return {
            gte: () =>
              Promise.resolve({ count: f.analysesCount, error: null }),
          };
        }
        return Promise.resolve({
          data: f.scores.map((s) => ({ overall_score: s })),
          error: null,
        });
      }
      return Promise.resolve({ count: 0, data: null, error: null });
    },
  }));
}

beforeEach(() => {
  fromMock.mockReset();
});

describe("StatCards", () => {
  it("shows 0 for all stats on a fresh account", async () => {
    setupQueries({
      reviewsCount: 0,
      projectsCount: 0,
      analysesCount: 0,
      scores: [],
    });

    const ui = await StatCards();
    render(ui);

    const values = screen.getAllByTestId("stat-value");
    expect(values).toHaveLength(4);
    expect(values[0]?.textContent).toBe("0");
    expect(values[1]?.textContent).toBe("0");
    expect(values[2]?.textContent).toBe("0");
    expect(values[3]?.textContent).toBe("—");
  });

  it("shows correct counts after data exists", async () => {
    setupQueries({
      reviewsCount: 1234,
      projectsCount: 5,
      analysesCount: 7,
      scores: [80, 90, 70],
    });

    const ui = await StatCards();
    render(ui);

    const values = screen.getAllByTestId("stat-value");
    expect(values[0]?.textContent).toBe("1,234");
    expect(values[1]?.textContent).toBe("5");
    expect(values[2]?.textContent).toBe("7");
    // (80 + 90 + 70) / 3 = 80
    expect(values[3]?.textContent).toBe("80");
    expect(screen.getByText("/100")).toBeInTheDocument();
  });

  it("avg sentiment shows '—' when there are no analyses", async () => {
    setupQueries({
      reviewsCount: 100,
      projectsCount: 1,
      analysesCount: 0,
      scores: [],
    });

    const ui = await StatCards();
    render(ui);

    const values = screen.getAllByTestId("stat-value");
    expect(values[3]?.textContent).toBe("—");
    // No "/100" suffix when there's nothing to average
    expect(screen.queryByText("/100")).toBeNull();
  });

  it("avg sentiment shows a rounded number when analyses exist", async () => {
    setupQueries({
      reviewsCount: 50,
      projectsCount: 2,
      analysesCount: 4,
      scores: [82, 85, 88, 91],
    });

    const ui = await StatCards();
    render(ui);

    const values = screen.getAllByTestId("stat-value");
    // (82 + 85 + 88 + 91) / 4 = 86.5 → Math.round → 87
    expect(values[3]?.textContent).toBe("87");
    expect(screen.getByText("/100")).toBeInTheDocument();
  });
});
