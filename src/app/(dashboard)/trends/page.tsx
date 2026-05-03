import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { TrendsClient } from "@/components/trends/trends-client";
import { EmptyState } from "@/components/ui/empty-state";
import type { Industry } from "@/types/database";
import type {
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";
import type { AnalysisPoint, Range } from "@/lib/trends/aggregate";

export const metadata = {
  title: "Trends",
};

type ProjectRow = {
  id: string;
  name: string;
  industry: Industry;
};

type AnalysisRow = {
  id: string;
  created_at: string;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  overall_score: number | null;
  review_count: number;
  rating_distribution: unknown;
  complaints: unknown;
  praises: unknown;
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

function parseRange(raw: string | undefined): Range {
  return raw === "1M" || raw === "3M" || raw === "6M" || raw === "1Y"
    ? raw
    : "6M";
}

export default async function TrendsPage({
  searchParams,
}: {
  searchParams: Promise<{ project?: string; range?: string }>;
}) {
  const { project: projectParam, range: rangeParam } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/trends");

  const projectsRes = (await (
    supabase.from("projects") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          order: (
            col: string,
            opts: { ascending: boolean },
          ) => Promise<{ data: ProjectRow[] | null; error: unknown }>;
        };
      };
    }
  )
    .select("id, name, industry")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })) as {
    data: ProjectRow[] | null;
    error: unknown;
  };

  const projects = projectsRes.data ?? [];

  if (projects.length === 0) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: "var(--tx)",
            margin: 0,
          }}
        >
          Trends
        </h1>
        <EmptyState
          icon="folder"
          title="No projects yet"
          description="Create a project and run at least two analyses to see trends."
        />
        <div>
          <Link
            href="/projects"
            style={{
              color: "var(--teal)",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Go to projects →
          </Link>
        </div>
      </div>
    );
  }

  const selected =
    projects.find((p) => p.id === projectParam) ?? projects[0]!;

  const analysesRes = (await (
    supabase.from("analyses") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          order: (
            col: string,
            opts: { ascending: boolean },
          ) => Promise<{ data: AnalysisRow[] | null; error: unknown }>;
        };
      };
    }
  )
    .select(
      "id, created_at, sentiment_positive, sentiment_neutral, sentiment_negative, sentiment_mixed, overall_score, review_count, rating_distribution, complaints, praises",
    )
    .eq("project_id", selected.id)
    .order("created_at", { ascending: true })) as {
    data: AnalysisRow[] | null;
    error: unknown;
  };

  const analyses: AnalysisPoint[] = (analysesRes.data ?? []).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    sentiment_positive: row.sentiment_positive,
    sentiment_neutral: row.sentiment_neutral,
    sentiment_negative: row.sentiment_negative,
    sentiment_mixed: row.sentiment_mixed,
    overall_score: row.overall_score,
    review_count: row.review_count,
    rating_distribution: parseJsonbObject(row.rating_distribution),
    complaints: parseJsonbArray<ComplaintItem>(row.complaints),
    praises: parseJsonbArray<MentionItem>(row.praises),
  }));

  return (
    <TrendsClient
      projects={projects}
      selectedProjectId={selected.id}
      industry={selected.industry}
      analyses={analyses}
      initialRange={parseRange(rangeParam)}
    />
  );
}
