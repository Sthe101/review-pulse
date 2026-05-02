import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  AnalysisResults,
  type AnalysisResultsData,
} from "@/components/analysis/analysis-results";
import { Card } from "@/components/ui/card";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

export const metadata = {
  title: "Shared analysis report",
};

const TOKEN_RE = /^[0-9a-f]{16,64}$/i;

type ShareRow = {
  id: string;
  analysis_id: string;
  view_count: number;
  is_active: boolean;
};

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
  name: string;
  industry: string;
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

export default async function PublicReportPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!TOKEN_RE.test(token)) notFound();

  const supabase = await createClient();

  const shareRes = (await (
    supabase.from("shared_reports") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: boolean,
          ) => {
            maybeSingle: () => Promise<{
              data: ShareRow | null;
              error: unknown;
            }>;
          };
        };
      };
    }
  )
    .select("id, analysis_id, view_count, is_active")
    .eq("share_token", token)
    .eq("is_active", true)
    .maybeSingle()) as { data: ShareRow | null; error: unknown };

  if (!shareRes.data) notFound();

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
    .eq("id", shareRes.data.analysis_id)
    .maybeSingle()) as { data: AnalysisRow | null; error: unknown };

  if (!analysisRes.data) notFound();

  const projectRes = (await (
    supabase.from("projects") as unknown as {
      select: (cols: string) => {
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
    }
  )
    .select("id, name, industry")
    .eq("id", analysisRes.data.project_id)
    .maybeSingle()) as { data: ProjectRow | null; error: unknown };

  // Best-effort view bump. Don't fail the render if it errors.
  try {
    await (
      supabase.rpc as unknown as (
        fn: string,
        params: Record<string, unknown>,
      ) => Promise<{ data: unknown; error: unknown }>
    )("increment_share_view", { p_token: token });
  } catch {
    // ignore
  }

  const data: AnalysisResultsData = {
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
  };

  const projectName = projectRes.data?.name ?? "Analysis report";

  return (
    <div
      data-testid="public-report"
      style={{
        minHeight: "100vh",
        background: "var(--bg2)",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingBottom: 12,
            borderBottom: "1px solid var(--bd)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <svg viewBox="0 0 32 32" width={28} height={28} aria-hidden="true">
              <rect x="4" y="18" width="5" height="10" rx="1.5" fill="#0D9488" />
              <rect x="13" y="10" width="5" height="18" rx="1.5" fill="#1E3A5F" />
              <rect x="22" y="14" width="5" height="14" rx="1.5" fill="#0D9488" />
              <path
                d="M2 16 Q8 8 16 12 Q24 6 30 10"
                stroke="#EA580C"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span
              style={{ fontWeight: 700, color: "var(--navy)", fontSize: 16 }}
            >
              ReviewPulse
            </span>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--tx3)",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            Shared report
          </span>
        </header>

        <div>
          <h1
            data-testid="public-report-title"
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: "var(--tx)",
              margin: 0,
            }}
          >
            {projectName}
          </h1>
          {projectRes.data?.industry && (
            <p
              style={{
                margin: "4px 0 0",
                fontSize: 13,
                color: "var(--tx2)",
              }}
            >
              {projectRes.data.industry}
            </p>
          )}
        </div>

        <AnalysisResults analysis={data} mode="full" />

        <Card padding={20}>
          <div
            data-testid="public-report-cta"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: 6,
            }}
          >
            <p
              data-testid="public-report-attribution"
              style={{
                margin: 0,
                fontSize: 12,
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                fontWeight: 600,
              }}
            >
              Powered by ReviewPulse
            </p>
            <p style={{ margin: 0, fontSize: 13, color: "var(--tx2)" }}>
              <Link
                href="/signup"
                data-testid="public-report-cta-link"
                style={{
                  color: "var(--teal)",
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Analyze your own reviews free →
              </Link>
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
