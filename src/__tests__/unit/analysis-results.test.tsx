import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  AnalysisResults,
  type AnalysisResultsData,
} from "@/components/analysis/analysis-results";
import { sampleAnalysisResponse } from "@/test/fixtures/analysis";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

function buildData(
  overrides: Partial<AnalysisResultsData> = {}
): AnalysisResultsData {
  const a = sampleAnalysisResponse;
  return {
    summary: a.summary,
    sentiment_positive: a.sentiment.positive,
    sentiment_neutral: a.sentiment.neutral,
    sentiment_negative: a.sentiment.negative,
    sentiment_mixed: a.sentiment.mixed,
    overall_score: a.overall_score,
    complaints: a.complaints as ComplaintItem[],
    praises: a.praises as MentionItem[],
    feature_requests: a.feature_requests as MentionItem[],
    action_items: a.action_items as ActionItem[],
    rating_distribution: a.rating_distribution,
    review_count: 50,
    created_at: "2026-04-01T12:00:00Z",
    ...overrides,
  };
}

describe("AnalysisResults — full mode", () => {
  it("renders summary, sentiment, issues, strengths, features, actions, and rating distribution", () => {
    render(<AnalysisResults analysis={buildData()} mode="full" />);

    expect(screen.getByTestId("analysis-results")).toHaveAttribute(
      "data-mode",
      "full"
    );
    expect(screen.getByTestId("analysis-summary")).toHaveTextContent(
      sampleAnalysisResponse.summary
    );
    expect(screen.getByTestId("analysis-sentiment-card")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-overall-score")).toHaveTextContent(
      "74"
    );

    expect(screen.getByTestId("analysis-issue-0")).toHaveTextContent(
      "Slow customer support response times"
    );
    expect(screen.getByTestId("analysis-issue-0")).toHaveTextContent("high");
    expect(screen.getByTestId("analysis-issue-1")).toHaveTextContent(
      "iOS app stability issues"
    );

    expect(screen.getByTestId("analysis-strength-0")).toHaveTextContent(
      "Fast shipping"
    );
    expect(screen.getByTestId("analysis-feature-0")).toHaveTextContent(
      "Clearer onboarding tutorial"
    );

    expect(screen.getByTestId("analysis-action-0")).toHaveTextContent(
      "Reduce first-response time"
    );
    expect(screen.getByTestId("analysis-action-0")).toHaveTextContent("high");

    expect(screen.getByTestId("analysis-rating-card")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-rating-row-5")).toHaveTextContent(
      "27"
    );
  });

  it("shows the meta line with review count and date", () => {
    render(
      <AnalysisResults
        analysis={buildData({ review_count: 12, created_at: "2026-03-15T00:00:00Z" })}
        mode="full"
      />
    );
    const meta = screen.getByTestId("analysis-meta");
    expect(meta).toHaveTextContent("12 reviews");
    // Locale-formatted date — check for year + month token rather than exact format.
    expect(meta).toHaveTextContent("2026");
    expect(meta.textContent).toMatch(/Mar/i);
  });

  it("hides the rating distribution card in compact mode", () => {
    render(<AnalysisResults analysis={buildData()} mode="compact" />);
    expect(screen.queryByTestId("analysis-rating-card")).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-results")).toHaveAttribute(
      "data-mode",
      "compact"
    );
  });

  it("renders empty placeholders when arrays are empty", () => {
    render(
      <AnalysisResults
        analysis={buildData({
          complaints: [],
          praises: [],
          feature_requests: [],
          action_items: [],
          rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
        })}
        mode="full"
      />
    );
    expect(screen.getByTestId("analysis-issues-empty")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-strengths-empty")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-features-empty")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-actions-empty")).toBeInTheDocument();
    expect(screen.getByTestId("analysis-rating-empty")).toBeInTheDocument();
  });

  it("falls back to a placeholder when summary is null", () => {
    render(
      <AnalysisResults analysis={buildData({ summary: null })} mode="full" />
    );
    expect(screen.queryByTestId("analysis-summary")).not.toBeInTheDocument();
    expect(screen.getByTestId("analysis-summary-empty")).toBeInTheDocument();
  });
});
