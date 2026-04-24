import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeRequestSchema } from "@/lib/analysis/schema";
import { callAnalysis, type ReviewForPrompt } from "@/lib/analysis/claude";
import { checkRateLimit } from "@/lib/analysis/rate-limit";
import { normalizeSentiment } from "@/lib/analysis/normalize";
import { PLAN_LIMITS } from "@/lib/analysis/plan";
import type { Plan, Sentiment } from "@/types/database";

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

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rl = checkRateLimit(`analyze:${user.id}`);
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
  const parsed = AnalyzeRequestSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body.", issues: parsed.error.issues },
      { status: 400 },
    );
  }
  const { project_id, review_ids } = parsed.data;

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
    .eq("id", user.id)
    .maybeSingle()) as {
    data: { id: string; plan: Plan; reviews_used_this_month: number } | null;
    error: unknown;
  };

  const profile = profileRes.data;
  if (!profile) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  const limits = PLAN_LIMITS[profile.plan];

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
              data: { id: string; user_id: string } | null;
              error: unknown;
            }>;
          };
        };
      };
    }
  )
    .select("id, user_id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .maybeSingle()) as {
    data: { id: string; user_id: string } | null;
    error: unknown;
  };

  if (!projectRes.data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const baseReviews = (
    supabase.from("reviews") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          in: (
            col: string,
            vals: string[],
          ) => Promise<{ data: ReviewForPrompt[] | null; error: unknown }>;
        } & Promise<{ data: ReviewForPrompt[] | null; error: unknown }>;
      };
    }
  )
    .select("id, content, rating, source")
    .eq("project_id", project_id);

  const reviewsRes =
    review_ids && review_ids.length > 0
      ? await baseReviews.in("id", review_ids)
      : await baseReviews;

  const reviews: ReviewForPrompt[] = reviewsRes.data ?? [];
  if (reviews.length === 0) {
    return NextResponse.json(
      { error: "No reviews to analyze." },
      { status: 400 },
    );
  }

  if (reviews.length > limits.maxReviewsPerAnalysis) {
    return NextResponse.json(
      {
        error: `Your plan allows up to ${limits.maxReviewsPerAnalysis} reviews per analysis. Upgrade to analyze more.`,
      },
      { status: 403 },
    );
  }
  if (
    profile.reviews_used_this_month + reviews.length >
    limits.reviewsPerMonth
  ) {
    return NextResponse.json(
      {
        error: `Monthly review quota reached (${limits.reviewsPerMonth}). Upgrade for more.`,
      },
      { status: 403 },
    );
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
      .eq("project.user_id", user.id)
      .gte("created_at", startOfMonthIso())) as {
      count: number | null;
      error: unknown;
    };

    if ((countRes.count ?? 0) >= limits.analysesPerMonth) {
      return NextResponse.json(
        {
          error: `Free plan is limited to ${limits.analysesPerMonth} analyses per month. Upgrade for more.`,
        },
        { status: 403 },
      );
    }
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? "missing-key",
  });

  let analysis;
  try {
    analysis = await callAnalysis({
      reviews,
      model: limits.model,
      client: anthropic,
    });
  } catch {
    return NextResponse.json(
      { error: "Could not analyze reviews right now. Please try again." },
      { status: 500 },
    );
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
      project_id,
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
    return NextResponse.json(
      { error: "Could not save analysis. Please try again." },
      { status: 500 },
    );
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
    .eq("id", user.id);

  return NextResponse.json({ analysis_id, analysis });
}
