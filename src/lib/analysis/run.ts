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

function startOfMonthIso(now = new Date()): string {
  const d = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0),
  );
  return d.toISOString();
}

export async function runAnalysis(
  args: RunAnalysisArgs,
): Promise<RunAnalysisResult> {
  const { supabase, anthropic, userId, projectId, reviews } = args;

  const profileRes = (await (
    supabase.from("profiles") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          maybeSingle: () => Promise<{
            data: {
              id: string;
              plan: Plan;
              reviews_used_this_month: number;
            } | null;
            error: unknown;
          }>;
        };
      };
    }
  )
    .select("id, plan, reviews_used_this_month")
    .eq("id", userId)
    .maybeSingle()) as {
    data: { id: string; plan: Plan; reviews_used_this_month: number } | null;
    error: unknown;
  };

  const profile = profileRes.data;
  if (!profile) {
    return { ok: false, status: 404, error: "Profile not found." };
  }
  const limits = PLAN_LIMITS[profile.plan];

  if (reviews.length > limits.maxReviewsPerAnalysis) {
    return {
      ok: false,
      status: 403,
      error: `Your plan allows up to ${limits.maxReviewsPerAnalysis} reviews per analysis. Upgrade to analyze more.`,
    };
  }
  if (
    profile.reviews_used_this_month + reviews.length >
    limits.reviewsPerMonth
  ) {
    return {
      ok: false,
      status: 403,
      error: `Monthly review quota reached (${limits.reviewsPerMonth}). Upgrade for more.`,
    };
  }

  if (profile.plan === "free") {
    const countRes = (await (
      supabase.from("analyses") as unknown as {
        select: (
          cols: string,
          opts: { count: "exact"; head: true },
        ) => {
          eq: (
            col: string,
            val: string,
          ) => {
            gte: (
              col: string,
              val: string,
            ) => Promise<{ count: number | null; error: unknown }>;
          };
        };
      }
    )
      .select("id, project:projects!inner(user_id)", {
        count: "exact",
        head: true,
      })
      .eq("project.user_id", userId)
      .gte("created_at", startOfMonthIso())) as {
      count: number | null;
      error: unknown;
    };

    if ((countRes.count ?? 0) >= limits.analysesPerMonth) {
      return {
        ok: false,
        status: 403,
        error: `Free plan is limited to ${limits.analysesPerMonth} analyses per month. Upgrade for more.`,
      };
    }
  }

  let analysis: AnalysisResponse;
  try {
    analysis = await callAnalysis({
      reviews,
      model: limits.model,
      client: anthropic,
    });
  } catch {
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

  await (
    supabase.from("profiles") as unknown as {
      update: (v: unknown) => {
        eq: (col: string, val: string) => Promise<{ error: unknown }>;
      };
    }
  )
    .update({
      reviews_used_this_month:
        profile.reviews_used_this_month + reviews.length,
    })
    .eq("id", userId);

  return { ok: true, analysis_id, analysis };
}
