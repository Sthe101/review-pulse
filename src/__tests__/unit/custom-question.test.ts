// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import type { Plan } from "@/types/database";

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

import { POST } from "@/app/api/analyze/question/route";

const VALID_ANALYSIS_UUID = "550e8400-e29b-41d4-a716-446655440000";

interface Scenario {
  user?: { id: string } | null;
  profile?: { plan: Plan } | null;
  analysis?: { id: string; project_id: string } | null;
  project?: { id: string } | null;
  reviews?: Array<{
    id: string;
    content: string;
    rating: number | null;
    source: string | null;
  }>;
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
          eq: async () => ({
            data: scenario.reviews ?? [],
            error: null,
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
        const max = (params.p_max as number) ?? 5;
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

function anthropicText(text: string): MockAnthropicResponse {
  return {
    id: "msg_test",
    type: "message",
    role: "assistant",
    model: "claude-test",
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
    content: [{ type: "text", text }],
  };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/analyze/question", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function happyScenario(): Scenario {
  return {
    profile: { plan: "pro" },
    analysis: { id: VALID_ANALYSIS_UUID, project_id: "proj_1" },
    project: { id: "proj_1" },
    reviews: [
      { id: "r1", content: "Loved it.", rating: 5, source: "Google" },
      { id: "r2", content: "Decent.", rating: 3, source: "Yelp" },
    ],
  };
}

beforeEach(() => {
  anthropicState.mockCreate = vi
    .fn()
    .mockResolvedValue(
      anthropicText(
        "Most reviewers found the product reliable. A handful flagged shipping delays. Overall sentiment is positive.",
      ),
    );
});

describe("POST /api/analyze/question", () => {
  it("returns 401 without auth", async () => {
    const { client } = makeSupabase({ user: null });
    supabaseState.client = client;
    const res = await POST(
      makeRequest({ analysisId: VALID_ANALYSIS_UUID, question: "Hi" }),
    );
    expect(res.status).toBe(401);
  });

  it("returns 403 for free plan", async () => {
    const { client } = makeSupabase({ profile: { plan: "free" } });
    supabaseState.client = client;
    const res = await POST(
      makeRequest({ analysisId: VALID_ANALYSIS_UUID, question: "Hi" }),
    );
    expect(res.status).toBe(403);
  });

  it("returns 400 for empty question", async () => {
    const { client } = makeSupabase(happyScenario());
    supabaseState.client = client;
    const res = await POST(
      makeRequest({ analysisId: VALID_ANALYSIS_UUID, question: "" }),
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for question > 500 chars", async () => {
    const long = "x".repeat(501);
    const { client } = makeSupabase(happyScenario());
    supabaseState.client = client;
    const res = await POST(
      makeRequest({ analysisId: VALID_ANALYSIS_UUID, question: long }),
    );
    expect(res.status).toBe(400);
  });

  it("returns valid answer string", async () => {
    const { client } = makeSupabase(happyScenario());
    supabaseState.client = client;
    const res = await POST(
      makeRequest({
        analysisId: VALID_ANALYSIS_UUID,
        question: "What is the overall sentiment?",
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { answer: string };
    expect(typeof body.answer).toBe("string");
    expect(body.answer.length).toBeGreaterThan(0);
  });

  it("rate limiting works (429 on 6th request)", async () => {
    const { client } = makeSupabase(happyScenario());
    supabaseState.client = client;
    for (let i = 0; i < 5; i++) {
      const r = await POST(
        makeRequest({ analysisId: VALID_ANALYSIS_UUID, question: "Q" }),
      );
      expect(r.status).toBe(200);
    }
    const res = await POST(
      makeRequest({ analysisId: VALID_ANALYSIS_UUID, question: "Q" }),
    );
    expect(res.status).toBe(429);
  });
});
