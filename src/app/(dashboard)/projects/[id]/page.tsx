import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import type { Industry } from "@/types/database";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

export const metadata = {
  title: "Project",
};

type ProjectDetail = {
  id: string;
  name: string;
  description: string | null;
  industry: Industry;
  review_source: string;
  is_demo: boolean;
};

type LatestAnalysisRow = {
  id: string;
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

type LatestAnalysis = {
  id: string;
  summary: string | null;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  overall_score: number | null;
  complaints: ComplaintItem[];
  praises: MentionItem[];
  feature_requests: MentionItem[];
  action_items: ActionItem[];
  rating_distribution: Record<string, number>;
  review_count: number;
  created_at: string;
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

type ReviewRow = {
  id: string;
  content: string;
  rating: number | null;
  source: string | null;
  sentiment: string | null;
  themes: string[] | null;
  created_at: string;
};

type AnalysisHistoryRow = {
  id: string;
  summary: string | null;
  overall_score: number | null;
  review_count: number;
  created_at: string;
};

type ProjectQuery = {
  select: (cols: string) => {
    eq: (
      col: string,
      val: string
    ) => {
      maybeSingle: () => Promise<{
        data: ProjectDetail | null;
        error: unknown;
      }>;
    };
  };
};

type ReviewsCountQuery = {
  select: (
    cols: string,
    opts: { count: "exact"; head: true }
  ) => {
    eq: (
      col: string,
      val: string
    ) => Promise<{ count: number | null; error: unknown }>;
  };
};

type ReviewsListQuery = {
  select: (cols: string) => {
    eq: (
      col: string,
      val: string
    ) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => {
        limit: (n: number) => Promise<{
          data: ReviewRow[] | null;
          error: unknown;
        }>;
      };
    };
  };
};

type AnalysesListQuery = {
  select: (cols: string) => {
    eq: (
      col: string,
      val: string
    ) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => Promise<{
        data: LatestAnalysisRow[] | null;
        error: unknown;
      }>;
    };
  };
};

export default async function ProjectDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=/projects/${id}`);

  const { data, error } = await (
    supabase.from("projects") as unknown as ProjectQuery
  )
    .select("id, name, description, industry, review_source, is_demo")
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error("Failed to load project");
  if (!data) notFound();

  const reviewsCountRes = await (
    supabase.from("reviews") as unknown as ReviewsCountQuery
  )
    .select("id", { count: "exact", head: true })
    .eq("project_id", id);

  const reviewCount = reviewsCountRes.count ?? 0;

  const reviewsListRes = await (
    supabase.from("reviews") as unknown as ReviewsListQuery
  )
    .select("id, content, rating, source, sentiment, themes, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const reviews = reviewsListRes.data ?? [];

  const analysesRes = await (
    supabase.from("analyses") as unknown as AnalysesListQuery
  )
    .select(
      "id, summary, sentiment_positive, sentiment_neutral, sentiment_negative, sentiment_mixed, overall_score, complaints, praises, feature_requests, action_items, rating_distribution, review_count, created_at"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  const analyses: LatestAnalysis[] = (analysesRes.data ?? []).map((row) => ({
    id: row.id,
    summary: row.summary,
    sentiment_positive: row.sentiment_positive,
    sentiment_neutral: row.sentiment_neutral,
    sentiment_negative: row.sentiment_negative,
    sentiment_mixed: row.sentiment_mixed,
    overall_score: row.overall_score,
    complaints: parseJsonbArray<ComplaintItem>(row.complaints),
    praises: parseJsonbArray<MentionItem>(row.praises),
    feature_requests: parseJsonbArray<MentionItem>(row.feature_requests),
    action_items: parseJsonbArray<ActionItem>(row.action_items),
    rating_distribution: parseJsonbObject(row.rating_distribution),
    review_count: row.review_count,
    created_at: row.created_at,
  }));

  const analysesHistory: AnalysisHistoryRow[] = analyses.map((a) => ({
    id: a.id,
    summary: a.summary,
    overall_score: a.overall_score,
    review_count: a.review_count,
    created_at: a.created_at,
  }));

  // The list above is already ordered desc; the first row is the latest.
  const latestAnalysis: LatestAnalysis | null = analyses[0] ?? null;

  const initialTab =
    tabParam === "reviews" ||
    tabParam === "add-reviews" ||
    tabParam === "analysis" ||
    tabParam === "history"
      ? tabParam
      : "overview";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <nav
        aria-label="Breadcrumb"
        data-testid="breadcrumb"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontSize: 13,
          color: "var(--tx3)",
        }}
      >
        <Link
          href="/projects"
          data-testid="breadcrumb-projects"
          style={{
            color: "var(--tx3)",
            textDecoration: "none",
            fontWeight: 500,
          }}
        >
          Projects
        </Link>
        <span aria-hidden="true">/</span>
        <span style={{ color: "var(--tx2)" }}>{data.name}</span>
      </nav>

      <div>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--tx)",
            margin: 0,
          }}
        >
          {data.name}
        </h1>
        {data.description && (
          <p
            style={{
              color: "var(--tx2)",
              margin: "4px 0 0",
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            {data.description}
          </p>
        )}
      </div>

      <ProjectDetailClient
        project={data}
        reviewCount={reviewCount}
        reviews={reviews}
        latestAnalysis={latestAnalysis}
        analyses={analyses}
        analysesHistory={analysesHistory}
        initialTab={initialTab}
      />
    </div>
  );
}
