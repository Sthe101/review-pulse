"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { AddReviewsTab, type AnalysisCompletePayload } from "./add-reviews-tab";
import {
  AnalysisResults,
  type AnalysisResultsData,
} from "@/components/analysis/analysis-results";
import { ExportCsvButton } from "@/components/analysis/export-csv-button";
import type { Industry } from "@/types/database";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

type Project = {
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
  complaints: ComplaintItem[];
  praises: MentionItem[];
  feature_requests: MentionItem[];
  action_items: ActionItem[];
  rating_distribution: Record<string, number>;
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

type Tab = "overview" | "reviews" | "add-reviews" | "analysis";

type Props = {
  project: Project;
  reviewCount: number;
  reviews: ReviewRow[];
  latestAnalysis: LatestAnalysis | null;
  initialTab: Tab;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "reviews", label: "Reviews" },
  { id: "add-reviews", label: "Add Reviews" },
  { id: "analysis", label: "Analysis" },
];

export function ProjectDetailClient({
  project,
  reviewCount,
  reviews,
  latestAnalysis,
  initialTab,
}: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>(initialTab);
  const [analysis, setAnalysis] = useState<LatestAnalysis | null>(
    latestAnalysis
  );

  // When the server prop changes (e.g., after router.refresh() resolves),
  // adopt it so we don't keep stale optimistic state forever.
  useEffect(() => {
    setAnalysis(latestAnalysis);
  }, [latestAnalysis]);

  const switchTab = useCallback(
    (next: Tab) => {
      setTab(next);
      const params = new URLSearchParams();
      if (next !== "overview") params.set("tab", next);
      const query = params.toString();
      const url = query
        ? `/projects/${project.id}?${query}`
        : `/projects/${project.id}`;
      window.history.replaceState(null, "", url);
    },
    [project.id]
  );

  const handleAnalysisComplete = useCallback(
    (payload: AnalysisCompletePayload) => {
      const a = payload.analysis;
      const optimistic: LatestAnalysis = {
        id: payload.analysis_id,
        summary: a.summary ?? null,
        sentiment_positive: a.sentiment?.positive ?? null,
        sentiment_neutral: a.sentiment?.neutral ?? null,
        sentiment_negative: a.sentiment?.negative ?? null,
        sentiment_mixed: a.sentiment?.mixed ?? null,
        overall_score: a.overall_score ?? null,
        complaints: (a.complaints ?? []) as ComplaintItem[],
        praises: (a.praises ?? []) as MentionItem[],
        feature_requests: (a.feature_requests ?? []) as MentionItem[],
        action_items: (a.action_items ?? []) as ActionItem[],
        rating_distribution: a.rating_distribution ?? {},
        review_count: payload.reviewCount,
        created_at: new Date().toISOString(),
      };
      setAnalysis(optimistic);
      router.refresh();
      switchTab("analysis");
    },
    [router, switchTab]
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div
        role="tablist"
        aria-label="Project sections"
        data-testid="project-tabs"
        style={{
          display: "flex",
          gap: 4,
          borderBottom: "1px solid var(--bd)",
        }}
      >
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`tab-${t.id}`}
              onClick={() => switchTab(t.id)}
              style={{
                padding: "10px 16px",
                background: "transparent",
                border: "none",
                borderBottom: active
                  ? "2px solid var(--teal)"
                  : "2px solid transparent",
                color: active ? "var(--teal)" : "var(--tx2)",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      {tab === "overview" && (
        <OverviewTab
          project={project}
          reviewCount={reviewCount}
          latestAnalysis={analysis}
        />
      )}

      {tab === "reviews" && <ReviewsTab reviews={reviews} />}

      {tab === "add-reviews" && (
        <AddReviewsTab
          projectId={project.id}
          onAnalysisComplete={handleAnalysisComplete}
        />
      )}

      {tab === "analysis" && <AnalysisTab analysis={analysis} />}
    </div>
  );
}

function OverviewTab({
  project,
  reviewCount,
  latestAnalysis,
}: {
  project: Project;
  reviewCount: number;
  latestAnalysis: LatestAnalysis | null;
}) {
  return (
    <div
      data-testid="overview-tab"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <Card padding={20}>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 24,
            justifyContent: "space-between",
          }}
        >
          <Stat label="Industry" value={project.industry} />
          <Stat label="Source" value={project.review_source} />
          <Stat label="Reviews" value={String(reviewCount)} />
          <Stat
            label="Status"
            value={
              project.is_demo ? (
                <Badge variant="navy">Demo</Badge>
              ) : (
                <Badge variant="pos">Live</Badge>
              )
            }
          />
        </div>
      </Card>

      {latestAnalysis ? (
        <Card padding={20}>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--tx)",
              margin: "0 0 8px",
            }}
          >
            Latest analysis
          </h2>
          {latestAnalysis.summary && (
            <p
              style={{
                fontSize: 13,
                color: "var(--tx2)",
                lineHeight: 1.6,
                margin: "0 0 12px",
              }}
            >
              {latestAnalysis.summary}
            </p>
          )}
          <SentimentBar
            positive={latestAnalysis.sentiment_positive ?? 0}
            neutral={latestAnalysis.sentiment_neutral ?? 0}
            negative={
              (latestAnalysis.sentiment_negative ?? 0) +
              (latestAnalysis.sentiment_mixed ?? 0)
            }
          />
        </Card>
      ) : (
        <Card padding={24}>
          <p
            data-testid="overview-no-analysis"
            style={{ fontSize: 13, color: "var(--tx2)", margin: 0 }}
          >
            No analysis yet. Add reviews and run an analysis to see insights
            here.
          </p>
        </Card>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div style={{ minWidth: 120 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--tx3)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 14, color: "var(--tx)", fontWeight: 600 }}>
        {value}
      </div>
    </div>
  );
}

