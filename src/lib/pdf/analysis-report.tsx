import {
  Document,
  type DocumentProps,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Circle,
  G,
} from "@react-pdf/renderer";
import type { ReactElement } from "react";
import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

export type PdfReportInput = {
  project: { name: string; industry: string; review_source: string };
  analysis: {
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
};

const COLORS = {
  bg: "#FFFFFF",
  bg2: "#F8FAFC",
  tx: "#0F172A",
  tx2: "#475569",
  tx3: "#94A3B8",
  bd: "#E2E8F0",
  teal: "#0D9488",
  tealBg: "#F0FDFA",
  navy: "#1E3A5F",
  navyBg: "#EFF6FF",
  pos: "#059669",
  posBg: "#D1FAE5",
  neg: "#DC2626",
  negBg: "#FEE2E2",
  warn: "#D97706",
  warnBg: "#FEF3C7",
  coralBg: "#FFEDD5",
};

const SEV: Record<string, { color: string; bg: string }> = {
  high: { color: COLORS.neg, bg: COLORS.negBg },
  medium: { color: COLORS.warn, bg: COLORS.warnBg },
  low: { color: COLORS.pos, bg: COLORS.posBg },
};

const PRIORITY_LABEL: Record<string, string> = {
  high: "P1",
  medium: "P2",
  low: "P3",
};

const PRIORITY_BG: Record<string, string> = {
  high: COLORS.negBg,
  medium: COLORS.coralBg,
  low: COLORS.navyBg,
};

const PRIORITY_FG: Record<string, string> = {
  high: COLORS.neg,
  medium: "#EA580C",
  low: COLORS.navy,
};

const styles = StyleSheet.create({
  page: {
    backgroundColor: COLORS.bg,
    color: COLORS.tx,
    fontSize: 11,
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    marginBottom: 28,
    borderBottomWidth: 2,
    borderBottomColor: COLORS.teal,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  brandText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: 700,
    color: COLORS.navy,
  },
  caption: {
    fontSize: 9,
    color: COLORS.tx3,
    textTransform: "uppercase",
    letterSpacing: 1,
    textAlign: "right",
  },
  date: { fontSize: 10, color: COLORS.tx2, textAlign: "right" },
  h1: { fontSize: 22, fontWeight: 700, color: COLORS.tx, marginBottom: 4 },
  meta: { fontSize: 10, color: COLORS.tx2 },
  scoreCard: {
    flexDirection: "row",
    backgroundColor: COLORS.tealBg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.bd,
    padding: 18,
    marginTop: 18,
    marginBottom: 22,
  },
  scoreLabel: {
    fontSize: 9,
    color: COLORS.teal,
    textTransform: "uppercase",
    fontWeight: 700,
    letterSpacing: 1,
    marginBottom: 6,
  },
  legendRow: { flexDirection: "row", marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", marginRight: 14 },
  legendSwatch: { width: 7, height: 7, borderRadius: 1, marginRight: 4 },
  legendText: { fontSize: 9, color: COLORS.tx2 },
  legendVal: { fontSize: 9, fontWeight: 700 },
  bar: {
    height: 7,
    flexDirection: "row",
    borderRadius: 999,
    overflow: "hidden",
    backgroundColor: COLORS.bd,
  },
  h2: {
    fontSize: 13,
    fontWeight: 700,
    color: COLORS.navy,
    marginBottom: 8,
    marginTop: 4,
  },
  body: { fontSize: 11, lineHeight: 1.5, color: COLORS.tx2 },
  section: { marginBottom: 18 },
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  ratingLabel: {
    width: 18,
    fontSize: 10,
    textAlign: "right",
    color: COLORS.tx2,
    marginRight: 6,
  },
  ratingTrack: {
    height: 7,
    backgroundColor: COLORS.bd,
    borderRadius: 4,
    flex: 1,
  },
  ratingCount: { fontSize: 10, color: COLORS.tx2, width: 24, marginLeft: 6 },
  table: { marginTop: 4 },
  th: {
    flexDirection: "row",
    borderBottomWidth: 1.5,
    borderBottomColor: COLORS.bd,
    paddingVertical: 6,
  },
  thText: { fontSize: 9, color: COLORS.tx2, fontWeight: 700 },
  tr: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bd,
    paddingVertical: 7,
  },
  td: { fontSize: 10, color: COLORS.tx },
  tdMuted: { fontSize: 10, color: COLORS.tx2 },
  pill: {
    fontSize: 8,
    fontWeight: 700,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  actionRow: {
    flexDirection: "row",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.bd,
  },
  actionTitle: {
    fontSize: 11,
    fontWeight: 700,
    color: COLORS.tx,
    marginBottom: 2,
  },
  actionDesc: { fontSize: 10, color: COLORS.tx2, marginBottom: 4 },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.bd,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  footerText: { fontSize: 9, color: COLORS.tx3 },
});

function Logo({ size = 20 }: { size?: number }): ReactElement {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Rect x="4" y="18" width="5" height="10" rx="1.5" fill={COLORS.teal} />
      <Rect x="13" y="10" width="5" height="18" rx="1.5" fill={COLORS.navy} />
      <Rect x="22" y="14" width="5" height="14" rx="1.5" fill={COLORS.teal} />
      <Path
        d="M2 16 Q8 8 16 12 Q24 6 30 10"
        stroke="#EA580C"
        strokeWidth={2.5}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  );
}

function Donut({
  data,
  size = 90,
}: {
  data: { positive: number; neutral: number; negative: number; mixed: number };
  size?: number;
}): ReactElement {
  const total =
    data.positive + data.neutral + data.negative + data.mixed || 1;
  const colors: Record<keyof typeof data, string> = {
    positive: COLORS.pos,
    neutral: COLORS.tx3,
    negative: COLORS.neg,
    mixed: COLORS.warn,
  };
  const r = 45;
  const cx = 50;
  const cy = 50;
  let start = 0;
  const segments: ReactElement[] = [];
  (Object.keys(data) as (keyof typeof data)[]).forEach((k) => {
    const v = data[k];
    if (v <= 0) return;
    const angle = (v / total) * 360;
    const end = start + angle;
    const sr = ((start - 90) * Math.PI) / 180;
    const er = ((end - 90) * Math.PI) / 180;
    const large = angle > 180 ? 1 : 0;
    const x1 = cx + r * Math.cos(sr);
    const y1 = cy + r * Math.sin(sr);
    const x2 = cx + r * Math.cos(er);
    const y2 = cy + r * Math.sin(er);
    segments.push(
      <Path
        key={k}
        d={`M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z`}
        fill={colors[k]}
      />,
    );
    start = end;
  });
  const score = Math.round((data.positive / total) * 100);
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <G>{segments}</G>
      <Circle cx={50} cy={50} r={28} fill="#FFFFFF" />
      <Text
        style={{ fontSize: 18, fontWeight: 700 }}
        x={50}
        y={48}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ textAnchor: "middle", fill: COLORS.tx } as any)}
      >
        {String(score)}
      </Text>
      <Text
        style={{ fontSize: 7 }}
        x={50}
        y={60}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {...({ textAnchor: "middle", fill: COLORS.tx2 } as any)}
      >
        SCORE
      </Text>
    </Svg>
  );
}

