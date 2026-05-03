import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ReviewsTab, type ReviewRow } from "@/components/projects/reviews-tab";
import {
  HistoryTab,
  type AnalysisHistoryItem,
} from "@/components/projects/history-tab";

const SENTIMENTS = ["positive", "neutral", "negative", "mixed"] as const;

function makeReviews(
  count: number,
  overrides: Partial<ReviewRow> = {}
): ReviewRow[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `r_${i}`,
    content: `Review number ${i + 1}: ${
      i % 2 === 0 ? "great experience" : "had issues"
    }`,
    rating: ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5,
    source: "Google",
    sentiment: SENTIMENTS[i % SENTIMENTS.length] as string,
    themes: i % 3 === 0 ? ["shipping", "quality"] : ["support"],
    created_at: "2026-04-01T00:00:00Z",
    ...overrides,
  }));
}

describe("ReviewsTab", () => {
  it('filter "Positive" shows only positive reviews', () => {
    render(<ReviewsTab reviews={makeReviews(20)} />);
    fireEvent.click(screen.getByTestId("reviews-filter-positive"));

    const items = screen.getAllByTestId(/^review-item-/);
    // 20 reviews cycling through 4 sentiments → 5 are positive.
    expect(items).toHaveLength(5);
    for (const el of items) {
      expect(el).toHaveAttribute("data-sentiment", "positive");
    }
    expect(screen.getByTestId("reviews-filter-positive")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("search filters by content text", () => {
    render(<ReviewsTab reviews={makeReviews(10)} />);
    fireEvent.change(screen.getByTestId("reviews-search"), {
      target: { value: "great" },
    });
    const items = screen.getAllByTestId(/^review-item-/);
    // Even-indexed reviews say "great experience" — that's 5 of 10.
    expect(items).toHaveLength(5);
    expect(screen.getByTestId("reviews-meta")).toHaveTextContent(
      "5 of 10 reviews"
    );

    // Case-insensitive
    fireEvent.change(screen.getByTestId("reviews-search"), {
      target: { value: "ISSUES" },
    });
    expect(screen.getAllByTestId(/^review-item-/)).toHaveLength(5);
  });

  it("pagination loads 20 at a time", () => {
    render(<ReviewsTab reviews={makeReviews(45)} />);
    expect(screen.getAllByTestId(/^review-item-/)).toHaveLength(20);
    expect(screen.getByTestId("reviews-page-indicator")).toHaveTextContent(
      "Page 1 of 3"
    );

    fireEvent.click(screen.getByTestId("reviews-next"));
    expect(screen.getAllByTestId(/^review-item-/)).toHaveLength(20);
    expect(screen.getByTestId("reviews-page-indicator")).toHaveTextContent(
      "Page 2 of 3"
    );

    fireEvent.click(screen.getByTestId("reviews-next"));
    expect(screen.getAllByTestId(/^review-item-/)).toHaveLength(5);
    expect(screen.getByTestId("reviews-next")).toBeDisabled();
  });
});

describe("HistoryTab", () => {
  it("history entries sorted by date desc", () => {
    // The component preserves the order it is given. The page-level query
    // sorts by created_at desc, so newest-first is the contract this test
    // pins down.
    const analyses: AnalysisHistoryItem[] = [
      {
        id: "ana_apr",
        summary: "April analysis",
        overall_score: 78,
        review_count: 60,
        created_at: "2026-04-15T10:00:00Z",
      },
      {
        id: "ana_mar",
        summary: "March analysis",
        overall_score: 55,
        review_count: 40,
        created_at: "2026-03-20T10:00:00Z",
      },
      {
        id: "ana_feb",
        summary: "February analysis",
        overall_score: 30,
        review_count: 10,
        created_at: "2026-02-01T10:00:00Z",
      },
    ];
    const sorted = [...analyses].sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    expect(sorted.map((a) => a.id)).toEqual([
      "ana_apr",
      "ana_mar",
      "ana_feb",
    ]);

    render(
      <HistoryTab analyses={sorted} activeId={null} onSelect={() => {}} />
    );

    const ids = screen
      .getAllByTestId(/^history-item-ana_/)
      .map((el) => el.getAttribute("data-testid"));
    expect(ids).toEqual([
      "history-item-ana_apr",
      "history-item-ana_mar",
      "history-item-ana_feb",
    ]);
  });
});
