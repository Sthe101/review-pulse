import type Anthropic from "@anthropic-ai/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";
import { callAnalysis, type ReviewForPrompt } from "./claude";
import { normalizeSentiment } from "./normalize";
import { PLAN_LIMITS } from "./plan";
import type { AnalysisResponse } from "./types";
import type { Database, Plan, Sentiment } from "@/types/database";

export type RunAnalysisResult =
  | { ok: true; analysis_id: string; analysis: AnalysisResponse }
  | { ok: false; status: number; error: string };

export interface RunAnalysisArgs {
  supabase: SupabaseClient<Database>;
  anthropic: Anthropic;
  userId: string;
  projectId: string;
  reviews: ReviewForPrompt[];
}

interface ConsumeQuotaResult {
  ok: boolean;
  code?: string;
  limit?: number;
  used?: number;
  reviews_used_after?: number;
  plan?: Plan;
}

function deriveReviewSentiment(rating: number | null): {
  sentiment: Sentiment | null;
  sentiment_score: number | null;
} {
  if (rating == null) return { sentiment: null, sentiment_score: null };
  if (rating >= 5) return { sentiment: "positive", sentiment_score: 0.9 };
  if (rating >= 4) return { sentiment: "positive", sentiment_score: 0.6 };
  if (rating === 3) return { sentiment: "neutral", sentiment_score: 0 };
  if (rating === 2) return { sentiment: "negative", sentiment_score: -0.6 };
  return { sentiment: "negative", sentiment_score: -0.9 };
}

async function refundQuota(
  supabase: SupabaseClient<Database>,
  reviewCount: number,
): Promise<void> {
  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: unknown }>;
  await rpc("refund_review_quota", {
    p_review_count: reviewCount,
  });
}

export async function loadPlanForUser(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Plan | null> {
  const res = (await (
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
    .eq("id", userId)
    .maybeSingle()) as {
    data: { plan: Plan } | null;
    error: unknown;
  };
  return res.data?.plan ?? null;
}

export async function runAnalysis(
  args: RunAnalysisArgs,
): Promise<RunAnalysisResult> {
  const { supabase, anthropic, userId, projectId, reviews } = args;

  const plan = await loadPlanForUser(supabase, userId);
  if (!plan) {
    return { ok: false, status: 404, error: "Profile not found." };
  }
  const limits = PLAN_LIMITS[plan];

  if (reviews.length > limits.maxReviewsPerAnalysis) {
    return {
      ok: false,
      status: 403,
      error: `Your plan allows up to ${limits.maxReviewsPerAnalysis} reviews per analysis. Upgrade to analyze more.`,
    };
  }

  const rpc = supabase.rpc as unknown as (
    fn: string,
    args: Record<string, unknown>,
  ) => Promise<{ data: ConsumeQuotaResult | null; error: unknown }>;
  const consumeRes = await rpc("consume_review_quota", {
    p_review_count: reviews.length,
    p_max_reviews_per_month: limits.reviewsPerMonth,
    p_max_analyses_per_month: limits.analysesPerMonth,
    p_enforce_analyses_count: plan === "free",
  });

  if (consumeRes.error || !consumeRes.data) {
    return {
      ok: false,
      status: 500,
      error: "Could not check usage. Please try again.",
    };
  }
  if (!consumeRes.data.ok) {
    const code = consumeRes.data.code;
    if (code === "monthly_review_quota") {
      return {
        ok: false,
        status: 403,
        error: `Monthly review quota reached (${limits.reviewsPerMonth}). Upgrade for more.`,
      };
    }
    if (code === "analyses_quota") {
      return {
        ok: false,
        status: 403,
        error: `Free plan is limited to ${limits.analysesPerMonth} analyses per month. Upgrade for more.`,
      };
    }
    if (code === "profile_not_found") {
      return { ok: false, status: 404, error: "Profile not found." };
    }
    return {
      ok: false,
      status: 403,
      error: "Usage limit reached. Upgrade for more.",
    };
  }

  let analysis: AnalysisResponse;
  try {
    analysis = await callAnalysis({
      reviews,
      model: limits.model,
      client: anthropic,
    });
  } catch {
    await refundQuota(supabase, reviews.length);
    return {
      ok: false,
      status: 500,
      error: "Could not analyze reviews right now. Please try again.",
    };
  }

  analysis.sentiment = normalizeSentiment(analysis.sentiment);

  const insertRes = (await (
    supabase.from("analyses") as unknown as {
      insert: (v: unknown) => {
        select: (cols: string) => {
          single: () => Promise<{
            data: { id: string } | null;
            error: unknown;
          }>;
        };
      };
    }
  )
    .insert({
      project_id: projectId,
      review_count: reviews.length,
      summary: analysis.summary,
      sentiment_positive: analysis.sentiment.positive,
      sentiment_neutral: analysis.sentiment.neutral,
      sentiment_negative: analysis.sentiment.negative,
      sentiment_mixed: analysis.sentiment.mixed,
      overall_score: analysis.overall_score,
      complaints: analysis.complaints,
      praises: analysis.praises,
      feature_requests: analysis.feature_requests,
      action_items: analysis.action_items,
      rating_distribution: analysis.rating_distribution,
      raw_response: analysis,
    })
    .select("id")
    .single()) as {
    data: { id: string } | null;
    error: unknown;
  };

  if (insertRes.error || !insertRes.data) {
    await refundQuota(supabase, reviews.length);
    return {
      ok: false,
      status: 500,
      error: "Could not save analysis. Please try again.",
    };
  }
  const analysis_id = insertRes.data.id;

  await Promise.all(
    reviews.map(async (r) => {
      const { sentiment, sentiment_score } = deriveReviewSentiment(r.rating);
      if (sentiment == null) return;
      await (
        supabase.from("reviews") as unknown as {
          update: (v: unknown) => {
            eq: (col: string, val: string) => Promise<{ error: unknown }>;
          };
        }
      )
        .update({ sentiment, sentiment_score })
        .eq("id", r.id);
    }),
  );

  return { ok: true, analysis_id, analysis };
}
