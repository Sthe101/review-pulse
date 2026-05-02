import { describe, it, expect } from "vitest";
import {
  buildAnalysisCsv,
  buildCsvFilename,
  escapeCsvCell,
  type CsvAnalysisInput,
  type ReviewRow,
} from "@/lib/csv/build-analysis-csv";
import { sampleAnalysisResponse } from "@/test/fixtures/analysis";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

function buildInput(
  overrides: Partial<CsvAnalysisInput> = {},
): CsvAnalysisInput {
  const a = sampleAnalysisResponse;
  return {
    project: {
      name: "ShopEase",
      industry: "E-commerce",
      review_source: "Google Business",
      ...(overrides.project ?? {}),
    },
    analysis: {
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
      created_at: "2026-03-28T12:00:00Z",
      ...(overrides.analysis ?? {}),
    },
    reviews: overrides.reviews ?? sampleReviews(),
  };
}

function sampleReviews(): ReviewRow[] {
  return [
    {
      content: "Great product, fast shipping!",
      rating: 5,
      source: "Google",
      author: "Sarah M.",
      review_date: "2026-03-28",
      created_at: "2026-03-28T10:00:00Z",
      sentiment: "positive",
      sentiment_score: 0.92,
      themes: ["shipping", "quality"],
    },
    {
      content: "Item arrived broken, contains \"defects\", no reply.",
      rating: 1,
      source: "Trustpilot",
      author: null,
      review_date: null,
      created_at: "2026-03-25T10:00:00Z",
      sentiment: "negative",
      sentiment_score: 0.12,
      themes: null,
    },
    {
      content: "Line one\nline two, with comma",
      rating: null,
      source: null,
      author: "Tom",
      review_date: "2026-03-20",
      created_at: "2026-03-20T10:00:00Z",
      sentiment: null,
      sentiment_score: null,
      themes: [],
    },
  ];
}

describe("escapeCsvCell", () => {
  it("returns empty string for null/undefined", () => {
    expect(escapeCsvCell(null)).toBe("");
    expect(escapeCsvCell(undefined)).toBe("");
  });

  it("leaves plain values unquoted", () => {
    expect(escapeCsvCell("hello")).toBe("hello");
    expect(escapeCsvCell(42)).toBe("42");
  });

  it("quotes commas", () => {
    expect(escapeCsvCell("a,b")).toBe('"a,b"');
  });

  it("escapes embedded double quotes by doubling them", () => {
    expect(escapeCsvCell('she said "hi"')).toBe('"she said ""hi"""');
  });

  it("quotes newlines and carriage returns", () => {
    expect(escapeCsvCell("line1\nline2")).toBe('"line1\nline2"');
    expect(escapeCsvCell("line1\r\nline2")).toBe('"line1\r\nline2"');
  });
});

