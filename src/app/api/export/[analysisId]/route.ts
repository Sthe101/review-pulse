import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  buildAnalysisCsv,
  buildCsvFilename,
  type ReviewRow,
} from "@/lib/csv/build-analysis-csv";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type AnalysisRow = {
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
};

type ProjectRow = {
  id: string;
  user_id: string;
  name: string;
  industry: string;
  review_source: string;
};

type ReviewQueryRow = {
  content: string;
  rating: number | null;
  source: string | null;
  author: string | null;
  review_date: string | null;
  created_at: string;
  sentiment: string | null;
  sentiment_score: number | null;
  themes: string[] | null;
};

function parseJsonbArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[];
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? (v as T[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function parseJsonbObject(raw: unknown): Record<string, number> {
  if (raw && typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, number>;
  }
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return v && typeof v === "object" && !Array.isArray(v)
        ? (v as Record<string, number>)
        : {};
    } catch {
      return {};
    }
  }
  return {};
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ analysisId: string }> },
) {
  try {
    const { analysisId } = await params;
    if (!UUID_RE.test(analysisId)) {
      return NextResponse.json(
        { error: "Invalid analysis id." },
        { status: 400 },
      );
    }

    const format = req.nextUrl.searchParams.get("format") ?? "csv";
    if (format !== "csv") {
      return NextResponse.json(
        { error: `Unsupported format: ${format}` },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not signed in." }, { status: 401 });
    }

    const analysisRes = (await (
      supabase.from("analyses") as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            maybeSingle: () => Promise<{
              data: AnalysisRow | null;
              error: unknown;
            }>;
          };
        };
      }
    )
      .select(
        "id, project_id, summary, sentiment_positive, sentiment_neutral, sentiment_negative, sentiment_mixed, overall_score, complaints, praises, feature_requests, action_items, rating_distribution, review_count, created_at",
      )
      .eq("id", analysisId)
      .maybeSingle()) as { data: AnalysisRow | null; error: unknown };

    if (!analysisRes.data) {
      return NextResponse.json(
        { error: "Analysis not found." },
        { status: 404 },
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
                data: ProjectRow | null;
                error: unknown;
              }>;
            };
          };
        };
      }
    )
      .select("id, user_id, name, industry, review_source")
      .eq("id", analysisRes.data.project_id)
      .eq("user_id", user.id)
      .maybeSingle()) as { data: ProjectRow | null; error: unknown };

    if (!projectRes.data) {
      return NextResponse.json(
        { error: "Analysis not found." },
        { status: 404 },
      );
    }

    const reviewsRes = (await (
      supabase.from("reviews") as unknown as {
        select: (cols: string) => {
          eq: (
            col: string,
            val: string,
          ) => {
            order: (
              col: string,
              opts: { ascending: boolean },
            ) => Promise<{
              data: ReviewQueryRow[] | null;
              error: unknown;
            }>;
          };
        };
      }
    )
      .select(
        "content, rating, source, author, review_date, created_at, sentiment, sentiment_score, themes",
      )
      .eq("project_id", analysisRes.data.project_id)
      .order("created_at", { ascending: false })) as {
      data: ReviewQueryRow[] | null;
      error: unknown;
    };

    const reviews: ReviewRow[] = (reviewsRes.data ?? []).map((r) => ({
      content: r.content,
      rating: r.rating,
      source: r.source,
      author: r.author,
      review_date: r.review_date,
      created_at: r.created_at,
      sentiment: r.sentiment,
      sentiment_score: r.sentiment_score,
      themes: r.themes,
    }));

    const csv = buildAnalysisCsv({
      project: {
        name: projectRes.data.name,
        industry: projectRes.data.industry,
        review_source: projectRes.data.review_source,
      },
      analysis: {
        summary: analysisRes.data.summary,
        sentiment_positive: analysisRes.data.sentiment_positive,
        sentiment_neutral: analysisRes.data.sentiment_neutral,
        sentiment_negative: analysisRes.data.sentiment_negative,
        sentiment_mixed: analysisRes.data.sentiment_mixed,
        overall_score: analysisRes.data.overall_score,
        complaints: parseJsonbArray<ComplaintItem>(analysisRes.data.complaints),
        praises: parseJsonbArray<MentionItem>(analysisRes.data.praises),
        feature_requests: parseJsonbArray<MentionItem>(
          analysisRes.data.feature_requests,
        ),
        action_items: parseJsonbArray<ActionItem>(analysisRes.data.action_items),
        rating_distribution: parseJsonbObject(
          analysisRes.data.rating_distribution,
        ),
        review_count: analysisRes.data.review_count,
        created_at: analysisRes.data.created_at,
      },
      reviews,
    });

    const filename = buildCsvFilename(
      projectRes.data.name,
      analysisRes.data.created_at,
    );

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unexpected export failure.";
    console.error("[/api/export] unhandled:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
