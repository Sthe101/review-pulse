// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    client: null as unknown,
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseState.client),
}));

import { POST } from "@/app/api/export/[analysisId]/route";

const ANALYSIS_ID = "550e8400-e29b-41d4-a716-446655440000";
const PROJECT_ID = "660e8400-e29b-41d4-a716-446655440001";
const USER_ID = "user_1";

interface AnalysisFixture {
  id: string;
  project_id: string;
  summary: string | null;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  overall_score: number | null;
  complaints: unknown;
  praises: unknown;
  feature_requests: unknown;
  action_items: unknown;
  rating_distribution: unknown;
  review_count: number;
  created_at: string;
}

interface ProjectFixture {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  review_source: string;
}

interface ReviewFixture {
  content: string;
  rating: number | null;
  source: string | null;
  author: string | null;
  review_date: string | null;
  created_at: string;
  sentiment: string | null;
  sentiment_score: number | null;
  themes: string[] | null;
}

interface Scenario {
  user?: { id: string } | null;
  analysis?: AnalysisFixture | null;
  project?: ProjectFixture | null;
  reviews?: ReviewFixture[];
}

function makeSupabase(scenario: Scenario) {
  const user = scenario.user === undefined ? { id: USER_ID } : scenario.user;
  type Chain = Record<string, unknown>;

  const fromImpl = (table: string): Chain => {
    if (table === "analyses") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: scenario.analysis ?? null,
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === "projects") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: scenario.project ?? null,
                error: null,
              }),
            }),
          }),
        }),
      };
    }
    if (table === "reviews") {
      return {
        select: () => ({
          eq: () => ({
            order: async () => ({
              data: scenario.reviews ?? [],
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };

  return {
    auth: { getUser: vi.fn(async () => ({ data: { user }, error: null })) },
    from: vi.fn((t: string) => fromImpl(t)),
  };
}

function makeAnalysis(overrides: Partial<AnalysisFixture> = {}): AnalysisFixture {
  return {
    id: ANALYSIS_ID,
    project_id: PROJECT_ID,
    summary: "Customers love quality but flag slow support.",
    sentiment_positive: 58,
    sentiment_neutral: 12,
    sentiment_negative: 22,
    sentiment_mixed: 8,
    overall_score: 74,
    complaints: [
      { text: "Slow support", count: 14, severity: "high", examples: [] },
    ],
    praises: [{ text: "Fast shipping", count: 18, examples: [] }],
    feature_requests: [{ text: "Dark mode", count: 4, examples: [] }],
    action_items: [
      {
        title: "Reduce response time",
        description: "Cut median to 4h.",
        priority: "high",
      },
    ],
    rating_distribution: { "1": 6, "2": 4, "3": 5, "4": 8, "5": 27 },
    review_count: 50,
    created_at: "2026-03-28T12:00:00Z",
    ...overrides,
  };
}

function makeProject(overrides: Partial<ProjectFixture> = {}): ProjectFixture {
  return {
    id: PROJECT_ID,
    user_id: USER_ID,
    name: "ShopEase Google Reviews",
    industry: "E-commerce",
    review_source: "Google Business",
    ...overrides,
  };
}

function makeRequest(format?: string): NextRequest {
  const qs = format !== undefined ? `?format=${format}` : "";
  return new NextRequest(
    `http://localhost:3000/api/export/${ANALYSIS_ID}${qs}`,
    { method: "POST" },
  );
}

function makeParams(id = ANALYSIS_ID) {
  return { params: Promise.resolve({ analysisId: id }) };
}

beforeEach(() => {
  supabaseState.client = null;
});

function happyPathClient() {
  return makeSupabase({
    analysis: makeAnalysis(),
    project: makeProject(),
    reviews: [
      {
        content: "Great product!",
        rating: 5,
        source: "Google",
        author: "Sarah",
        review_date: "2026-03-28",
        created_at: "2026-03-28T10:00:00Z",
        sentiment: "positive",
        sentiment_score: 0.92,
        themes: ["quality"],
      },
      {
        content: "Item arrived damaged.",
        rating: 1,
        source: "Trustpilot",
        author: "Mike",
        review_date: "2026-03-25",
        created_at: "2026-03-25T10:00:00Z",
        sentiment: "negative",
        sentiment_score: 0.12,
        themes: ["quality"],
      },
    ],
  });
}

describe("POST /api/export/[analysisId]?format=csv", () => {
  it("returns 401 without auth", async () => {
    supabaseState.client = makeSupabase({ user: null });
    const res = await POST(makeRequest("csv"), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 404 for analysis not belonging to user", async () => {
    supabaseState.client = makeSupabase({
      analysis: makeAnalysis(),
      project: null, // user_id filter strips the row
    });
    const res = await POST(makeRequest("csv"), makeParams());
    expect(res.status).toBe(404);
  });

  it("returns CSV with Content-Disposition attachment header", async () => {
    supabaseState.client = happyPathClient();
    const res = await POST(makeRequest("csv"), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/text\/csv/i);
    const dispo = res.headers.get("content-disposition") ?? "";
    expect(dispo).toMatch(/^attachment;\s*filename=/i);
    expect(dispo).toMatch(/\.csv"?$/);
  });

  it("CSV contains report metadata section", async () => {
    supabaseState.client = happyPathClient();
    const res = await POST(makeRequest("csv"), makeParams());
    const body = await res.text();
    expect(body).toContain("ReviewPulse Analysis Report");
    expect(body).toContain("Project,ShopEase Google Reviews");
    expect(body).toContain("Industry,E-commerce");
    expect(body).toContain("Source,Google Business");
    expect(body).toContain("Reviews Analyzed,50");
    expect(body).toContain("Overall Score,74/100");
  });

  it("CSV contains sentiment breakdown", async () => {
    supabaseState.client = happyPathClient();
    const res = await POST(makeRequest("csv"), makeParams());
    const body = await res.text();
    expect(body).toContain("SENTIMENT BREAKDOWN");
    expect(body).toContain("Category,Percentage");
    expect(body).toContain("Positive,58%");
    expect(body).toContain("Neutral,12%");
    expect(body).toContain("Negative,22%");
    expect(body).toContain("Mixed,8%");
  });

  it("CSV contains individual reviews with sentiment", async () => {
    supabaseState.client = happyPathClient();
    const res = await POST(makeRequest("csv"), makeParams());
    const body = await res.text();
    expect(body).toContain("INDIVIDUAL REVIEWS");
    expect(body).toContain(
      "Review,Rating,Sentiment,Score,Author,Date,Source,Themes",
    );
    expect(body).toContain("Great product!,5/5,positive,0.92,Sarah");
    expect(body).toContain(
      "Item arrived damaged.,1/5,negative,0.12,Mike",
    );
  });

  it("filename format: reviewpulse-[project]-[date].csv", async () => {
    supabaseState.client = happyPathClient();
    const res = await POST(makeRequest("csv"), makeParams());
    const dispo = res.headers.get("content-disposition") ?? "";
    const match = dispo.match(/filename="([^"]+)"/);
    expect(match).not.toBeNull();
    const filename = match?.[1] ?? "";
    expect(filename).toMatch(
      /^reviewpulse-shopease-google-reviews-\d{4}-\d{2}-\d{2}\.csv$/,
    );
  });
});
