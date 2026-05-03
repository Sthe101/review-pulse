import type { ComplaintItem, MentionItem } from "@/lib/analysis/types";

export type Range = "1M" | "3M" | "6M" | "1Y";

export const RANGE_DAYS: Record<Range, number> = {
  "1M": 30,
  "3M": 90,
  "6M": 180,
  "1Y": 365,
};

export type AnalysisPoint = {
  id: string;
  created_at: string;
  sentiment_positive: number | null;
  sentiment_neutral: number | null;
  sentiment_negative: number | null;
  sentiment_mixed: number | null;
  overall_score: number | null;
  review_count: number;
  rating_distribution: Record<string, number>;
  complaints: ComplaintItem[];
  praises: MentionItem[];
};

export function filterByRange(
  points: AnalysisPoint[],
  range: Range,
  now: Date = new Date(),
): AnalysisPoint[] {
  const cutoff = new Date(now.getTime() - RANGE_DAYS[range] * 86_400_000);
  return points.filter((p) => new Date(p.created_at) >= cutoff);
}

export function avgRatingFromDistribution(
  d: Record<string, number>,
): number | null {
  let total = 0;
  let weighted = 0;
  for (const k of ["1", "2", "3", "4", "5"]) {
    const n = d[k] ?? 0;
    total += n;
    weighted += Number(k) * n;
  }
  return total > 0 ? weighted / total : null;
}

export type DeltaTone = "pos" | "neg" | "warn";

export type StatCard = {
  label: string;
  value: string;
  delta: string;
  tone: DeltaTone;
};

export function computeStatCards(asc: AnalysisPoint[]): StatCard[] {
  if (asc.length === 0) return [];
  const first = asc[0]!;
  const last = asc[asc.length - 1]!;

  const sentimentLast = last.overall_score ?? 0;
  const sentimentDelta = sentimentLast - (first.overall_score ?? 0);

  const reviewsTotal = asc.reduce((s, p) => s + p.review_count, 0);
  const halfIdx = Math.max(1, Math.floor(asc.length / 2));
  const firstHalf = asc.slice(0, halfIdx);
  const secondHalf = asc.slice(halfIdx);
  const avgFirst =
    firstHalf.reduce((s, p) => s + p.review_count, 0) /
    Math.max(firstHalf.length, 1);
  const avgSecond =
    secondHalf.reduce((s, p) => s + p.review_count, 0) /
    Math.max(secondHalf.length, 1);
  const reviewsPct =
    avgFirst > 0
      ? Math.round(((avgSecond - avgFirst) / avgFirst) * 100)
      : 0;

  const lastRating = avgRatingFromDistribution(last.rating_distribution);
  const firstRating = avgRatingFromDistribution(first.rating_distribution);
  const ratingDelta =
    lastRating != null && firstRating != null ? lastRating - firstRating : 0;

  const lastNeg = last.sentiment_negative ?? 0;
  const negDelta = lastNeg - (first.sentiment_negative ?? 0);

  return [
    {
      label: "Sentiment",
      value: `${Math.round(sentimentLast)}/100`,
      delta:
        sentimentDelta === 0
          ? "stable"
          : `${sentimentDelta > 0 ? "+" : ""}${Math.round(sentimentDelta)}`,
      tone: sentimentDelta > 0 ? "pos" : sentimentDelta < 0 ? "neg" : "warn",
    },
    {
      label: "Reviews",
      value: String(reviewsTotal),
      delta:
        reviewsPct === 0
          ? "stable"
          : `${reviewsPct > 0 ? "↑" : "↓"} ${Math.abs(reviewsPct)}%`,
      tone: reviewsPct > 0 ? "pos" : reviewsPct < 0 ? "warn" : "warn",
    },
    {
      label: "Rating",
      value: lastRating != null ? `${lastRating.toFixed(1)}★` : "—",
      delta:
        ratingDelta === 0
          ? "stable"
          : `${ratingDelta > 0 ? "+" : ""}${ratingDelta.toFixed(1)}`,
      tone: ratingDelta > 0 ? "pos" : ratingDelta < 0 ? "neg" : "warn",
    },
    {
      label: "Negative %",
      value: `${Math.round(lastNeg)}%`,
      delta:
        negDelta === 0
          ? "stable"
          : `${negDelta > 0 ? "+" : ""}${Math.round(negDelta)}%`,
      tone: negDelta < 0 ? "pos" : negDelta > 0 ? "neg" : "warn",
    },
  ];
}

export type SentimentSeries = {
  labels: string[];
  scores: number[];
  positive: number[];
  neutral: number[];
  negative: number[];
};

export function buildSentimentSeries(asc: AnalysisPoint[]): SentimentSeries {
  return {
    labels: asc.map((p) => formatShortDate(p.created_at)),
    scores: asc.map((p) => p.overall_score ?? 0),
    positive: asc.map((p) => p.sentiment_positive ?? 0),
    neutral: asc.map((p) => p.sentiment_neutral ?? 0),
    negative: asc.map((p) => p.sentiment_negative ?? 0),
  };
}

function formatShortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 7);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export type TopicSeries = {
  name: string;
  source: "complaint" | "praise";
  data: number[];
  total: number;
  changePct: number;
  direction: "up" | "down" | "flat";
};

