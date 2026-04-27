// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Plan } from "@/types/database";
import { sampleAnalysisResponse } from "@/test/fixtures/analysis";
import type {
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

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

import { POST } from "@/app/api/analyze/compare/route";

const VALID_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";

interface YoursAnalysis {
  overall_score: number;
  complaints: ComplaintItem[];
  praises: MentionItem[];
}

interface Scenario {
  user?: { id: string } | null;
  profile?: { plan: Plan } | null;
  project?: { id: string } | null;
  yoursAnalysis?: YoursAnalysis | null;
}

function makeSupabase(scenario: Scenario) {
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
    if (table === "analyses") {
      return {
        select: () => ({
          eq: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => ({
                  data: scenario.yoursAnalysis ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };

  let rateLimitCalls = 0;

  const rpc = vi.fn(
    async (
      fn: string,
      params: Record<string, unknown>,
    ): Promise<{ data: unknown; error: unknown }> => {
      if (fn === "check_rate_limit") {
        rateLimitCalls++;
        const max = (params.p_max as number) ?? 10;
        if (rateLimitCalls > max) {
          return {
            data: { ok: false, retry_after_sec: 30 },
            error: null,
          };
        }
        return {
          data: { ok: true, remaining: max - rateLimitCalls },
          error: null,
        };
      }
      if (fn === "consume_review_quota") {
        return { data: { ok: true }, error: null };
      }
      if (fn === "refund_review_quota") {
        return { data: null, error: null };
      }
      return { data: null, error: null };
    },
  );

  const client = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user }, error: null })),
    },
    from: vi.fn((t: string) => fromImpl(t)),
    rpc,
  };

  return { client };
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

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/analyze/compare", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const competitorReviews = [
  { content: "Their product was decent overall." },
  { content: "Shipping took forever." },
  { content: "Pretty good prices." },
];

function defaultBody(overrides: Record<string, unknown> = {}) {
  return {
    projectId: VALID_PROJECT_UUID,
    competitorName: "Acme Co",
    competitorReviews,
    ...overrides,
  };
}

beforeEach(() => {
  anthropicState.mockCreate = vi
    .fn()
    .mockResolvedValue(anthropicJson(sampleAnalysisResponse));
});

describe("POST /api/analyze/compare", () => {
  it("returns 403 for free plan", async () => {
    const { client } = makeSupabase({ profile: { plan: "free" } });
    supabaseState.client = client;
    const res = await POST(makeRequest(defaultBody()));
    expect(res.status).toBe(403);
  });

  it("returns comparison with both analyses", async () => {
    const { client } = makeSupabase({
      profile: { plan: "pro" },
      project: { id: VALID_PROJECT_UUID },
      yoursAnalysis: {
        overall_score: 80,
        complaints: [
          { text: "Buggy checkout", count: 4, severity: "high", examples: [] },
        ],
        praises: [
          { text: "Great UX", count: 10, examples: [] },
        ],
      },
    });
    supabaseState.client = client;

    const res = await POST(makeRequest(defaultBody()));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      yours: { score: number; topIssues: string[]; strengths: string[] };
      theirs: { score: number; topIssues: string[]; strengths: string[] };
      comparison: { aheadIn: string[]; behindIn: string[] };
    };

    expect(typeof body.yours.score).toBe("number");
    expect(Array.isArray(body.yours.topIssues)).toBe(true);
    expect(Array.isArray(body.yours.strengths)).toBe(true);
    expect(body.yours.strengths).toContain("Great UX");
    expect(body.yours.topIssues).toContain("Buggy checkout");

    expect(typeof body.theirs.score).toBe("number");
    expect(Array.isArray(body.theirs.topIssues)).toBe(true);
    expect(Array.isArray(body.theirs.strengths)).toBe(true);

    expect(Array.isArray(body.comparison.aheadIn)).toBe(true);
    expect(Array.isArray(body.comparison.behindIn)).toBe(true);
  });

  it("aheadIn contains categories where yours > theirs", async () => {
    const competitor = {
      ...sampleAnalysisResponse,
      overall_score: 60,
      praises: [{ text: "Friendly support", count: 3, examples: [] }],
    };
    anthropicState.mockCreate = vi
      .fn()
      .mockResolvedValue(anthropicJson(competitor));

    const { client } = makeSupabase({
      profile: { plan: "pro" },
      project: { id: VALID_PROJECT_UUID },
      yoursAnalysis: {
        overall_score: 90,
        complaints: [],
        praises: [
          { text: "Fast shipping", count: 10, examples: [] },
          { text: "Friendly support", count: 5, examples: [] },
        ],
      },
    });
    supabaseState.client = client;

    const res = await POST(makeRequest(defaultBody()));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      comparison: { aheadIn: string[]; behindIn: string[] };
    };

    expect(
      body.comparison.aheadIn.some((s) => /overall sentiment/i.test(s)),
    ).toBe(true);
    expect(body.comparison.aheadIn).toContain("Fast shipping");
    expect(body.comparison.aheadIn).not.toContain("Friendly support");
    expect(body.comparison.behindIn).not.toContain("Fast shipping");
  });

  it("behindIn contains categories where yours < theirs", async () => {
    const competitor = {
      ...sampleAnalysisResponse,
      overall_score: 90,
      praises: [
        { text: "Better prices", count: 8, examples: [] },
        { text: "Wider selection", count: 4, examples: [] },
      ],
    };
    anthropicState.mockCreate = vi
      .fn()
      .mockResolvedValue(anthropicJson(competitor));

    const { client } = makeSupabase({
      profile: { plan: "pro" },
      project: { id: VALID_PROJECT_UUID },
      yoursAnalysis: {
        overall_score: 60,
        complaints: [],
        praises: [],
      },
    });
    supabaseState.client = client;

    const res = await POST(makeRequest(defaultBody()));
    expect(res.status).toBe(200);

    const body = (await res.json()) as {
      comparison: { aheadIn: string[]; behindIn: string[] };
    };

    expect(
      body.comparison.behindIn.some((s) => /overall sentiment/i.test(s)),
    ).toBe(true);
    expect(body.comparison.behindIn).toContain("Better prices");
    expect(body.comparison.behindIn).toContain("Wider selection");
    expect(body.comparison.aheadIn).not.toContain("Better prices");
  });
});
