import { createClient } from "@/lib/supabase/server";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";

type StatValue = number | string;

type StatCardData = {
  label: string;
  value: StatValue;
  icon: IconName;
  accent: string;
  suffix?: string;
};

async function loadStats() {
  const supabase = await createClient();

  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);
  const monthStartIso = monthStart.toISOString();

  const [reviewsRes, projectsRes, analysesMonthRes, scoresRes] =
    await Promise.all([
      supabase.from("reviews").select("id", { count: "exact", head: true }),
      supabase.from("projects").select("id", { count: "exact", head: true }),
      supabase
        .from("analyses")
        .select("id", { count: "exact", head: true })
        .gte("created_at", monthStartIso),
      supabase.from("analyses").select("overall_score") as unknown as Promise<{
        data: { overall_score: number | null }[] | null;
        error: unknown;
      }>,
    ]);

  const scores = (scoresRes.data ?? [])
    .map((r) => r.overall_score)
    .filter((v): v is number => typeof v === "number");
  const avgScore =
    scores.length > 0
      ? scores.reduce((sum, s) => sum + s, 0) / scores.length
      : null;

  return {
    reviewsCount: reviewsRes.count ?? 0,
    projectsCount: projectsRes.count ?? 0,
    analysesThisMonth: analysesMonthRes.count ?? 0,
    avgScore,
  };
}

export async function StatCards() {
  const { reviewsCount, projectsCount, analysesThisMonth, avgScore } =
    await loadStats();

  const stats: StatCardData[] = [
    {
      label: "Reviews Analyzed",
      value: reviewsCount.toLocaleString("en-US"),
      icon: "msg",
      accent: "var(--teal)",
    },
    {
      label: "Active Projects",
      value: projectsCount.toLocaleString("en-US"),
      icon: "folder",
      accent: "var(--navy)",
    },
    {
      label: "Analyses This Month",
      value: analysesThisMonth.toLocaleString("en-US"),
      icon: "bar",
      accent: "var(--coral)",
    },
    {
      label: "Avg Sentiment",
      value: avgScore === null ? "—" : Math.round(avgScore).toString(),
      icon: "star",
      accent: "var(--pos)",
      suffix: avgScore === null ? undefined : "/100",
    },
  ];

  return (
    <div
      className="stat-grid"
      data-testid="stat-cards"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: 16,
      }}
    >
      {stats.map((s) => (
        <StatCard key={s.label} stat={s} />
      ))}
    </div>
  );
}

function StatCard({ stat }: { stat: StatCardData }) {
  return (
    <Card
      padding={20}
      style={{ display: "flex", flexDirection: "column", gap: 12 }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: "var(--tx2)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {stat.label}
        </span>
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `color-mix(in srgb, ${stat.accent} 12%, transparent)`,
          }}
        >
          <Icon name={stat.icon} size={16} color={stat.accent} />
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 4,
        }}
      >
        <span
          data-testid="stat-value"
          style={{
            fontSize: 28,
            fontWeight: 700,
            color: "var(--tx)",
            lineHeight: 1,
          }}
        >
          {stat.value}
        </span>
        {stat.suffix && (
          <span style={{ fontSize: 14, color: "var(--tx3)", fontWeight: 500 }}>
            {stat.suffix}
          </span>
        )}
      </div>
    </Card>
  );
}
