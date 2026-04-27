import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

type LatestRow = {
  id: string;
  complaints: unknown;
  praises: unknown;
  feature_requests: unknown;
  created_at: string;
} | null;

const latestRow = vi.hoisted<{ value: LatestRow }>(() => ({ value: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "analyses") {
        return {
          select: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: latestRow.value,
                  error: null,
                }),
              }),
            }),
          }),
        };
      }
      return {};
    },
  }),
}));

import { KeyInsights } from "@/components/dashboard/key-insights";

beforeEach(() => {
  latestRow.value = null;
});

const sampleAnalysis = {
  id: "an_1",
  created_at: "2026-04-26T12:00:00.000Z",
  complaints: [
    { text: "Slow customer support", count: 14, severity: "high" },
    { text: "Pricing too high", count: 5, severity: "medium" },
  ],
  praises: [
    { text: "Fast shipping", count: 18 },
    { text: "Great product quality", count: 9 },
  ],
  feature_requests: [
    { text: "Dark mode support", count: 7 },
    { text: "CSV export", count: 3 },
  ],
};

describe("KeyInsights", () => {
  it("renders nothing (hidden) when no analyses exist", async () => {
    latestRow.value = null;

    const ui = await KeyInsights();
    expect(ui).toBeNull();
  });

  it("shows 3 insight cards when an analysis exists", async () => {
    latestRow.value = sampleAnalysis;

    const ui = await KeyInsights();
    render(ui);

    expect(screen.getByTestId("key-insights")).toBeInTheDocument();
    expect(screen.getByTestId("insight-complaint")).toBeInTheDocument();
    expect(screen.getByTestId("insight-strength")).toBeInTheDocument();
    expect(screen.getByTestId("insight-feature")).toBeInTheDocument();

    // Highest-count item from each bucket is the "top".
    expect(screen.getByTestId("insight-complaint-text").textContent).toMatch(
      /slow customer support/i,
    );
    expect(screen.getByTestId("insight-strength-text").textContent).toMatch(
      /fast shipping/i,
    );
    expect(screen.getByTestId("insight-feature-text").textContent).toMatch(
      /dark mode support/i,
    );
  });

  it("complaint card uses the 'warn' icon", async () => {
    latestRow.value = sampleAnalysis;
    const ui = await KeyInsights();
    render(ui);

    const card = screen.getByTestId("insight-complaint");
    const warnIcon = card.querySelector('svg[data-icon="warn"]');
    expect(warnIcon).not.toBeNull();
  });

  it("strength card uses the 'trend' icon", async () => {
    latestRow.value = sampleAnalysis;
    const ui = await KeyInsights();
    render(ui);

    const card = screen.getByTestId("insight-strength");
    const trendIcon = card.querySelector('svg[data-icon="trend"]');
    expect(trendIcon).not.toBeNull();
  });

  it("feature request card uses the 'bulb' icon", async () => {
    latestRow.value = sampleAnalysis;
    const ui = await KeyInsights();
    render(ui);

    const card = screen.getByTestId("insight-feature");
    const bulbIcon = card.querySelector('svg[data-icon="bulb"]');
    expect(bulbIcon).not.toBeNull();
  });
});