describe("buildAnalysisCsv", () => {
  it("emits all 7 section headers in order", () => {
    const csv = buildAnalysisCsv(buildInput());
    const sections = [
      "ReviewPulse Analysis Report",
      "SENTIMENT BREAKDOWN",
      "TOP ISSUES",
      "STRENGTHS",
      "FEATURE REQUESTS",
      "ACTION ITEMS",
      "INDIVIDUAL REVIEWS",
    ];
    let cursor = -1;
    for (const s of sections) {
      const idx = csv.indexOf(s);
      expect(idx, `section "${s}" not found`).toBeGreaterThan(cursor);
      cursor = idx;
    }
  });

  it("writes the metadata block with project, industry, source, date, count, score", () => {
    const csv = buildAnalysisCsv(buildInput());
    expect(csv).toContain("Project,ShopEase");
    expect(csv).toContain("Industry,E-commerce");
    expect(csv).toContain("Source,Google Business");
    expect(csv).toContain("Reviews Analyzed,50");
    expect(csv).toContain("Overall Score,74/100");
    expect(csv).toMatch(/Date,(?:March 28, 2026|"March 28, 2026")/);
  });

  it("renders sentiment breakdown rows with percentages", () => {
    const csv = buildAnalysisCsv(buildInput());
    expect(csv).toContain("Category,Percentage");
    expect(csv).toContain("Positive,58%");
    expect(csv).toContain("Neutral,12%");
    expect(csv).toContain("Negative,22%");
    expect(csv).toContain("Mixed,8%");
  });

  it("ranks issues 1..N and computes share-of-total percent", () => {
    const csv = buildAnalysisCsv(buildInput());
    // 14 / 50 = 28%, 6 / 50 = 12%
    expect(csv).toMatch(
      /1,Slow customer support response times,high,14,28%,,/,
    );
    expect(csv).toMatch(/2,iOS app stability issues,medium,6,12%,,/);
  });

  it("maps action_item priority to P1/P2/P3 by severity", () => {
    const csv = buildAnalysisCsv(buildInput());
    const actionsHeader = csv.indexOf("ACTION ITEMS");
    const slice = csv.slice(actionsHeader);
    expect(slice).toMatch(
      /P1,Reduce first-response time on support tickets,/,
    );
    expect(slice).toMatch(/P2,Stabilize iOS app,/);
    expect(slice).toMatch(/P3,Ship an onboarding walkthrough,/);
  });

  it("escapes commas, quotes, and newlines in review content", () => {
    const csv = buildAnalysisCsv(buildInput());
    // Content with embedded quotes is wrapped + quotes doubled
    expect(csv).toContain(
      '"Item arrived broken, contains ""defects"", no reply."',
    );
    // Newline content is wrapped
    expect(csv).toContain('"Line one\nline two, with comma"');
  });

  it("renders rating with /5 suffix and themes joined by '; '", () => {
    const csv = buildAnalysisCsv(buildInput());
    const reviewsHeader = csv.indexOf("INDIVIDUAL REVIEWS");
    const slice = csv.slice(reviewsHeader);
    expect(slice).toContain("5/5,positive,0.92,Sarah M.");
    expect(slice).toContain("shipping; quality");
  });

  it("falls back to empty cells when fields are null", () => {
    const csv = buildAnalysisCsv(buildInput());
    const reviewsHeader = csv.indexOf("INDIVIDUAL REVIEWS");
    const slice = csv.slice(reviewsHeader);
    // Third sample review: rating null, source null, sentiment null, themes []
    expect(slice).toMatch(/"Line one\nline two, with comma",,,,Tom,/);
  });

  it("uses CRLF line endings and 8 columns in the reviews section", () => {
    const csv = buildAnalysisCsv(buildInput());
    expect(csv.includes("\r\n")).toBe(true);
    const reviewsHeader =
      "Review,Rating,Sentiment,Score,Author,Date,Source,Themes";
    expect(csv).toContain(reviewsHeader);
    expect(reviewsHeader.split(",").length).toBe(8);
  });

  it("emits empty placeholders when arrays are empty but keeps section headers", () => {
    const csv = buildAnalysisCsv(
      buildInput({
        analysis: {
          summary: null,
          sentiment_positive: null,
          sentiment_neutral: null,
          sentiment_negative: null,
          sentiment_mixed: null,
          overall_score: null,
          complaints: [],
          praises: [],
          feature_requests: [],
          action_items: [],
          rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
          review_count: 0,
          created_at: "2026-03-28T12:00:00Z",
        },
        reviews: [],
      }),
    );
    expect(csv).toContain("TOP ISSUES");
    expect(csv).toContain(
      "Rank,Issue,Severity,Mentions,Percent,Trend,Recommendation",
    );
    // No rank rows → header is followed by a blank section divider
    expect(csv).toContain("STRENGTHS");
    expect(csv).toContain("Strength,Mentions,Percent,Marketing Tip");
    // Overall Score with null becomes empty
    expect(csv).toContain("Overall Score,\r\n");
    expect(csv).toContain("Reviews Analyzed,0");
  });
});

describe("buildCsvFilename", () => {
  it("slugifies the project name and appends YYYY-MM-DD", () => {
    expect(
      buildCsvFilename("ShopEase Google Reviews", "2026-03-28T12:00:00Z"),
    ).toBe("reviewpulse-shopease-google-reviews-2026-03-28.csv");
  });

  it("collapses non-alphanum to single hyphens and trims edges", () => {
    expect(
      buildCsvFilename("  My  *Cool* Project!! ", "2026-01-05T00:00:00Z"),
    ).toBe("reviewpulse-my-cool-project-2026-01-05.csv");
  });

  it("falls back to 'analysis' when name has no alphanum", () => {
    expect(buildCsvFilename("***", "2026-04-01T00:00:00Z")).toBe(
      "reviewpulse-analysis-2026-04-01.csv",
    );
  });
});
