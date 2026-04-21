import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { mixedReviews } from "../../src/test/fixtures/reviews";
import { sampleAnalysisResponse } from "../../src/test/fixtures/analysis";

function getAdminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "seedTestData requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to be set"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface SeedOptions {
  userId: string;
  projectName?: string;
}

export interface SeedResult {
  projectId: string;
  reviewIds: string[];
  analysisId: string;
}

export async function seedTestData(options: SeedOptions): Promise<SeedResult> {
  const supabase = getAdminClient();

  const { data: project, error: projectErr } = await supabase
    .from("projects")
    .insert({
      user_id: options.userId,
      name: options.projectName ?? "E2E Test Project",
      industry: "SaaS",
      review_source: "Mixed",
      is_demo: true,
    })
    .select()
    .single();

  if (projectErr || !project) {
    throw new Error(`Failed to seed project: ${projectErr?.message}`);
  }

  const { data: reviews, error: reviewsErr } = await supabase
    .from("reviews")
    .insert(
      mixedReviews.map((r) => ({
        project_id: project.id,
        content: r.content,
        rating: r.rating,
        author: r.author,
        source: r.source,
        review_date: r.review_date,
      }))
    )
    .select();

  if (reviewsErr || !reviews) {
    throw new Error(`Failed to seed reviews: ${reviewsErr?.message}`);
  }

  const s = sampleAnalysisResponse.sentiment;
  const { data: analysis, error: analysisErr } = await supabase
    .from("analyses")
    .insert({
      project_id: project.id,
      review_count: reviews.length,
      summary: sampleAnalysisResponse.summary,
      sentiment_positive: s.positive,
      sentiment_neutral: s.neutral,
      sentiment_negative: s.negative,
      sentiment_mixed: s.mixed,
      overall_score: sampleAnalysisResponse.overall_score,
      complaints: sampleAnalysisResponse.complaints,
      praises: sampleAnalysisResponse.praises,
      feature_requests: sampleAnalysisResponse.feature_requests,
      action_items: sampleAnalysisResponse.action_items,
      rating_distribution: sampleAnalysisResponse.rating_distribution,
    })
    .select()
    .single();

  if (analysisErr || !analysis) {
    throw new Error(`Failed to seed analysis: ${analysisErr?.message}`);
  }

  return {
    projectId: project.id,
    reviewIds: reviews.map((r) => r.id),
    analysisId: analysis.id,
  };
}
