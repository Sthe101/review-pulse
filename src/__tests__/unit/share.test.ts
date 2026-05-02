// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { supabaseState } = vi.hoisted(() => ({
  supabaseState: { client: null as unknown },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => supabaseState.client),
}));

const { notFoundMock } = vi.hoisted(() => ({
  notFoundMock: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

vi.mock("next/navigation", () => ({
  notFound: notFoundMock,
}));

import { POST } from "@/app/api/share/route";
import { DELETE } from "@/app/api/share/[token]/route";
import PublicReportPage from "@/app/report/[token]/page";

const ANALYSIS_ID = "550e8400-e29b-41d4-a716-446655440000";
const PROJECT_ID = "660e8400-e29b-41d4-a716-446655440001";
const USER_ID = "user_1";
// All share tokens must be 16–64 hex chars to satisfy TOKEN_RE in the route
// and the public page; `gen_random_bytes(16)::hex` produces 32-char strings.
const REUSED_TOKEN = "11111111111111111111111111111111";
const NEW_TOKEN = "22222222222222222222222222222222";
const ACTIVE_TOKEN = "abcdef0123456789abcdef0123456789";
const DEAD_TOKEN = "0123456789abcdef0123456789abcdef";

interface ShareRow {
  id: string;
  share_token: string;
  analysis_id?: string;
  view_count?: number;
  is_active?: boolean;
}

interface AnalysisRow {
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

interface ProjectRow {
  id: string;
  user_id?: string;
  name: string;
  industry?: string;
}

interface CreateScenario {
  user?: { id: string } | null;
  analysis?: { id: string; project_id: string } | null;
  project?: { id: string; user_id: string } | null;
  existingShare?: ShareRow | null;
  insertResult?: { data: ShareRow | null; error: { message?: string } | null };
}

interface DeleteScenario {
  user?: { id: string } | null;
  found?: { id: string } | null;
  updateError?: { message?: string } | null;
}

interface PublicScenario {
  share?: ShareRow | null;
  analysis?: AnalysisRow | null;
  project?: ProjectRow | null;
  rpcImpl?: (
    fn: string,
    params: Record<string, unknown>,
  ) => { data: unknown; error: unknown };
}

interface CreateCaptured {
  insert: Record<string, unknown> | null;
}

interface DeleteCaptured {
  patch: Record<string, unknown> | null;
  id: string | null;
}

interface PublicCaptured {
  rpcCalls: Array<{ fn: string; params: Record<string, unknown> }>;
  shareSelectArgs: Array<[string, string | boolean]>;
}

function makeCreateClient(scenario: CreateScenario) {
  const captured: CreateCaptured = { insert: null };
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
    if (table === "shared_reports") {
      return {
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: scenario.existingShare ?? null,
                  error: null,
                }),
              }),
            }),
          }),
        }),
        insert: (row: Record<string, unknown>) => ({
          select: () => ({
            single: async () => {
              captured.insert = row;
              return (
                scenario.insertResult ?? {
                  data: { id: "share_new", share_token: NEW_TOKEN },
                  error: null,
                }
              );
            },
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user }, error: null })),
      },
      from: vi.fn((t: string) => fromImpl(t)),
    },
    captured,
  };
}

function makeDeleteClient(scenario: DeleteScenario) {
  const captured: DeleteCaptured = { patch: null, id: null };
  const user = scenario.user === undefined ? { id: USER_ID } : scenario.user;

  return {
    client: {
      auth: {
        getUser: vi.fn(async () => ({ data: { user }, error: null })),
      },
      from: vi.fn((table: string) => {
        if (table !== "shared_reports") {
          throw new Error(`unexpected table: ${table}`);
        }
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: scenario.found ?? null,
                  error: null,
                }),
              }),
            }),
          }),
          update: (patch: Record<string, unknown>) => ({
            eq: async (_col: string, val: string) => {
              captured.patch = patch;
              captured.id = val;
              return { error: scenario.updateError ?? null };
            },
          }),
        };
      }),
    },
    captured,
  };
}

function makePublicClient(scenario: PublicScenario) {
  const captured: PublicCaptured = { rpcCalls: [], shareSelectArgs: [] };

  const rpcDefault = () => ({ data: true, error: null });

  const fromImpl = (table: string) => {
    if (table === "shared_reports") {
      return {
        select: () => ({
          eq: (col: string, val: string | boolean) => {
            captured.shareSelectArgs.push([col, val]);
            return {
              eq: (col2: string, val2: string | boolean) => {
                captured.shareSelectArgs.push([col2, val2]);
                return {
                  maybeSingle: async () => ({
                    data: scenario.share ?? null,
                    error: null,
                  }),
                };
              },
            };
          },
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
            maybeSingle: async () => ({
              data: scenario.project ?? null,
              error: null,
            }),
          }),
        }),
      };
    }
    throw new Error(`unexpected table: ${table}`);
  };

  return {
    client: {
      from: vi.fn((t: string) => fromImpl(t)),
      rpc: vi.fn((fn: string, params: Record<string, unknown>) => {
        captured.rpcCalls.push({ fn, params });
        return Promise.resolve(
          scenario.rpcImpl ? scenario.rpcImpl(fn, params) : rpcDefault(),
        );
      }),
    },
    captured,
  };
}

function postShareReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/share", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function deleteShareReq() {
  return new Request(`http://localhost:3000/api/share/${ACTIVE_TOKEN}`, {
    method: "DELETE",
  });
}

function deleteParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

