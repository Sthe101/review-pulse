import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";
import { AnalyzeRequestSchema } from "@/lib/analysis/schema";
import { type ReviewForPrompt } from "@/lib/analysis/claude";
import { checkRateLimit } from "@/lib/analysis/rate-limit";
import { runAnalysis } from "@/lib/analysis/run";

export async function POST(req: NextRequest) {
  try {
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
    const parsed = AnalyzeRequestSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body.", issues: parsed.error.issues },
        { status: 400 },
      );
    }
    const { project_id, review_ids } = parsed.data;

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
      return NextResponse.json(
        { error: "Project not found." },
        { status: 404 },
      );
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

    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY ?? "missing-key",
    });

    const result = await runAnalysis({
      supabase,
      anthropic,
      userId: user.id,
      projectId: project_id,
      reviews,
    });

    if (!result.ok) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json({
      analysis_id: result.analysis_id,
      analysis: result.analysis,
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected analyze failure.";
    console.error("[/api/analyze] unhandled:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
