import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/analysis/rate-limit";
import { callAnalysis, type ReviewForPrompt } from "@/lib/analysis/claude";
import { normalizeSentiment } from "@/lib/analysis/normalize";
import { PLAN_LIMITS } from "@/lib/analysis/plan";
import { ReviewInputSchema } from "@/lib/analysis/schema";
import type { Plan } from "@/types/database";
import type {
  AnalysisResponse,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

const SCORE_GAP = 5;
const TOP_N = 3;

const CompareRequestSchema = z.object({
  projectId: z.string().uuid(),
  competitorName: z.string().trim().min(1).max(100),
  competitorReviews: z.array(ReviewInputSchema).min(1).max(500),
});

interface SideSummary {
  score: number;
  topIssues: string[];
  strengths: string[];
}

function summarize(a: {
  overall_score: number;
  complaints: ComplaintItem[];
  praises: MentionItem[];
}): SideSummary {
  const complaints = a.complaints ?? [];
  const praises = a.praises ?? [];
  const topIssues = [...complaints]
    .sort((x, y) => (y.count ?? 0) - (x.count ?? 0))
    .slice(0, TOP_N)
    .map((c) => c.text);
  const strengths = [...praises]
    .sort((x, y) => (y.count ?? 0) - (x.count ?? 0))
    .slice(0, TOP_N)
    .map((p) => p.text);
  return { score: a.overall_score, topIssues, strengths };
}

function compare(
  yours: SideSummary,
  theirs: SideSummary,
): { aheadIn: string[]; behindIn: string[] } {
  const aheadIn: string[] = [];
  const behindIn: string[] = [];

  if (yours.score - theirs.score >= SCORE_GAP) {
    aheadIn.push(`Overall sentiment (${yours.score}% vs ${theirs.score}%)`);
  } else if (theirs.score - yours.score >= SCORE_GAP) {
    behindIn.push(`Overall sentiment (${theirs.score}% vs ${yours.score}%)`);
  }

  const norm = (s: string) => s.toLowerCase().trim();
  const theirStrengths = new Set(theirs.strengths.map(norm));
  const yourStrengths = new Set(yours.strengths.map(norm));

  for (const s of yours.strengths) {
    if (!theirStrengths.has(norm(s))) aheadIn.push(s);
  }
  for (const s of theirs.strengths) {
    if (!yourStrengths.has(norm(s))) behindIn.push(s);
  }

  return { aheadIn, behindIn };
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rl = await checkRateLimit(supabase, `analyze:${user.id}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  const rawBody: unknown = await req.json().catch(() => null);
  const parsed = CompareRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { projectId, competitorName, competitorReviews } = parsed.data;

  const profileRes = (await (
    supabase.from("profiles") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{
            data: { plan: Plan } | null;
            error: unknown;
          }>;
        };
      };
    }
  )
    .select("plan")
    .eq("id", user.id)
    .maybeSingle()) as {
    data: { plan: Plan } | null;
    error: unknown;
  };

  const profile = profileRes.data;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  if (profile.plan === "free") {
    return NextResponse.json(
      {
        error:
          "Comparing against competitors requires a Pro or Business plan.",
      },
      { status: 403 },
    );
  }

  const projectRes = (await (
    supabase.from("projects") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { id: string } | null;
              error: unknown;
            }>;
          };
        };
      };
    }
  )
    .select("id")
    .eq("id", projectId)
    .eq("user_id", user.id)
    .maybeSingle()) as {
    data: { id: string } | null;
    error: unknown;
  };

  if (!projectRes.data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const yoursRes = (await (
    supabase.from("analyses") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          order: (
            col: string,
            opts: { ascending: boolean },
          ) => {
            limit: (n: number) => {
              maybeSingle: () => Promise<{
                data: {
                  overall_score: number;
                  complaints: ComplaintItem[];
                  praises: MentionItem[];
                } | null;
                error: unknown;
              }>;
            };
          };
        };
      };
    }
  )
    .select("overall_score, complaints, praises")
    .eq("project_id", projectId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: {
      overall_score: number;
      complaints: ComplaintItem[];
      praises: MentionItem[];
    } | null;
    error: unknown;
  };

  if (!yoursRes.data) {
    return NextResponse.json(
      { error: "Analyze your project first before comparing." },
      { status: 400 },
    );
  }

  const competitorForPrompt: ReviewForPrompt[] = competitorReviews.map(
    (r, i) => ({
      id: `comp_${i + 1}`,
      content: r.content,
      rating: r.rating ?? null,
      source: r.source ?? null,
    }),
  );

  const limits = PLAN_LIMITS[profile.plan];
  if (competitorForPrompt.length > limits.maxReviewsPerAnalysis) {
    return NextResponse.json(
      {
        error: `Your plan allows up to ${limits.maxReviewsPerAnalysis} competitor reviews per comparison.`,
      },
      { status: 403 },
    );
  }

  interface ConsumeQuotaResult {
    ok: boolean;
    code?: string;
    limit?: number;
  }
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: ConsumeQuotaResult | null; error: unknown }>;
  const consumeRes = await rpc("consume_review_quota", {
    p_review_count: competitorForPrompt.length,
    p_max_reviews_per_month: limits.reviewsPerMonth,
    p_max_analyses_per_month: limits.analysesPerMonth,
    p_enforce_analyses_count: false,
  });
  if (consumeRes.error || !consumeRes.data) {
    return NextResponse.json(
      { error: "Could not check usage. Please try again." },
      { status: 500 },
    );
  }
  if (!consumeRes.data.ok) {
    if (consumeRes.data.code === "monthly_review_quota") {
      return NextResponse.json(
        {
          error: `Monthly review quota reached (${limits.reviewsPerMonth}). Upgrade for more.`,
        },
        { status: 403 },
      );
    }
    return NextResponse.json(
      { error: "Usage limit reached. Upgrade for more." },
      { status: 403 },
    );
  }

  const refundQuota = async (): Promise<void> => {
    const refundRpc = supabase.rpc as unknown as (
      fn: string,
      args: Record<string, unknown>,
    ) => Promise<{ data: unknown; error: unknown }>;
    await refundRpc("refund_review_quota", {
      p_review_count: competitorForPrompt.length,
    });
  };

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? "missing-key",
  });

  let competitorAnalysis: AnalysisResponse;
  try {
    competitorAnalysis = await callAnalysis({
      reviews: competitorForPrompt,
      model: limits.model,
      client: anthropic,
    });
  } catch {
    await refundQuota();
    return NextResponse.json(
      {
        error:
          "Could not analyze competitor reviews right now. Please try again.",
      },
      { status: 500 },
    );
  }

  competitorAnalysis.sentiment = normalizeSentiment(
    competitorAnalysis.sentiment,
  );

  const yours = summarize(yoursRes.data);
  const theirs = summarize({
    overall_score: competitorAnalysis.overall_score,
    complaints: competitorAnalysis.complaints,
    praises: competitorAnalysis.praises,
  });
  const comparison = compare(yours, theirs);

  return NextResponse.json({
    competitor: competitorName,
    yours,
    theirs,
    comparison,
  });
}
