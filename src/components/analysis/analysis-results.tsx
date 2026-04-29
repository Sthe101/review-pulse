"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DonutChart } from "@/components/ui/donut-chart";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { Icon } from "@/components/ui/icon";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

export type AnalysisResultsData = {
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

type Mode = "full" | "compact";

type Props = {
  analysis: AnalysisResultsData;
  mode?: Mode;
};

type SevPri = "low" | "medium" | "high";
type BadgeVariant = "teal" | "pos" | "neg" | "warn" | "navy";

const SEVERITY_VARIANT: Record<SevPri, BadgeVariant> = {
  low: "warn",
  medium: "warn",
  high: "neg",
};

const PRIORITY_VARIANT: Record<SevPri, BadgeVariant> = {
  low: "navy",
  medium: "warn",
  high: "neg",
};

export function AnalysisResults({ analysis, mode = "full" }: Props) {
  const compact = mode === "compact";
  const sentiment = {
    positive: analysis.sentiment_positive ?? 0,
    neutral: analysis.sentiment_neutral ?? 0,
    negative: analysis.sentiment_negative ?? 0,
    mixed: analysis.sentiment_mixed ?? 0,
  };

  return (
    <div
      data-testid="analysis-results"
      data-mode={mode}
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <SummaryCard
        summary={analysis.summary}
        reviewCount={analysis.review_count}
        createdAt={analysis.created_at}
        compact={compact}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <SentimentCard
          sentiment={sentiment}
          overallScore={analysis.overall_score}
          compact={compact}
        />
        <TopIssuesCard
          complaints={analysis.complaints}
          limit={compact ? 3 : 5}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
        }}
      >
        <StrengthsCard praises={analysis.praises} limit={compact ? 3 : 5} />
        <FeatureRequestsCard
          features={analysis.feature_requests}
          limit={compact ? 3 : 5}
        />
      </div>

      <ActionItemsCard items={analysis.action_items} />

      {!compact && (
        <RatingDistributionCard distribution={analysis.rating_distribution} />
      )}
    </div>
  );
}