function pct(n: number | null | undefined): number {
  if (n === null || n === undefined || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(100, n));
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function shareOf(count: number, total: number): string {
  if (total <= 0) return "0%";
  return `${Math.round((count / total) * 100)}%`;
}

export function AnalysisReportPdf({
  project,
  analysis,
}: PdfReportInput): ReactElement<DocumentProps> {
  const sentiment = {
    positive: pct(analysis.sentiment_positive),
    neutral: pct(analysis.sentiment_neutral),
    negative: pct(analysis.sentiment_negative),
    mixed: pct(analysis.sentiment_mixed),
  };
  const total = analysis.review_count;
  const ratingTotal = Object.values(analysis.rating_distribution).reduce(
    (a, b) => a + b,
    0,
  );
  const dateLabel = formatDate(analysis.created_at);

  return (
    <Document
      title={`${project.name} — Analysis Report`}
      author="ReviewPulse"
      creator="ReviewPulse"
      producer="ReviewPulse"
    >
      {/* PAGE 1 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <Logo size={24} />
            <Text style={styles.brandText}>ReviewPulse</Text>
          </View>
          <View>
            <Text style={styles.caption}>Analysis Report</Text>
            <Text style={styles.date}>{dateLabel}</Text>
          </View>
        </View>

        <View style={{ marginBottom: 14 }}>
          <Text style={styles.h1}>{project.name}</Text>
          <Text style={styles.meta}>
            {project.industry}  ·  {analysis.review_count} reviews analyzed  ·{" "}
            {project.review_source}
          </Text>
        </View>

        <View style={styles.scoreCard}>
          <Donut data={sentiment} size={90} />
          <View style={{ flex: 1, marginLeft: 16 }}>
            <Text style={styles.scoreLabel}>Overall Sentiment Score</Text>
            <View style={styles.legendRow}>
              {(
                [
                  ["Positive", sentiment.positive, COLORS.pos],
                  ["Neutral", sentiment.neutral, COLORS.tx3],
                  ["Negative", sentiment.negative, COLORS.neg],
                  ["Mixed", sentiment.mixed, COLORS.warn],
                ] as Array<[string, number, string]>
              ).map(([label, val, color]) => (
                <View key={label} style={styles.legendItem}>
                  <View
                    style={[styles.legendSwatch, { backgroundColor: color }]}
                  />
                  <Text style={styles.legendText}>{label} </Text>
                  <Text style={[styles.legendVal, { color }]}>
                    {Math.round(val)}%
                  </Text>
                </View>
              ))}
            </View>
            <View style={styles.bar}>
              <View
                style={{
                  width: `${sentiment.positive}%`,
                  backgroundColor: COLORS.pos,
                }}
              />
              <View
                style={{
                  width: `${sentiment.neutral}%`,
                  backgroundColor: COLORS.tx3,
                }}
              />
              <View
                style={{
                  width: `${sentiment.negative}%`,
                  backgroundColor: COLORS.neg,
                }}
              />
              <View
                style={{
                  width: `${sentiment.mixed}%`,
                  backgroundColor: COLORS.warn,
                }}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Executive Summary</Text>
          <Text style={styles.body}>
            {analysis.summary ?? "No summary available."}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Rating Distribution</Text>
          <View style={{ maxWidth: 320 }}>
            {[5, 4, 3, 2, 1].map((s) => {
              const count = analysis.rating_distribution[String(s)] ?? 0;
              const width =
                ratingTotal > 0 ? (count / ratingTotal) * 100 : 0;
              const color =
                s >= 4 ? COLORS.pos : s === 3 ? COLORS.warn : COLORS.neg;
              return (
                <View key={s} style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>{s}★</Text>
                  <View style={styles.ratingTrack}>
                    <View
                      style={{
                        height: "100%",
                        width: `${width}%`,
                        backgroundColor: color,
                        borderRadius: 4,
                      }}
                    />
                  </View>
                  <Text style={styles.ratingCount}>{count}</Text>
                </View>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Top Issues</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { width: 28 }]}>Rank</Text>
              <Text style={[styles.thText, { flex: 2 }]}>Issue</Text>
              <Text
                style={[styles.thText, { width: 60, textAlign: "center" }]}
              >
                Severity
              </Text>
              <Text
                style={[styles.thText, { width: 70, textAlign: "center" }]}
              >
                Mentions
              </Text>
            </View>
            {analysis.complaints.length === 0 ? (
              <View style={styles.tr}>
                <Text style={styles.tdMuted}>No issues identified.</Text>
              </View>
            ) : (
              analysis.complaints.map((c, i) => {
                const sev = SEV[c.severity] ?? SEV.low!;
                return (
                  <View key={i} style={styles.tr}>
                    <Text
                      style={[
                        styles.td,
                        { width: 28, color: COLORS.tx3, fontWeight: 700 },
                      ]}
                    >
                      #{i + 1}
                    </Text>
                    <Text style={[styles.td, { flex: 2, fontWeight: 700 }]}>
                      {c.text}
                    </Text>
                    <View style={{ width: 60, alignItems: "center" }}>
                      <Text
                        style={[
                          styles.pill,
                          { backgroundColor: sev.bg, color: sev.color },
                        ]}
                      >
                        {c.severity}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.tdMuted,
                        { width: 70, textAlign: "center" },
                      ]}
                    >
                      {c.count} ({shareOf(c.count, total)})
                    </Text>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </Page>

      {/* PAGE 2 */}
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.brand}>
            <Logo size={18} />
            <Text style={[styles.brandText, { fontSize: 12 }]}>
              ReviewPulse
            </Text>
          </View>
          <Text style={styles.date}>
            {project.name} — {dateLabel}
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Strengths</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 2 }]}>Strength</Text>
              <Text
                style={[styles.thText, { width: 90, textAlign: "center" }]}
              >
                Mentions
              </Text>
            </View>
            {analysis.praises.length === 0 ? (
              <View style={styles.tr}>
                <Text style={styles.tdMuted}>No strengths identified.</Text>
              </View>
            ) : (
              analysis.praises.map((p, i) => (
                <View key={i} style={styles.tr}>
                  <View
                    style={{
                      flex: 2,
                      flexDirection: "row",
                      alignItems: "center",
                    }}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        backgroundColor: COLORS.pos,
                        borderRadius: 3,
                        marginRight: 6,
                      }}
                    />
                    <Text style={styles.td}>{p.text}</Text>
                  </View>
                  <Text
                    style={[
                      styles.tdMuted,
                      { width: 90, textAlign: "center" },
                    ]}
                  >
                    {p.count} ({shareOf(p.count, total)})
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Feature Requests</Text>
          <View style={styles.table}>
            <View style={styles.th}>
              <Text style={[styles.thText, { flex: 2 }]}>Feature</Text>
              <Text
                style={[styles.thText, { width: 90, textAlign: "center" }]}
              >
                Demand
              </Text>
            </View>
            {analysis.feature_requests.length === 0 ? (
              <View style={styles.tr}>
                <Text style={styles.tdMuted}>No feature requests.</Text>
              </View>
            ) : (
              analysis.feature_requests.map((f, i) => (
                <View key={i} style={styles.tr}>
                  <Text style={[styles.td, { flex: 2 }]}>{f.text}</Text>
                  <Text
                    style={[
                      styles.tdMuted,
                      { width: 90, textAlign: "center" },
                    ]}
                  >
                    {f.count} ({shareOf(f.count, total)})
                  </Text>
                </View>
              ))
            )}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.h2}>Recommended Actions</Text>
          {analysis.action_items.length === 0 ? (
            <Text style={styles.tdMuted}>No actions yet.</Text>
          ) : (
            analysis.action_items.map((a, i) => (
              <View key={i} style={styles.actionRow}>
                <View style={{ width: 38, marginRight: 8 }}>
                  <Text
                    style={[
                      styles.pill,
                      {
                        backgroundColor:
                          PRIORITY_BG[a.priority] ?? COLORS.navyBg,
                        color: PRIORITY_FG[a.priority] ?? COLORS.navy,
                      },
                    ]}
                  >
                    {PRIORITY_LABEL[a.priority] ?? a.priority}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.actionTitle}>{a.title}</Text>
                  <Text style={styles.actionDesc}>{a.description}</Text>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <View style={styles.brand}>
            <Logo size={12} />
            <Text style={[styles.footerText, { marginLeft: 6 }]}>
              Generated by ReviewPulse — reviewpulse.com
            </Text>
          </View>
          <Text style={styles.footerText}>Page 2 of 2</Text>
        </View>
      </Page>
    </Document>
  );
}
