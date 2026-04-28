import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ProjectDetailClient } from "@/components/projects/project-detail-client";
import type { Industry } from "@/types/database";

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

type LatestAnalysis = {
  id: string;
  summary: string | null;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  overall_score: number | null;
  review_count: number;
  created_at: string;
};

type ReviewRow = {
  id: string;
  content: string;
  rating: number | null;
  source: string | null;
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

type LatestAnalysisQuery = {
  select: (cols: string) => {
    eq: (
      col: string,
      val: string
    ) => {
      order: (
        col: string,
        opts: { ascending: boolean }
      ) => {
        limit: (n: number) => {
          maybeSingle: () => Promise<{
            data: LatestAnalysis | null;
            error: unknown;
          }>;
        };
      };
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
    .select("id, content, rating, source, created_at")
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(100);

  const reviews = reviewsListRes.data ?? [];

  const latestRes = await (
    supabase.from("analyses") as unknown as LatestAnalysisQuery
  )
    .select(
      "id, summary, sentiment_positive, sentiment_neutral, sentiment_negative, sentiment_mixed, overall_score, review_count, created_at"
    )
    .eq("project_id", id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const latestAnalysis = latestRes.data ?? null;

  const initialTab =
    tabParam === "reviews" ||
    tabParam === "add-reviews" ||
    tabParam === "analysis"
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
        initialTab={initialTab}
      />
    </div>
  );
}