function normalizeTopic(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

export function buildTopicSeries(
  asc: AnalysisPoint[],
  topN = 6,
): TopicSeries[] {
  if (asc.length === 0) return [];
  const map = new Map<
    string,
    { source: "complaint" | "praise"; displayName: string; counts: number[] }
  >();
  asc.forEach((analysis, idx) => {
    for (const c of analysis.complaints) {
      const key = `c::${normalizeTopic(c.text)}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          source: "complaint",
          displayName: c.text,
          counts: new Array(asc.length).fill(0),
        };
        map.set(key, entry);
      }
      entry.counts[idx] = (entry.counts[idx] ?? 0) + (c.count ?? 1);
    }
    for (const p of analysis.praises) {
      const key = `p::${normalizeTopic(p.text)}`;
      let entry = map.get(key);
      if (!entry) {
        entry = {
          source: "praise",
          displayName: p.text,
          counts: new Array(asc.length).fill(0),
        };
        map.set(key, entry);
      }
      entry.counts[idx] = (entry.counts[idx] ?? 0) + (p.count ?? 1);
    }
  });

  const series: TopicSeries[] = Array.from(map.values()).map((e) => {
    const total = e.counts.reduce((s, n) => s + n, 0);
    const first = e.counts[0] ?? 0;
    const last = e.counts[e.counts.length - 1] ?? 0;
    const change =
      first === 0 ? (last > 0 ? 100 : 0) : Math.round(((last - first) / first) * 100);
    const direction: "up" | "down" | "flat" =
      change > 5 ? "up" : change < -5 ? "down" : "flat";
    return {
      name: e.displayName,
      source: e.source,
      data: e.counts,
      total,
      changePct: change,
      direction,
    };
  });

  return series.sort((a, b) => b.total - a.total).slice(0, topN);
}

export type Signal = {
  name: string;
  delta: string;
  severity: "critical" | "high" | "medium";
  isNew: boolean;
  source: "complaint" | "praise";
};

function aggregateTopicCounts(
  points: AnalysisPoint[],
  source: "complaint" | "praise",
): Map<string, { count: number; displayName: string }> {
  const m = new Map<string, { count: number; displayName: string }>();
  for (const p of points) {
    const items = source === "complaint" ? p.complaints : p.praises;
    for (const i of items) {
      const key = normalizeTopic(i.text);
      const cur = m.get(key);
      if (cur) cur.count += i.count ?? 1;
      else m.set(key, { count: i.count ?? 1, displayName: i.text });
    }
  }
  return m;
}

export function emergingIssues(asc: AnalysisPoint[], topN = 3): Signal[] {
  if (asc.length < 2) return [];
  const halfIdx = Math.max(1, Math.floor(asc.length / 2));
  const firstHalf = asc.slice(0, halfIdx);
  const secondHalf = asc.slice(halfIdx);
  const before = aggregateTopicCounts(firstHalf, "complaint");
  const after = aggregateTopicCounts(secondHalf, "complaint");

  const seen = new Set<string>([...before.keys(), ...after.keys()]);
  const signals: Signal[] = [];
  for (const key of seen) {
    const b = before.get(key);
    const a = after.get(key);
    const beforeCount = b?.count ?? 0;
    const afterCount = a?.count ?? 0;
    if (afterCount <= beforeCount) continue;
    const isNew = beforeCount === 0;
    const delta = isNew
      ? 100
      : Math.round(((afterCount - beforeCount) / beforeCount) * 100);
    if (!isNew && delta < 20) continue;
    const displayName = a?.displayName ?? b?.displayName ?? "";
    const severity: Signal["severity"] = isNew
      ? "high"
      : delta >= 50
        ? "critical"
        : delta >= 30
          ? "high"
          : "medium";
    signals.push({
      name: isNew ? `'${displayName}' new` : `'${displayName}' up ${delta}%`,
      delta: isNew ? "NEW" : `+${delta}%`,
      severity,
      isNew,
      source: "complaint",
    });
  }
  return signals
    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
    .slice(0, topN);
}

function severityRank(s: Signal["severity"]): number {
  return s === "critical" ? 3 : s === "high" ? 2 : 1;
}

export function improvingSignals(asc: AnalysisPoint[], topN = 3): Signal[] {
  if (asc.length < 2) return [];
  const halfIdx = Math.max(1, Math.floor(asc.length / 2));
  const firstHalf = asc.slice(0, halfIdx);
  const secondHalf = asc.slice(halfIdx);

  const signals: Signal[] = [];

  const beforeP = aggregateTopicCounts(firstHalf, "praise");
  const afterP = aggregateTopicCounts(secondHalf, "praise");
  for (const key of new Set([...beforeP.keys(), ...afterP.keys()])) {
    const b = beforeP.get(key);
    const a = afterP.get(key);
    const beforeCount = b?.count ?? 0;
    const afterCount = a?.count ?? 0;
    if (afterCount <= beforeCount) continue;
    const delta =
      beforeCount === 0
        ? 100
        : Math.round(((afterCount - beforeCount) / beforeCount) * 100);
    if (delta < 15) continue;
    const displayName = a?.displayName ?? b?.displayName ?? "";
    signals.push({
      name: `${displayName} praise up ${delta}%`,
      delta: `+${delta}%`,
      severity: "medium",
      isNew: beforeCount === 0,
      source: "praise",
    });
  }

  const beforeC = aggregateTopicCounts(firstHalf, "complaint");
  const afterC = aggregateTopicCounts(secondHalf, "complaint");
  for (const key of beforeC.keys()) {
    const b = beforeC.get(key)!;
    const a = afterC.get(key);
    const beforeCount = b.count;
    const afterCount = a?.count ?? 0;
    if (beforeCount === 0 || afterCount >= beforeCount) continue;
    const delta = Math.round(((beforeCount - afterCount) / beforeCount) * 100);
    if (delta < 15) continue;
    signals.push({
      name: `${b.displayName} complaints down ${delta}%`,
      delta: `+${delta}%`,
      severity: "medium",
      isNew: false,
      source: "complaint",
    });
  }

  return signals
    .sort(
      (a, b) =>
        Number(b.delta.replace(/[^0-9]/g, "")) -
        Number(a.delta.replace(/[^0-9]/g, "")),
    )
    .slice(0, topN);
}
