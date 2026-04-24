// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Plan } from "@/types/database";
import { sampleAnalysisResponse } from "@/test/fixtures/analysis";

interface MockAnthropicResponse {
  id: string;
  type: "message";
  role: "assistant";
  model: string;
  stop_reason: string;
  stop_sequence: null;
  usage: {
    input_tokens: number;
    output_tokens: number;
    cache_creation_input_tokens: number;
    cache_read_input_tokens: number;
  };
  content: Array<{ type: "text"; text: string }>;
}

const { anthropicState } = vi.hoisted(() => ({
  anthropicState: {
    mockCreate: null as unknown as ReturnType<typeof vi.fn>,
  },
}));

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: {
    client: null as unknown,
  },
}));

vi.mock("@anthropic-ai/sdk", () => {
  class MockAnthropic {
    messages: { create: ReturnType<typeof vi.fn> };
    constructor(_opts: unknown) {
      this.messages = { create: anthropicState.mockCreate };
    }
  }
  return { default: MockAnthropic };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseState.client),
}));

import { POST } from "@/app/api/analyze/route";
import { __resetRateLimit } from "@/lib/analysis/rate-limit";

const VALID_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";

interface Scenario {
  user?: { id: string } | null;
  profile?: { id: string; plan: Plan; reviews_used_this_month: number } | null;
  project?: { id: string; user_id: string } | null;
  reviews?: Array<{
    id: string;
    content: string;
    rating: number | null;
    source: string | null;
  }>;
  analysesCountThisMonth?: number;
  analysisInsertError?: unknown;
}

interface Captured {
  analysisInsert: Record<string, unknown> | null;
  reviewUpdates: Array<{ id: string; patch: Record<string, unknown> }>;
  profileUpdates: Array<{ id: string; patch: Record<string, unknown> }>;
}

