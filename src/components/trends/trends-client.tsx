"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";
import { EmptyState } from "@/components/ui/empty-state";
import type { Industry } from "@/types/database";
import {
  buildSentimentSeries,
  buildTopicSeries,
  computeStatCards,
  emergingIssues,
  filterByRange,
  improvingSignals,
  avgRatingFromDistribution,
  type AnalysisPoint,
  type Range,
  type StatCard as StatCardData,
  type TopicSeries,
  type Signal,
} from "@/lib/trends/aggregate";
import { getBenchmarks } from "@/lib/trends/benchmarks";

type ProjectListItem = {
  id: string;
  name: string;
  industry: Industry;
};

type Props = {
  projects: ProjectListItem[];
  selectedProjectId: string;
  industry: Industry;
  analyses: AnalysisPoint[];
  initialRange: Range;
};

const RANGES: Range[] = ["1M", "3M", "6M", "1Y"];

export function TrendsClient({
  projects,
  selectedProjectId,
  industry,
  analyses,
  initialRange,
}: Props) {
  const router = useRouter();
  const [range, setRange] = useState<Range>(initialRange);
  const [selectedTopic, setSelectedTopic] = useState<string>("All");

  const filtered = useMemo(
    () => filterByRange(analyses, range),
    [analyses, range],
  );

  const statCards = useMemo(() => computeStatCards(filtered), [filtered]);
  const sentimentSeries = useMemo(
    () => buildSentimentSeries(filtered),
    [filtered],
  );
  const topics = useMemo(() => buildTopicSeries(filtered, 6), [filtered]);
  const emerging = useMemo(() => emergingIssues(filtered, 3), [filtered]);
  const improving = useMemo(() => improvingSignals(filtered, 3), [filtered]);

  const benchmarks = getBenchmarks(industry);
  const lastPoint = filtered[filtered.length - 1] ?? null;
  const userRating =
    lastPoint != null
      ? avgRatingFromDistribution(lastPoint.rating_distribution)
      : null;

  function changeProject(id: string) {
    const url = new URL(window.location.href);
    url.searchParams.set("project", id);
    router.push(`${url.pathname}?${url.searchParams.toString()}`);
  }

  function changeRange(r: Range) {
    setRange(r);
    setSelectedTopic("All");
  }

  if (analyses.length < 2) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <Header
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={changeProject}
          range={range}
          onRangeChange={changeRange}
        />
        <EmptyState
          icon="trend"
          title="Not enough data yet"
          description="You need at least two analyses on this project to see trends. Run another analysis to start tracking changes over time."
        />
        <div>
          <Link
            href={`/projects/${selectedProjectId}?tab=add-reviews`}
            style={{
              color: "var(--teal)",
              fontWeight: 600,
              textDecoration: "none",
              fontSize: 14,
            }}
          >
            Add reviews and run an analysis →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Header
        projects={projects}
        selectedProjectId={selectedProjectId}
        onProjectChange={changeProject}
        range={range}
        onRangeChange={changeRange}
      />

      {filtered.length < 2 ? (
        <Card padding={24}>
          <p
            data-testid="trends-range-empty"
            style={{
              color: "var(--tx2)",
              margin: 0,
              fontSize: 14,
              lineHeight: 1.5,
            }}
          >
            No analyses in this range. Try a wider range above.
          </p>
        </Card>
      ) : (
        <>
          <StatCardGrid cards={statCards} />
          <SentimentLineChart series={sentimentSeries} />
          <SentimentStackedBars series={sentimentSeries} />
          <TopicTracking
            topics={topics}
            selected={selectedTopic}
            onSelect={setSelectedTopic}
          />
          <Benchmarks
            industry={industry}
            userScore={lastPoint?.overall_score ?? null}
            userNegative={lastPoint?.sentiment_negative ?? null}
            userRating={userRating}
            benchmarks={benchmarks}
          />
          <SignalGrid emerging={emerging} improving={improving} />
        </>
      )}
    </div>
  );
}

