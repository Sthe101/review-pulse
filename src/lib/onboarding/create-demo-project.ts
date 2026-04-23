import { createClient } from "@/lib/supabase/client";
import { getDemoSet, type DemoSet } from "@/lib/demo-data";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

export interface CreateDemoProjectOptions {
  userId: string;
  industryId?: string | null;
  skipped?: boolean;
}

export interface CreateDemoProjectResult {
  projectId: string | null;
  error: string | null;
}

function projectNameFor(demoSet: DemoSet, skipped: boolean, industryId?: string | null): string {
  if (skipped || !industryId) return "Sample Reviews";
  return `Sample: ${demoSet.industryLabel} Reviews`;
}

export async function createDemoProject(
  opts: CreateDemoProjectOptions,
  client?: SupabaseClient<Database>
): Promise<CreateDemoProjectResult> {
  const supabase = client ?? (createClient() as SupabaseClient<Database>);
  const demoSet = getDemoSet(opts.industryId);
  const name = projectNameFor(demoSet, !!opts.skipped, opts.industryId);

  const projectInsert = await (supabase.from("projects") as unknown as {
    insert: (v: Record<string, unknown>) => {
      select: (cols: string) => {
        single: () => Promise<{
          data: { id: string } | null;
          error: { message: string } | null;
        }>;
      };
    };
  })
    .insert({
      user_id: opts.userId,
      name,
      industry: demoSet.dbIndustry,
      review_source: "Mixed",
      is_demo: true,
    })
    .select("id")
    .single();

  if (projectInsert.error || !projectInsert.data) {
    return {
      projectId: null,
      error: projectInsert.error?.message ?? "Failed to create demo project",
    };
  }

  const projectId = projectInsert.data.id;

  const reviewsInsert = await (supabase.from("reviews") as unknown as {
    insert: (v: Record<string, unknown>[]) => Promise<{
      error: { message: string } | null;
    }>;
  }).insert(
    demoSet.reviews.map((r) => ({
      project_id: projectId,
      content: r.content,
      rating: r.rating,
      author: r.author,
      source: r.source,
      review_date: r.review_date,
      sentiment: r.sentiment,
      sentiment_score: r.sentiment_score,
      themes: r.themes,
    }))
  );

  if (reviewsInsert.error) {
    return { projectId, error: reviewsInsert.error.message };
  }

  const a = demoSet.analysis;
  const analysisInsert = await (supabase.from("analyses") as unknown as {
    insert: (v: Record<string, unknown>) => Promise<{
      error: { message: string } | null;
    }>;
  }).insert({
    project_id: projectId,
    review_count: demoSet.reviews.length,
    summary: a.summary,
    sentiment_positive: a.sentiment.positive,
    sentiment_neutral: a.sentiment.neutral,
    sentiment_negative: a.sentiment.negative,
    sentiment_mixed: a.sentiment.mixed,
    overall_score: a.overall_score,
    complaints: a.complaints,
    praises: a.praises,
    feature_requests: a.feature_requests,
    action_items: a.action_items,
    rating_distribution: a.rating_distribution,
  });

  if (analysisInsert.error) {
    return { projectId, error: analysisInsert.error.message };
  }

  return { projectId, error: null };
}