function SummaryCard({
  summary,
  reviewCount,
  createdAt,
  compact,
}: {
  summary: string | null;
  reviewCount: number;
  createdAt: string;
  compact: boolean;
}) {
  return (
    <Card padding={compact ? 16 : 20}>
      <div
        data-testid="analysis-summary-card"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          borderLeft: "3px solid var(--teal)",
          paddingLeft: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h3
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: "var(--teal)",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            Executive Summary
          </h3>
          <span
            data-testid="analysis-meta"
            style={{ fontSize: 12, color: "var(--tx3)" }}
          >
            {reviewCount} review{reviewCount === 1 ? "" : "s"} ·{" "}
            {new Date(createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
        {summary ? (
          <p
            data-testid="analysis-summary"
            style={{
              fontSize: 14,
              lineHeight: 1.6,
              color: "var(--tx)",
              margin: 0,
            }}
          >
            {summary}
          </p>
        ) : (
          <p
            data-testid="analysis-summary-empty"
            style={{
              fontSize: 13,
              color: "var(--tx3)",
              margin: 0,
              fontStyle: "italic",
            }}
          >
            No summary generated.
          </p>
        )}
      </div>
    </Card>
  );
}

function SentimentCard({
  sentiment,
  overallScore,
  compact,
}: {
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
  overallScore: number | null;
  compact: boolean;
}) {
  const rows: { label: string; value: number; color: string }[] = [
    { label: "Positive", value: sentiment.positive, color: "var(--pos)" },
    { label: "Neutral", value: sentiment.neutral, color: "var(--tx3)" },
    { label: "Negative", value: sentiment.negative, color: "var(--neg)" },
    { label: "Mixed", value: sentiment.mixed, color: "var(--warn)" },
  ];
  return (
    <Card padding={20}>
      <div data-testid="analysis-sentiment-card">
        <SectionHeading icon="bar" color="var(--teal)" label="Sentiment" />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginTop: 12,
          }}
        >
          <DonutChart data={sentiment} size={compact ? 110 : 140} />
          <ul
            data-testid="analysis-sentiment-legend"
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              flex: 1,
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {rows.map((r) => (
              <li
                key={r.label}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  fontSize: 13,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    color: "var(--tx2)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 2,
                      background: r.color,
                      display: "inline-block",
                    }}
                  />
                  {r.label}
                </span>
                <span
                  style={{
                    fontWeight: 600,
                    color: r.color,
                  }}
                >
                  {r.value}%
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div style={{ marginTop: 12 }}>
          <SentimentBar
            positive={sentiment.positive}
            neutral={sentiment.neutral}
            negative={sentiment.negative + sentiment.mixed}
          />
        </div>
        {typeof overallScore === "number" && (
          <div
            data-testid="analysis-overall-score"
            style={{
              marginTop: 12,
              fontSize: 13,
              color: "var(--tx2)",
            }}
          >
            Overall score:{" "}
            <strong style={{ color: "var(--tx)" }}>{overallScore}</strong>
            /100
          </div>
        )}
      </div>
    </Card>
  );
}

function TopIssuesCard({
  complaints,
  limit,
}: {
  complaints: ComplaintItem[];
  limit: number;
}) {
  const items = complaints.slice(0, limit);
  return (
    <Card padding={20}>
      <div data-testid="analysis-issues-card">
        <SectionHeading icon="warn" color="var(--neg)" label="Top Issues" />
        {items.length === 0 ? (
          <EmptyRow text="No issues found." testId="analysis-issues-empty" />
        ) : (
          <ol
            data-testid="analysis-issues-list"
            style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}
          >
            {items.map((c, i) => (
              <li
                key={`${c.text}-${i}`}
                data-testid={`analysis-issue-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom:
                    i < items.length - 1 ? "1px solid var(--bd)" : "none",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--tx3)",
                    width: 24,
                  }}
                >
                  #{i + 1}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--tx)",
                    }}
                  >
                    {c.text}
                  </div>
                  {typeof c.count === "number" && c.count > 0 && (
                    <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                      {c.count} mention{c.count === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
                <Badge variant={SEVERITY_VARIANT[c.severity]}>
                  {c.severity}
                </Badge>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}

function StrengthsCard({
  praises,
  limit,
}: {
  praises: MentionItem[];
  limit: number;
}) {
  const items = praises.slice(0, limit);
  return (
    <Card padding={20}>
      <div data-testid="analysis-strengths-card">
        <SectionHeading icon="trend" color="var(--pos)" label="Strengths" />
        {items.length === 0 ? (
          <EmptyRow
            text="No strengths flagged yet."
            testId="analysis-strengths-empty"
          />
        ) : (
          <ul
            data-testid="analysis-strengths-list"
            style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}
          >
            {items.map((p, i) => (
              <li
                key={`${p.text}-${i}`}
                data-testid={`analysis-strength-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom:
                    i < items.length - 1 ? "1px solid var(--bd)" : "none",
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: "var(--pos)",
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx)" }}>
                    {p.text}
                  </div>
                  {typeof p.count === "number" && p.count > 0 && (
                    <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                      {p.count} mention{p.count === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function FeatureRequestsCard({
  features,
  limit,
}: {
  features: MentionItem[];
  limit: number;
}) {
  const items = features.slice(0, limit);
  return (
    <Card padding={20}>
      <div data-testid="analysis-features-card">
        <SectionHeading
          icon="bulb"
          color="var(--warn)"
          label="Feature Requests"
        />
        {items.length === 0 ? (
          <EmptyRow
            text="No feature requests detected."
            testId="analysis-features-empty"
          />
        ) : (
          <ul
            data-testid="analysis-features-list"
            style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}
          >
            {items.map((f, i) => (
              <li
                key={`${f.text}-${i}`}
                data-testid={`analysis-feature-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 0",
                  borderBottom:
                    i < items.length - 1 ? "1px solid var(--bd)" : "none",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "var(--tx)" }}>
                    {f.text}
                  </div>
                  {typeof f.count === "number" && f.count > 0 && (
                    <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                      {f.count} request{f.count === 1 ? "" : "s"}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function ActionItemsCard({ items }: { items: ActionItem[] }) {
  return (
    <Card padding={20}>
      <div data-testid="analysis-actions-card">
        <SectionHeading
          icon="tgt"
          color="var(--coral)"
          label="Recommended Actions"
        />
        {items.length === 0 ? (
          <EmptyRow
            text="No action items recommended."
            testId="analysis-actions-empty"
          />
        ) : (
          <ol
            data-testid="analysis-actions-list"
            style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}
          >
            {items.map((a, i) => (
              <li
                key={`${a.title}-${i}`}
                data-testid={`analysis-action-${i}`}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom:
                    i < items.length - 1 ? "1px solid var(--bd)" : "none",
                }}
              >
                <Badge variant={PRIORITY_VARIANT[a.priority]}>
                  {a.priority}
                </Badge>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--tx)",
                      marginBottom: 2,
                    }}
                  >
                    {a.title}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--tx2)",
                      lineHeight: 1.5,
                    }}
                  >
                    {a.description}
                  </div>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </Card>
  );
}

function RatingDistributionCard({
  distribution,
}: {
  distribution: Record<string, number>;
}) {
  const stars = [5, 4, 3, 2, 1] as const;
  const total =
    stars.reduce((acc, s) => acc + (distribution[String(s)] ?? 0), 0) || 0;
  return (
    <Card padding={20}>
      <div data-testid="analysis-rating-card">
        <SectionHeading icon="star" color="var(--warn)" label="Rating Distribution" />
        {total === 0 ? (
          <EmptyRow text="No ratings yet." testId="analysis-rating-empty" />
        ) : (
          <div
            data-testid="analysis-rating-list"
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 12,
            }}
          >
            {stars.map((s) => {
              const count = distribution[String(s)] ?? 0;
              const pct = total > 0 ? (count / total) * 100 : 0;
              const color =
                s >= 4 ? "var(--pos)" : s === 3 ? "var(--warn)" : "var(--neg)";
              return (
                <div
                  key={s}
                  data-testid={`analysis-rating-row-${s}`}
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      width: 28,
                      textAlign: "right",
                      color: "var(--tx2)",
                    }}
                  >
                    {s}★
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: 10,
                      background: "var(--bd)",
                      borderRadius: 5,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      data-testid={`analysis-rating-bar-${s}`}
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: color,
                        borderRadius: 5,
                        transition: "width 200ms ease",
                      }}
                    />
                  </div>
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--tx2)",
                      width: 36,
                      textAlign: "right",
                    }}
                  >
                    {count}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

function SectionHeading({
  icon,
  color,
  label,
}: {
  icon: Parameters<typeof Icon>[0]["name"];
  color: string;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 24,
          height: 24,
          borderRadius: 6,
          background: `color-mix(in srgb, ${color} 14%, transparent)`,
        }}
      >
        <Icon name={icon} size={14} color={color} />
      </span>
      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--tx)" }}>
        {label}
      </span>
    </div>
  );
}

function EmptyRow({ text, testId }: { text: string; testId: string }) {
  return (
    <p
      data-testid={testId}
      style={{
        margin: "12px 0 0",
        fontSize: 13,
        color: "var(--tx3)",
        fontStyle: "italic",
      }}
    >
      {text}
    </p>
  );
}