function ReviewsTab({ reviews }: { reviews: ReviewRow[] }) {
  if (reviews.length === 0) {
    return (
      <Card padding={24}>
        <p
          data-testid="reviews-empty"
          style={{ fontSize: 13, color: "var(--tx2)", margin: 0 }}
        >
          No reviews yet. Use the Add Reviews tab to import reviews.
        </p>
      </Card>
    );
  }

  return (
    <div
      data-testid="reviews-tab"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      {reviews.map((r) => (
        <Card key={r.id} padding={16}>
          <div
            data-testid={`review-item-${r.id}`}
            style={{ display: "flex", flexDirection: "column", gap: 8 }}
          >
            <p
              data-testid="review-content"
              style={{
                fontSize: 14,
                color: "var(--tx)",
                lineHeight: 1.5,
                margin: 0,
                whiteSpace: "pre-wrap",
              }}
            >
              {r.content}
            </p>
            <div
              style={{
                display: "flex",
                gap: 12,
                fontSize: 12,
                color: "var(--tx3)",
                flexWrap: "wrap",
              }}
            >
              {typeof r.rating === "number" && (
                <span>
                  {r.rating}/5 ★
                </span>
              )}
              {r.source && <span>{r.source}</span>}
              <span>{new Date(r.created_at).toLocaleDateString("en-US")}</span>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AnalysisTab({ analysis }: { analysis: LatestAnalysis | null }) {
  if (!analysis) {
    return (
      <Card padding={24}>
        <div
          data-testid="analysis-empty"
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            gap: 6,
          }}
        >
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              color: "var(--tx)",
              margin: 0,
            }}
          >
            No analysis yet
          </h2>
          <p style={{ fontSize: 13, color: "var(--tx2)", margin: 0 }}>
            Use the Add Reviews tab to import reviews and run an analysis.
          </p>
        </div>
      </Card>
    );
  }

  const data: AnalysisResultsData = {
    summary: analysis.summary,
    sentiment_positive: analysis.sentiment_positive,
    sentiment_neutral: analysis.sentiment_neutral,
    sentiment_negative: analysis.sentiment_negative,
    sentiment_mixed: analysis.sentiment_mixed,
    overall_score: analysis.overall_score,
    complaints: analysis.complaints,
    praises: analysis.praises,
    feature_requests: analysis.feature_requests,
    action_items: analysis.action_items,
    rating_distribution: analysis.rating_distribution,
    review_count: analysis.review_count,
    created_at: analysis.created_at,
  };

  return (
    <div
      data-testid="analysis-tab"
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ExportCsvButton analysisId={analysis.id} />
      </div>
      <AnalysisResults analysis={data} mode="full" />
    </div>
  );
}
