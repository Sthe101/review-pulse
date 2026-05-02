// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Plan } from "@/types/database";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: { client: null as unknown },
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

interface Scenario {
  user?: { id: string } | null;
  plan?: Plan | null;
  analysis?: AnalysisFixture | null;
  project?: ProjectFixture | null;
}

function makeSupabase(scenario: Scenario) {
  const user = scenario.user === undefined ? { id: USER_ID } : scenario.user;
  type Chain = Record<string, unknown>;

  const fromImpl = (table: string): Chain => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data:
                scenario.plan === null
                  ? null
                  : { plan: scenario.plan ?? "free" },
              error: null,
            }),
          }),
        }),
      };
    }
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
            order: async () => ({ data: [], error: null }),
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

function makeAnalysis(): AnalysisFixture {
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
  };
}

function makeProject(): ProjectFixture {
  return {
    id: PROJECT_ID,
    user_id: USER_ID,
    name: "ShopEase Google Reviews",
    industry: "E-commerce",
    review_source: "Google Business",
  };
}

function makeRequest(): NextRequest {
  return new NextRequest(
    `http://localhost:3000/api/export/${ANALYSIS_ID}?format=pdf`,
    { method: "POST" },
  );
}

function makeParams() {
  return { params: Promise.resolve({ analysisId: ANALYSIS_ID }) };
}

function proPathClient() {
  return makeSupabase({
    plan: "pro",
    analysis: makeAnalysis(),
    project: makeProject(),
  });
}

beforeEach(() => {
  supabaseState.client = null;
});

describe("POST /api/export/[analysisId]?format=pdf", () => {
  it("returns 401 without auth", async () => {
    supabaseState.client = makeSupabase({ user: null });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(401);
  });

  it("returns 403 for free plan with upgrade message", async () => {
    supabaseState.client = makeSupabase({
      plan: "free",
      analysis: makeAnalysis(),
      project: makeProject(),
    });
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({
      error: "PDF export requires Pro plan",
      upgradeUrl: "/billing",
    });
  });

  it("returns PDF with Content-Disposition attachment header", async () => {
    supabaseState.client = proPathClient();
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    const dispo = res.headers.get("content-disposition") ?? "";
    expect(dispo).toMatch(/^attachment;\s*filename=/i);
    expect(dispo).toMatch(/\.pdf"?$/i);

    const buf = new Uint8Array(await res.arrayBuffer());
    // Sanity: real PDF body, not the JSON 403 we return for free plans.
    expect(buf[0]).toBe(0x25); // %
    expect(buf[1]).toBe(0x50); // P
    expect(buf[2]).toBe(0x44); // D
    expect(buf[3]).toBe(0x46); // F
    expect(buf[4]).toBe(0x2d); // -
    expect(buf.byteLength).toBeGreaterThan(1024);
  }, 30_000);

  it("returns content-type application/pdf", async () => {
    supabaseState.client = proPathClient();
    const res = await POST(makeRequest(), makeParams());
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("application/pdf");
  }, 30_000);

  it("filename format: reviewpulse-report-[date].pdf", async () => {
    supabaseState.client = proPathClient();
    const res = await POST(makeRequest(), makeParams());
    const dispo = res.headers.get("content-disposition") ?? "";
    const match = dispo.match(/filename="([^"]+)"/);
    expect(match).not.toBeNull();
    const filename = match?.[1] ?? "";
    expect(filename).toMatch(
      /^reviewpulse-report-\d{4}-\d{2}-\d{2}\.pdf$/,
    );
  }, 30_000);
});
