import { describe, it, expect, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { AnalysisPoint } from "@/lib/trends/aggregate";

const pushMock = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
}));

import { TrendsClient } from "@/components/trends/trends-client";

const PROJECTS = [
  { id: "p_1", name: "Test Project", industry: "SaaS" as const },
];

function makeAnalysis(overrides: Partial<AnalysisPoint> = {}): AnalysisPoint {
  return {
    id: "a_x",
    created_at: new Date().toISOString(),
    sentiment_positive: 60,
    sentiment_neutral: 10,
    sentiment_negative: 25,
    sentiment_mixed: 5,
    overall_score: 65,
    review_count: 50,
    rating_distribution: { "1": 2, "2": 4, "3": 8, "4": 16, "5": 20 },
    complaints: [],
    praises: [],
    ...overrides,
  };
}

describe("TrendsClient", () => {
  it("shows empty state with < 2 analyses", () => {
    render(
      <TrendsClient
        projects={PROJECTS}
        selectedProjectId="p_1"
        industry="SaaS"
        analyses={[]}
        initialRange="6M"
      />,
    );
    expect(screen.getByText(/not enough data yet/i)).toBeInTheDocument();
    expect(
      screen.getByText(/at least two analyses/i),
    ).toBeInTheDocument();
    // Charts should not render in empty state.
    expect(screen.queryByTestId("trends-stat-cards")).toBeNull();
    expect(screen.queryByTestId("trends-line-chart")).toBeNull();
    expect(screen.queryByTestId("trends-stacked-bars")).toBeNull();
  });

  it("stat cards show real aggregated data", () => {
    const now = Date.now();
    const a1 = makeAnalysis({
      id: "a1",
      created_at: new Date(now - 30 * 86_400_000).toISOString(),
      overall_score: 50,
      review_count: 20,
      sentiment_negative: 30,
      rating_distribution: { "1": 5, "2": 5, "3": 5, "4": 5, "5": 0 },
    });
    const a2 = makeAnalysis({
      id: "a2",
      created_at: new Date(now - 5 * 86_400_000).toISOString(),
      overall_score: 70,
      review_count: 40,
      sentiment_negative: 20,
      rating_distribution: { "1": 0, "2": 0, "3": 4, "4": 8, "5": 28 },
    });
    render(
      <TrendsClient
        projects={PROJECTS}
        selectedProjectId="p_1"
        industry="SaaS"
        analyses={[a1, a2]}
        initialRange="6M"
      />,
    );

    const cards = screen.getByTestId("trends-stat-cards");
    // Sentiment uses the latest overall_score → 70
    expect(within(cards).getByText("70/100")).toBeInTheDocument();
    // Reviews is the sum across the window → 60
    expect(within(cards).getByText("60")).toBeInTheDocument();
    // Negative % uses the latest sentiment_negative → 20%
    expect(within(cards).getByText("20%")).toBeInTheDocument();
    // Rating: weighted avg of {3:4, 4:8, 5:28} = (12+32+140)/40 = 4.6 → "4.6★"
    expect(within(cards).getByText("4.6★")).toBeInTheDocument();
  });

  it("line chart renders SVG with one circle per data point", () => {
    const now = Date.now();
    const analyses = Array.from({ length: 4 }, (_, i) =>
      makeAnalysis({
        id: `a_${i}`,
        created_at: new Date(now - (4 - i) * 7 * 86_400_000).toISOString(),
        overall_score: 50 + i * 5,
      }),
    );

    render(
      <TrendsClient
        projects={PROJECTS}
        selectedProjectId="p_1"
        industry="SaaS"
        analyses={analyses}
        initialRange="6M"
      />,
    );

    const chart = screen.getByTestId("trends-line-chart");
    const svg = chart.querySelector("svg");
    expect(svg).not.toBeNull();
    const path = svg!.querySelector("path[stroke='var(--teal)']");
    expect(path).not.toBeNull();
    const circles = svg!.querySelectorAll("circle");
    expect(circles.length).toBe(4);
  });

  it("topic tracking extracts themes from complaints/praises", () => {
    const now = Date.now();
    const a1 = makeAnalysis({
      id: "a1",
      created_at: new Date(now - 30 * 86_400_000).toISOString(),
      complaints: [
        {
          text: "Slow shipping",
          count: 5,
          severity: "medium",
          examples: [],
        },
      ],
      praises: [{ text: "Great support", count: 3, examples: [] }],
    });
    const a2 = makeAnalysis({
      id: "a2",
      created_at: new Date(now - 5 * 86_400_000).toISOString(),
      complaints: [
        {
          text: "Slow shipping",
          count: 8,
          severity: "high",
          examples: [],
        },
      ],
      praises: [{ text: "Great support", count: 5, examples: [] }],
    });
    render(
      <TrendsClient
        projects={PROJECTS}
        selectedProjectId="p_1"
        industry="SaaS"
        analyses={[a1, a2]}
        initialRange="6M"
      />,
    );

    const grid = screen.getByTestId("trends-topic-grid");
    const cards = within(grid).getAllByTestId("trends-topic-card");
    expect(cards.length).toBe(2);
    expect(within(grid).getByText(/slow shipping/i)).toBeInTheDocument();
    expect(within(grid).getByText(/great support/i)).toBeInTheDocument();
  });

  it("does not render a Response Rate metric (we don't track this)", () => {
    const now = Date.now();
    const analyses = [
      makeAnalysis({
        id: "a1",
        created_at: new Date(now - 30 * 86_400_000).toISOString(),
      }),
      makeAnalysis({
        id: "a2",
        created_at: new Date(now - 5 * 86_400_000).toISOString(),
      }),
    ];
    render(
      <TrendsClient
        projects={PROJECTS}
        selectedProjectId="p_1"
        industry="SaaS"
        analyses={analyses}
        initialRange="6M"
      />,
    );

    expect(screen.queryByText(/response rate/i)).toBeNull();
    expect(screen.queryByText(/^response$/i)).toBeNull();
    // Verify the four stat cards are exactly the metrics we DO track:
    const cards = screen.getByTestId("trends-stat-cards");
    expect(within(cards).getByText(/^Sentiment$/)).toBeInTheDocument();
    expect(within(cards).getByText(/^Reviews$/)).toBeInTheDocument();
    expect(within(cards).getByText(/^Rating$/)).toBeInTheDocument();
    expect(within(cards).getByText(/^Negative %$/)).toBeInTheDocument();
  });
});