function makeSupabase(scenario: Scenario) {
  const captured: Captured = {
    analysisInsert: null,
    reviewUpdates: [],
    profileUpdates: [],
  };
  const user = scenario.user === undefined ? { id: "user_1" } : scenario.user;

  type Chain = Record<string, unknown>;

  const fromImpl = (table: string): Chain => {
    if (table === "profiles") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: scenario.profile ?? null,
              error: null,
            }),
          }),
        }),
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, id: string) => {
            captured.profileUpdates.push({ id, patch });
            return { error: null };
          },
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
      const reviews = scenario.reviews ?? [];
      return {
        select: () => {
          const promise = Promise.resolve({ data: reviews, error: null });
          const chain = {
            eq: () => chain,
            in: () => Promise.resolve({ data: reviews, error: null }),
            then: (resolve: (v: unknown) => unknown) => promise.then(resolve),
          };
          return chain;
        },
        update: (patch: Record<string, unknown>) => ({
          eq: async (_col: string, id: string) => {
            captured.reviewUpdates.push({ id, patch });
            return { error: null };
          },
        }),
      };
    }
    if (table === "analyses") {
      return {
        select: () => ({
          eq: () => ({
            gte: async () => ({
              count: scenario.analysesCountThisMonth ?? 0,
              error: null,
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              captured.analysisInsert = row;
              if (scenario.analysisInsertError) {
                return { data: null, error: scenario.analysisInsertError };
              }
              return { data: { id: "ana_new_1" }, error: null };
            },
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    from: vi.fn((t: string) => fromImpl(t)),
  };

  return { client, captured };
}

function anthropicJson(obj: unknown): MockAnthropicResponse {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-test",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 100,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    content: [{ type: "text", text: JSON.stringify(obj) }],
  };
}

function anthropicText(text: string): MockAnthropicResponse {
  return { ...anthropicJson({}), content: [{ type: "text", text }] };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/analyze", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function baseProfile(plan: Plan = "pro", used = 0) {
  return { id: "user_1", plan, reviews_used_this_month: used };
}

function baseProject() {
  return { id: VALID_PROJECT_UUID, user_id: "user_1" };
}

function makeReviews(n: number) {
  return Array.from({ length: n }, (_, i) => {
    const rating = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    return {
      id: `rev_${i + 1}`,
      content: `Review ${i + 1} content.`,
      rating,
      source: "Google" as string | null,
    };
  });
}

beforeEach(() => {
  __resetRateLimit();
  anthropicState.mockCreate = vi
    .fn()
    .mockResolvedValue(anthropicJson(sampleAnalysisResponse));
});

describe("POST /api/analyze", () => {
  it("returns 401 without auth", async () => {
    const { client } = makeSupabase({ user: null });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid body (no project_id)", async () => {
    const { client } = makeSupabase({ profile: baseProfile() });
    supabaseState.client = client;
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for bad project_id", async () => {
    const { client } = makeSupabase({ profile: baseProfile() });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: "not-a-uuid" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for project not belonging to user", async () => {
    const { client } = makeSupabase({
      profile: baseProfile(),
      project: null,
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(404);
  });

  it("returns 403 when free plan limit reached (50 reviews)", async () => {
    const { client } = makeSupabase({
      profile: baseProfile("free", 45),
      project: baseProject(),
      reviews: makeReviews(10),
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when free plan analysis limit reached (3/month)", async () => {
    const { client } = makeSupabase({
      profile: baseProfile("free", 0),
      project: baseProject(),
      reviews: makeReviews(5),
      analysesCountThisMonth: 3,
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(403);
  });

  it("returns 429 when rate limit exceeded", async () => {
    const { client } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    for (let i = 0; i < 10; i++) {
      await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    }
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(429);
  });

  it("selects haiku for free, sonnet for pro", async () => {
    const freeCtx = makeSupabase({
      profile: baseProfile("free", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = freeCtx.client;
    await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    const freeCall = anthropicState.mockCreate.mock.calls[0]?.[0] as {
      model: string;
    };
    expect(freeCall.model).toMatch(/haiku/i);

    anthropicState.mockCreate = vi
      .fn()
      .mockResolvedValue(anthropicJson(sampleAnalysisResponse));
    __resetRateLimit();

    const proCtx = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = proCtx.client;
    await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    const proCall = anthropicState.mockCreate.mock.calls[0]?.[0] as {
      model: string;
    };
    expect(proCall.model).toMatch(/sonnet/i);
  });

  it("saves analysis to database", async () => {
    const { client, captured } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(200);
    expect(captured.analysisInsert).toMatchObject({
      project_id: VALID_PROJECT_UUID,
      review_count: 5,
      summary: sampleAnalysisResponse.summary,
      overall_score: sampleAnalysisResponse.overall_score,
    });
  });

  it("saves reviews with per_review_sentiment", async () => {
    const { client, captured } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(3),
    });
    supabaseState.client = client;
    await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(captured.reviewUpdates.length).toBe(3);
    for (const u of captured.reviewUpdates) {
      const patch = u.patch as {
        sentiment: string;
        sentiment_score: number;
      };
      expect(["positive", "neutral", "negative", "mixed"]).toContain(
        patch.sentiment,
      );
      expect(typeof patch.sentiment_score).toBe("number");
    }
  });

  it("increments reviews_used_this_month", async () => {
    const { client, captured } = makeSupabase({
      profile: baseProfile("pro", 12),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(captured.profileUpdates[0]?.patch).toEqual({
      reviews_used_this_month: 17,
    });
  });

  it("normalizes sentiment percentages to sum to 100", async () => {
    const badSentiment = {
      ...sampleAnalysisResponse,
      sentiment: { positive: 60, neutral: 10, negative: 10, mixed: 10 },
    };
    anthropicState.mockCreate = vi
      .fn()
      .mockResolvedValue(anthropicJson(badSentiment));
    const { client, captured } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(200);
    const insert = captured.analysisInsert as {
      sentiment_positive: number;
      sentiment_neutral: number;
      sentiment_negative: number;
      sentiment_mixed: number;
    };
    expect(
      insert.sentiment_positive +
        insert.sentiment_neutral +
        insert.sentiment_negative +
        insert.sentiment_mixed,
    ).toBe(100);
  });

  it("retries once on invalid JSON from Claude", async () => {
    anthropicState.mockCreate = vi
      .fn()
      .mockResolvedValueOnce(anthropicText("definitely not json"))
      .mockResolvedValueOnce(anthropicJson(sampleAnalysisResponse));
    const { client } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(anthropicState.mockCreate).toHaveBeenCalledTimes(2);
    expect(res.status).toBe(200);
  });

  it("returns 500 on retry failure with user-friendly message", async () => {
    anthropicState.mockCreate = vi
      .fn()
      .mockResolvedValue(anthropicText("still not json"));
    const { client } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    const res = await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/try again/i);
    expect(body.error).not.toMatch(/JSON|parse|schema|stack/i);
  });

  it("prompt caching is configured (cache_control present)", async () => {
    const { client } = makeSupabase({
      profile: baseProfile("pro", 0),
      project: baseProject(),
      reviews: makeReviews(5),
    });
    supabaseState.client = client;
    await POST(makeRequest({ project_id: VALID_PROJECT_UUID }));
    const args = anthropicState.mockCreate.mock.calls[0]?.[0] as {
      system: Array<{ type: string; cache_control?: { type: string } }>;
    };
    expect(Array.isArray(args.system)).toBe(true);
    expect(args.system[0]).toMatchObject({
      type: "text",
      cache_control: { type: "ephemeral" },
    });
  });
});
