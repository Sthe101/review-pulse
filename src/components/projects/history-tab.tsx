"use client";

import { Card } from "@/components/ui/card";

export type AnalysisHistoryItem = {
  id: string;
  summary: string | null;
  overall_score: number | null;
  review_count: number;
  created_at: string;
};

type Props = {
  analyses: AnalysisHistoryItem[];
  activeId: string | null;
  onSelect: (id: string) => void;
};

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function summaryPreview(summary: string | null): string {
  if (!summary) return "No summary available.";
  const trimmed = summary.trim().replace(/\s+/g, " ");
  return trimmed.length > 220 ? trimmed.slice(0, 220) + "…" : trimmed;
}

function scoreColor(score: number | null): string {
  if (score === null) return "var(--tx3)";
  if (score >= 70) return "var(--pos)";
  if (score >= 40) return "var(--warn)";
  return "var(--neg)";
}

export function HistoryTab({ analyses, activeId, onSelect }: Props) {
  if (analyses.length === 0) {
    return (
      <Card padding={24}>
        <div
          data-testid="history-empty"
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
            No analyses yet
          </h2>
          <p style={{ fontSize: 13, color: "var(--tx2)", margin: 0 }}>
            Run an analysis from the Add Reviews tab to start your history.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div
      data-testid="history-tab"
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <p
        style={{
          fontSize: 12,
          color: "var(--tx3)",
          margin: 0,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontWeight: 600,
        }}
      >
        {analyses.length} {analyses.length === 1 ? "analysis" : "analyses"}
      </p>
      {analyses.map((a) => {
        const active = a.id === activeId;
        return (
          <Card key={a.id} padding={16}>
            <button
              type="button"
              role="button"
              data-testid={`history-item-${a.id}`}
              data-active={active}
              onClick={() => onSelect(a.id)}
              style={{
                width: "100%",
                textAlign: "left",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                background: "transparent",
                border: "none",
                padding: 0,
                marginLeft: -16,
                paddingLeft: 12,
                borderLeft: active
                  ? "3px solid var(--teal)"
                  : "3px solid transparent",
                cursor: "pointer",
                color: "var(--tx)",
                font: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span
                  data-testid="history-item-date"
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: active ? "var(--teal)" : "var(--tx)",
                  }}
                >
                  {formatDate(a.created_at)}
                </span>
                <span style={{ fontSize: 12, color: "var(--tx3)" }}>
                  {a.review_count}{" "}
                  {a.review_count === 1 ? "review" : "reviews"}
                </span>
                {a.overall_score !== null && (
                  <span
                    data-testid="history-item-score"
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: scoreColor(a.overall_score),
                    }}
                  >
                    Score {Math.round(a.overall_score)}
                  </span>
                )}
                {active && (
                  <span
                    data-testid="history-item-active-badge"
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "var(--teal)",
                    }}
                  >
                    Viewing
                  </span>
                )}
              </div>
              <p
                style={{
                  fontSize: 13,
                  color: "var(--tx2)",
                  lineHeight: 1.5,
                  margin: 0,
                }}
              >
                {summaryPreview(a.summary)}
              </p>
            </button>
          </Card>
        );
      })}
    </div>
  );
}