function Header({
  projects,
  selectedProjectId,
  onProjectChange,
  range,
  onRangeChange,
}: {
  projects: ProjectListItem[];
  selectedProjectId: string;
  onProjectChange: (id: string) => void;
  range: Range;
  onRangeChange: (r: Range) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
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
        <select
          data-testid="trends-project-select"
          value={selectedProjectId}
          onChange={(e) => onProjectChange(e.target.value)}
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--bd)",
            borderRadius: 8,
            padding: "6px 10px",
            color: "var(--tx)",
            fontSize: 13,
            fontWeight: 500,
            maxWidth: 320,
          }}
          aria-label="Select project"
        >
          {projects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div
        role="tablist"
        aria-label="Time range"
        data-testid="trends-range-picker"
        style={{
          display: "flex",
          gap: 4,
          background: "var(--bg3)",
          borderRadius: 8,
          padding: 2,
        }}
      >
        {RANGES.map((r) => {
          const active = r === range;
          return (
            <button
              key={r}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`trends-range-${r}`}
              onClick={() => onRangeChange(r)}
              style={{
                background: active ? "var(--bg2)" : "transparent",
                color: active ? "var(--tx)" : "var(--tx2)",
                padding: "6px 12px",
                fontSize: 13,
                fontWeight: active ? 600 : 400,
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              }}
            >
              {r}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatCardGrid({ cards }: { cards: StatCardData[] }) {
  return (
    <div
      data-testid="trends-stat-cards"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
        gap: 12,
      }}
    >
      {cards.map((c) => {
        const color =
          c.tone === "pos"
            ? "var(--pos)"
            : c.tone === "neg"
              ? "var(--neg)"
              : "var(--warn)";
        return (
          <Card key={c.label} padding={16}>
            <div
              style={{
                fontSize: 11,
                color: "var(--tx3)",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                fontWeight: 600,
                marginBottom: 4,
              }}
            >
              {c.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: "var(--tx)" }}>
              {c.value}
            </div>
            <div style={{ fontSize: 12, color, fontWeight: 500 }}>
              {c.delta}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function SentimentLineChart({
  series,
}: {
  series: ReturnType<typeof buildSentimentSeries>;
}) {
  const points = series.scores;
  const max = Math.max(...points, 100);
  const min = Math.min(...points, 0);
  const range = Math.max(max - min, 1);
  const pts = points.map((v, i) => ({
    x: points.length > 1 ? (i * 100) / (points.length - 1) : 50,
    y: 100 - ((v - min) / range) * 100,
  }));
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");

  return (
    <Card padding={24}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 16 }}>
        Sentiment Over Time
      </div>
      <div
        style={{ height: 160, marginBottom: 8 }}
        data-testid="trends-line-chart"
      >
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%" }}
          aria-label="Sentiment score over time"
          role="img"
        >
          <defs>
            <linearGradient id="sentiment-area" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0D9488" stopOpacity="0.2" />
              <stop offset="100%" stopColor="#0D9488" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {[20, 40, 60, 80].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="var(--bd)"
              strokeWidth="0.3"
            />
          ))}
          {pts.length > 1 && (
            <path d={`${path} L100,100 L0,100 Z`} fill="url(#sentiment-area)" />
          )}
          <path
            d={path}
            fill="none"
            stroke="var(--teal)"
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.6"
              fill="var(--bg2)"
              stroke="var(--teal)"
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: 4,
          flexWrap: "wrap",
        }}
      >
        {series.labels.map((label, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1, minWidth: 36 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>
              {Math.round(points[i] ?? 0)}
            </div>
            <div style={{ fontSize: 10, color: "var(--tx3)" }}>{label}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function SentimentStackedBars({
  series,
}: {
  series: ReturnType<typeof buildSentimentSeries>;
}) {
  return (
    <Card padding={24}>
      <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 12 }}>
        Sentiment Breakdown
      </div>
      <div
        style={{
          display: "flex",
          gap: 16,
          fontSize: 12,
          marginBottom: 12,
          color: "var(--tx2)",
        }}
      >
        {[
          ["Positive", "var(--pos)"],
          ["Neutral", "#94A3B8"],
          ["Negative", "var(--neg)"],
        ].map(([label, color]) => (
          <span
            key={label}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 2,
                background: color,
                display: "inline-block",
              }}
            />
            {label}
          </span>
        ))}
      </div>
      <div
        data-testid="trends-stacked-bars"
        style={{ display: "flex", flexDirection: "column", gap: 8 }}
      >
        {series.labels.map((label, i) => {
          const pos = series.positive[i] ?? 0;
          const neu = series.neutral[i] ?? 0;
          const neg = series.negative[i] ?? 0;
          const total = pos + neu + neg || 1;
          const segs: Array<[number, string]> = [
            [(pos / total) * 100, "var(--pos)"],
            [(neu / total) * 100, "#94A3B8"],
            [(neg / total) * 100, "var(--neg)"],
          ];
          return (
            <div
              key={i}
              style={{ display: "flex", alignItems: "center", gap: 12 }}
            >
              <span
                style={{
                  width: 56,
                  fontSize: 12,
                  color: "var(--tx2)",
                  fontWeight: 500,
                }}
              >
                {label}
              </span>
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  borderRadius: 4,
                  overflow: "hidden",
                  height: 24,
                  background: "var(--bg3)",
                }}
              >
                {segs.map(([w, color], idx) => (
                  <div
                    key={idx}
                    style={{
                      width: `${w}%`,
                      background: color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 10,
                      color: "#fff",
                      fontWeight: 600,
                    }}
                  >
                    {w >= 8 ? `${Math.round(w)}%` : ""}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TopicTracking({
  topics,
  selected,
  onSelect,
}: {
  topics: TopicSeries[];
  selected: string;
  onSelect: (name: string) => void;
}) {
  const current = topics.find((t) => t.name === selected) ?? null;

  return (
    <Card padding={24}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16 }}>Topic Tracking</div>
        <select
          value={selected}
          onChange={(e) => onSelect(e.target.value)}
          aria-label="Topic"
          data-testid="trends-topic-select"
          style={{
            background: "var(--bg2)",
            border: "1px solid var(--bd)",
            borderRadius: 8,
            padding: "6px 10px",
            color: "var(--tx)",
            fontSize: 13,
          }}
        >
          <option value="All">All</option>
          {topics.map((t) => (
            <option key={t.name} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {topics.length === 0 ? (
        <p style={{ fontSize: 13, color: "var(--tx3)", margin: 0 }}>
          No recurring topics detected yet.
        </p>
      ) : !current ? (
        <div
          data-testid="trends-topic-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 12,
          }}
        >
          {topics.map((t) => (
            <TopicSparkCard key={t.name} topic={t} onSelect={onSelect} />
          ))}
        </div>
      ) : (
        <TopicDetail
          topic={current}
          onBack={() => onSelect("All")}
        />
      )}
    </Card>
  );
}

function TopicSparkCard({
  topic,
  onSelect,
}: {
  topic: TopicSeries;
  onSelect: (name: string) => void;
}) {
  const peak = Math.max(...topic.data, 1);
  const sourceColor =
    topic.source === "praise" ? "var(--pos)" : "var(--neg)";
  const dirColor =
    topic.direction === "up"
      ? topic.source === "praise"
        ? "var(--pos)"
        : "var(--neg)"
      : topic.direction === "down"
        ? topic.source === "praise"
          ? "var(--neg)"
          : "var(--pos)"
        : "var(--tx3)";

  return (
    <button
      type="button"
      onClick={() => onSelect(topic.name)}
      data-testid="trends-topic-card"
      style={{
        background: "var(--bg2)",
        border: "1px solid var(--bd)",
        borderRadius: 12,
        padding: 16,
        textAlign: "left",
        cursor: "pointer",
        font: "inherit",
        color: "var(--tx)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span
          style={{
            fontWeight: 600,
            fontSize: 13,
            color: "var(--tx)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
          title={topic.name}
        >
          {topic.name}
        </span>
        <span style={{ fontSize: 12, fontWeight: 600, color: dirColor }}>
          {topic.changePct > 0 ? "+" : ""}
          {topic.changePct}%
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 3,
          height: 36,
        }}
      >
        {topic.data.map((v, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              background: `color-mix(in srgb, ${sourceColor} 30%, transparent)`,
              borderRadius: "2px 2px 0 0",
              height: `${(v / peak) * 100}%`,
              minHeight: 2,
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 11, color: "var(--tx3)" }}>
        {topic.source === "complaint" ? "Complaint" : "Praise"} · {topic.total}{" "}
        mention{topic.total === 1 ? "" : "s"}
      </div>
    </button>
  );
}

function TopicDetail({
  topic,
  onBack,
}: {
  topic: TopicSeries;
  onBack: () => void;
}) {
  const peak = Math.max(...topic.data, 1);
  const pts = topic.data.map((v, i) => ({
    x: topic.data.length > 1 ? (i * 100) / (topic.data.length - 1) : 50,
    y: 100 - (v / peak) * 100,
  }));
  const path = pts
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`)
    .join(" ");
  const color = topic.source === "praise" ? "var(--pos)" : "var(--neg)";

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--tx)" }}>{topic.name}</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            padding: "2px 8px",
            borderRadius: 999,
            color,
            background: `color-mix(in srgb, ${color} 12%, transparent)`,
          }}
        >
          {topic.changePct > 0 ? "+" : ""}
          {topic.changePct}%
        </span>
        <button
          type="button"
          onClick={onBack}
          className="btn btn-outline"
          style={{ marginLeft: "auto", padding: "4px 12px", fontSize: 12 }}
        >
          All topics
        </button>
      </div>
      <div style={{ height: 120, marginBottom: 8 }}>
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          style={{ width: "100%", height: "100%" }}
          aria-label={`${topic.name} mentions over time`}
          role="img"
        >
          {[25, 50, 75].map((y) => (
            <line
              key={y}
              x1="0"
              y1={y}
              x2="100"
              y2={y}
              stroke="var(--bd)"
              strokeWidth="0.3"
            />
          ))}
          <path
            d={path}
            fill="none"
            stroke={color}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
          {pts.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r="1.6"
              fill="var(--bg2)"
              stroke={color}
              strokeWidth="1.5"
              vectorEffect="non-scaling-stroke"
            />
          ))}
        </svg>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 4 }}>
        {topic.data.map((v, i) => (
          <div key={i} style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--tx)" }}>
              {v}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Benchmarks({
  industry,
  userScore,
  userNegative,
  userRating,
  benchmarks,
}: {
  industry: Industry;
  userScore: number | null;
  userNegative: number | null;
  userRating: number | null;
  benchmarks: ReturnType<typeof getBenchmarks>;
}) {
  const rows: Array<{
    label: string;
    you: string;
    avg: string;
    ahead: boolean | null;
  }> = [
    {
      label: "Sentiment",
      you: userScore != null ? `${Math.round(userScore)}` : "—",
      avg: `${benchmarks.sentimentScore}`,
      ahead:
        userScore != null ? userScore >= benchmarks.sentimentScore : null,
    },
    {
      label: "Negative %",
      you: userNegative != null ? `${Math.round(userNegative)}%` : "—",
      avg: `${benchmarks.negativePct}%`,
      ahead:
        userNegative != null ? userNegative <= benchmarks.negativePct : null,
    },
    {
      label: "Rating",
      you: userRating != null ? `${userRating.toFixed(1)}★` : "—",
      avg: `${benchmarks.rating.toFixed(1)}★`,
      ahead: userRating != null ? userRating >= benchmarks.rating : null,
    },
  ];

  return (
    <Card padding={24}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 4,
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div style={{ fontWeight: 600, fontSize: 16 }}>Industry Benchmarks</div>
        <span style={{ fontSize: 11, color: "var(--tx3)" }}>{industry}</span>
      </div>
      <p
        style={{
          fontSize: 11,
          color: "var(--tx3)",
          margin: "0 0 12px",
          fontStyle: "italic",
        }}
      >
        Estimated industry averages — for orientation, not exact figures.
      </p>
      <div data-testid="trends-benchmarks">
        {rows.map((row, i) => {
          const last = i === rows.length - 1;
          const aheadColor =
            row.ahead == null
              ? "var(--tx3)"
              : row.ahead
                ? "var(--pos)"
                : "var(--neg)";
          const aheadBg =
            row.ahead == null
              ? "var(--bg3)"
              : `color-mix(in srgb, ${aheadColor} 12%, transparent)`;
          const label =
            row.ahead == null ? "—" : row.ahead ? "Ahead" : "Below";
          return (
            <div
              key={row.label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "12px 0",
                borderBottom: last ? "none" : "1px solid var(--bd)",
              }}
            >
              <span
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: 500,
                  color: "var(--tx)",
                }}
              >
                {row.label}
              </span>
              <div style={{ textAlign: "right", width: 60 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--teal)",
                  }}
                >
                  {row.you}
                </div>
                <div style={{ fontSize: 11, color: "var(--tx3)" }}>You</div>
              </div>
              <div style={{ textAlign: "right", width: 60 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "var(--tx2)",
                  }}
                >
                  {row.avg}
                </div>
                <div style={{ fontSize: 11, color: "var(--tx3)" }}>Avg</div>
              </div>
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: 999,
                  color: aheadColor,
                  background: aheadBg,
                  minWidth: 56,
                  textAlign: "center",
                }}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function SignalGrid({
  emerging,
  improving,
}: {
  emerging: Signal[];
  improving: Signal[];
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: 16,
      }}
    >
      <SignalCard
        title="Emerging Issues"
        icon="warn"
        accent="var(--neg)"
        signals={emerging}
        emptyText="No emerging issues in this range."
        testId="trends-emerging"
      />
      <SignalCard
        title="Improving"
        icon="trend"
        accent="var(--pos)"
        signals={improving}
        emptyText="No clear improvements in this range."
        testId="trends-improving"
      />
    </div>
  );
}

function SignalCard({
  title,
  icon,
  accent,
  signals,
  emptyText,
  testId,
}: {
  title: string;
  icon: "warn" | "trend";
  accent: string;
  signals: Signal[];
  emptyText: string;
  testId: string;
}) {
  return (
    <Card padding={20}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <Icon name={icon} size={18} color={accent} />
        <span style={{ fontWeight: 600, fontSize: 15, color: "var(--tx)" }}>
          {title}
        </span>
      </div>
      <div data-testid={testId}>
        {signals.length === 0 ? (
          <div style={{ fontSize: 13, color: "var(--tx3)", padding: "8px 0" }}>
            {emptyText}
          </div>
        ) : (
          signals.map((s, i) => {
            const last = i === signals.length - 1;
            const sevColor =
              s.severity === "critical"
                ? "var(--neg)"
                : s.severity === "high"
                  ? "var(--warn)"
                  : accent;
            return (
              <div
                key={`${s.name}-${i}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "10px 0",
                  borderBottom: last ? "none" : "1px solid var(--bd)",
                }}
              >
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 999,
                    color: sevColor,
                    background: `color-mix(in srgb, ${sevColor} 12%, transparent)`,
                    minWidth: 48,
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {s.delta}
                </span>
                <span style={{ fontSize: 13, color: "var(--tx)" }}>
                  {s.name}
                </span>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