function pageParams(token: string) {
  return { params: Promise.resolve({ token }) };
}

function makeAnalysisRow(id = ANALYSIS_ID): AnalysisRow {
  return {
    id,
    project_id: PROJECT_ID,
    summary: "Customers love quality but flag slow support.",
    sentiment_positive: 58,
    sentiment_neutral: 12,
    sentiment_negative: 22,
    sentiment_mixed: 8,
    overall_score: 74,
    complaints: [],
    praises: [],
    feature_requests: [],
    action_items: [],
    rating_distribution: { "1": 0, "2": 0, "3": 0, "4": 0, "5": 0 },
    review_count: 50,
    created_at: "2026-03-28T12:00:00Z",
  };
}

beforeEach(() => {
  supabaseState.client = null;
  notFoundMock.mockClear();
  delete process.env.NEXT_PUBLIC_APP_URL;
});

describe("share flow", () => {
  it("creating share returns unique token", async () => {
    const { client, captured } = makeCreateClient({
      analysis: { id: ANALYSIS_ID, project_id: PROJECT_ID },
      project: { id: PROJECT_ID, user_id: USER_ID },
      existingShare: null,
    });
    supabaseState.client = client;

    const res = await POST(postShareReq({ analysis_id: ANALYSIS_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.token).toBe("string");
    expect(body.token).toBe(NEW_TOKEN);
    expect(body.url).toBe(`http://localhost:3000/report/${NEW_TOKEN}`);
    expect(captured.insert).toMatchObject({
      user_id: USER_ID,
      analysis_id: ANALYSIS_ID,
      is_active: true,
    });
    // The DB-level UNIQUE constraint on share_token guarantees uniqueness;
    // here we just confirm the route did NOT supply a token (lets the DB
    // generate one via gen_random_bytes in the column default).
    expect(
      Object.prototype.hasOwnProperty.call(
        captured.insert ?? {},
        "share_token",
      ),
    ).toBe(false);
  });

  it("creating share for same analysis reuses existing token", async () => {
    const { client, captured } = makeCreateClient({
      analysis: { id: ANALYSIS_ID, project_id: PROJECT_ID },
      project: { id: PROJECT_ID, user_id: USER_ID },
      existingShare: { id: "share_existing", share_token: REUSED_TOKEN },
    });
    supabaseState.client = client;

    const res = await POST(postShareReq({ analysis_id: ANALYSIS_ID }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.token).toBe(REUSED_TOKEN);
    expect(body.url).toBe(`http://localhost:3000/report/${REUSED_TOKEN}`);
    expect(captured.insert).toBeNull();
  });

  it("public page fetches analysis by token", async () => {
    const { client, captured } = makePublicClient({
      share: {
        id: "share_x",
        share_token: ACTIVE_TOKEN,
        analysis_id: ANALYSIS_ID,
        view_count: 0,
        is_active: true,
      },
      analysis: makeAnalysisRow(),
      project: {
        id: PROJECT_ID,
        name: "ShopEase Google Reviews",
        industry: "E-commerce",
      },
    });
    supabaseState.client = client;

    const result = await PublicReportPage(pageParams(ACTIVE_TOKEN));
    // Page returns a JSX tree (no throw == found). The query was filtered
    // by share_token and is_active=true.
    expect(notFoundMock).not.toHaveBeenCalled();
    expect(result).toBeTruthy();
    const tokenFilter = captured.shareSelectArgs.find(
      ([col]) => col === "share_token",
    );
    expect(tokenFilter?.[1]).toBe(ACTIVE_TOKEN);
    const activeFilter = captured.shareSelectArgs.find(
      ([col]) => col === "is_active",
    );
    expect(activeFilter?.[1]).toBe(true);
  });

  it("inactive token → 404", async () => {
    // RLS public-read policy is `is_active = true`, so an inactive (or
    // missing) row resolves to null and the page calls notFound().
    const { client } = makePublicClient({
      share: null,
      analysis: null,
      project: null,
    });
    supabaseState.client = client;

    await expect(PublicReportPage(pageParams(DEAD_TOKEN))).rejects.toThrow(
      /NEXT_NOT_FOUND/,
    );
    expect(notFoundMock).toHaveBeenCalledTimes(1);
  });

  it("view_count increments on each visit", async () => {
    const { client, captured } = makePublicClient({
      share: {
        id: "share_x",
        share_token: ACTIVE_TOKEN,
        analysis_id: ANALYSIS_ID,
        view_count: 0,
        is_active: true,
      },
      analysis: makeAnalysisRow(),
      project: { id: PROJECT_ID, name: "ShopEase", industry: "E-commerce" },
    });
    supabaseState.client = client;

    await PublicReportPage(pageParams(ACTIVE_TOKEN));
    await PublicReportPage(pageParams(ACTIVE_TOKEN));
    await PublicReportPage(pageParams(ACTIVE_TOKEN));

    const incrementCalls = captured.rpcCalls.filter(
      (c) => c.fn === "increment_share_view",
    );
    expect(incrementCalls).toHaveLength(3);
    for (const call of incrementCalls) {
      expect(call.params).toEqual({ p_token: ACTIVE_TOKEN });
    }
  });

  it("deactivate sets is_active = false", async () => {
    const { client, captured } = makeDeleteClient({
      found: { id: "share_1" },
    });
    supabaseState.client = client;

    const res = await DELETE(deleteShareReq(), deleteParams(ACTIVE_TOKEN));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
    expect(captured.patch).toEqual({ is_active: false });
    expect(captured.id).toBe("share_1");
  });
});
