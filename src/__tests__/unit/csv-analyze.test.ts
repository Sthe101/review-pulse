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

import { POST } from "@/app/api/analyze/csv/route";
import { __resetRateLimit } from "@/lib/analysis/rate-limit";

const VALID_PROJECT_UUID = "550e8400-e29b-41d4-a716-446655440000";

interface Scenario {
  user?: { id: string } | null;
  profile?: { id: string; plan: Plan; reviews_used_this_month: number } | null;
  project?: { id: string; user_id: string } | null;
  analysesCountThisMonth?: number;
}

interface Captured {
  reviewInserts: Array<Record<string, unknown>>;
  analysisInsert: Record<string, unknown> | null;
  reviewUpdates: Array<{ id: string; patch: Record<string, unknown> }>;
  profileUpdates: Array<{ id: string; patch: Record<string, unknown> }>;
}

function makeSupabase(scenario: Scenario) {
  const captured: Captured = {
    reviewInserts: [],
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
      return {
        insert: (rows: unknown) => {
          const arr = Array.isArray(rows)
            ? (rows as Record<string, unknown>[])
            : [rows as Record<string, unknown>];
          captured.reviewInserts = arr;
          return {
            select: async () => {
              const withIds = arr.map((r, i) => ({
                id: `rev_new_${i + 1}`,
                content: r.content,
                rating: r.rating,
                source: r.source,
              }));
              return { data: withIds, error: null };
            },
          };
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

function baseProfile(plan: Plan = "pro", used = 0) {
  return { id: "user_1", plan, reviews_used_this_month: used };
}

function baseProject() {
  return { id: VALID_PROJECT_UUID, user_id: "user_1" };
}

function makeCsvRequest(
  csv: string | BlobPart,
  projectId: string = VALID_PROJECT_UUID,
  filename = "reviews.csv",
): NextRequest {
  const form = new FormData();
  const file = new File([csv], filename, { type: "text/csv" });
  form.append("file", file);
  form.append("project_id", projectId);
  return new NextRequest("http://localhost:3000/api/analyze/csv", {
    method: "POST",
    body: form,
  });
}

function baseScenario() {
  return makeSupabase({
    profile: baseProfile("pro", 0),
    project: baseProject(),
  });
}

beforeEach(() => {
  __resetRateLimit();
  anthropicState.mockCreate = vi
    .fn()
    .mockResolvedValue(anthropicJson(sampleAnalysisResponse));
});

describe("POST /api/analyze/csv", () => {
  it("parses CSV with 'review' header → maps to content", async () => {
    const csv = `review\n"Great product, love it!"\nTerrible experience.\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(2);
    expect(captured.reviewInserts[0]?.content).toBe("Great product, love it!");
    expect(captured.reviewInserts[1]?.content).toBe("Terrible experience.");
  });

  it("parses CSV with 'text' header → maps to content", async () => {
    const csv = `text\nThis is the review body.\nAnother one here.\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(2);
    expect(captured.reviewInserts[0]?.content).toBe("This is the review body.");
    expect(captured.reviewInserts[1]?.content).toBe("Another one here.");
  });

  it("parses CSV with 'rating' header → maps to rating", async () => {
    const csv = `review,rating\nGreat product!,5\nBad experience.,1\nOkay I guess.,3\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(3);
    expect(captured.reviewInserts[0]?.rating).toBe(5);
    expect(captured.reviewInserts[1]?.rating).toBe(1);
    expect(captured.reviewInserts[2]?.rating).toBe(3);
  });

  it("parses CSV with 'author' header → maps to author", async () => {
    const csv = `review,author\nLoved it.,Jane Doe\nNot my thing.,John Smith\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(2);
    expect(captured.reviewInserts[0]?.author).toBe("Jane Doe");
    expect(captured.reviewInserts[1]?.author).toBe("John Smith");
  });

  it("returns 400 when no content-like column found", async () => {
    const csv = `foo,bar,baz\n1,2,3\n4,5,6\n`;
    const { client } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/content|review|text/i);
  });

  it("returns 400 for file > 5MB", async () => {
    // 5MB + a bit — size is checked before reading
    const big = new Uint8Array(5 * 1024 * 1024 + 100);
    const { client } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(big));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/5\s*MB|too large/i);
  });

  it("handles CSV with extra columns gracefully (ignores them)", async () => {
    const csv = `review,rating,zipcode,internal_id\nGood stuff.,4,12345,abc-999\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(1);
    const row = captured.reviewInserts[0] as Record<string, unknown>;
    expect(row.content).toBe("Good stuff.");
    expect(row.rating).toBe(4);
    expect(row).not.toHaveProperty("zipcode");
    expect(row).not.toHaveProperty("internal_id");
  });

  it("handles CSV with missing optional columns (rating, author)", async () => {
    const csv = `review\nJust a review body.\nAnother body here.\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(2);
    const row0 = captured.reviewInserts[0] as Record<string, unknown>;
    expect(row0.content).toBe("Just a review body.");
    expect(row0.rating).toBeNull();
    expect(row0.author).toBeNull();
    expect(row0.source).toBeNull();
    expect(row0.review_date).toBeNull();
  });

  it("strips whitespace-only rows", async () => {
    const csv = `review\nValid one\n   \nAnother valid\n`;
    const { client, captured } = baseScenario();
    supabaseState.client = client;

    const res = await POST(makeCsvRequest(csv));
    expect(res.status).toBe(200);
    expect(captured.reviewInserts.length).toBe(2);
    expect(captured.reviewInserts[0]?.content).toBe("Valid one");
    expect(captured.reviewInserts[1]?.content).toBe("Another valid");
  });
});
