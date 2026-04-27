import { createClient } from "@/lib/supabase/server";
import { Icon, type IconName } from "@/components/ui/icon";
import type { AnalysisItem } from "@/types/database";

type LatestAnalysisRow = {
  id: string;
  complaints: unknown;
  praises: unknown;
  feature_requests: unknown;
  created_at: string;
};

function parseItems(raw: unknown): AnalysisItem[] {
  if (Array.isArray(raw)) return raw as AnalysisItem[];
  if (typeof raw === "string") {
    try {
      const v = JSON.parse(raw);
      return Array.isArray(v) ? (v as AnalysisItem[]) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function topItem(items: AnalysisItem[]): AnalysisItem | null {
  if (items.length === 0) return null;
  // Highest count wins; fall back to insertion order if counts are missing
  // (the model already returns items ranked by importance).
  const sorted = [...items].sort(
    (a, b) => (b.count ?? 0) - (a.count ?? 0),
  );
  return sorted[0] ?? null;
}

async function loadLatestAnalysis(): Promise<LatestAnalysisRow | null> {
  const supabase = await createClient();
  const res = (await (
    supabase.from("analyses") as unknown as {
      select: (cols: string) => {
        order: (
          col: string,
          opts: { ascending: boolean },
        ) => {
          limit: (n: number) => {
            maybeSingle: () => Promise<{
              data: LatestAnalysisRow | null;
              error: unknown;
            }>;
          };
        };
      };
    }
  )
    .select("id, complaints, praises, feature_requests, created_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()) as {
    data: LatestAnalysisRow | null;
    error: unknown;
  };

  return res.data ?? null;
}

export async function KeyInsights() {
  const latest = await loadLatestAnalysis();
  if (!latest) return null;

  const complaint = topItem(parseItems(latest.complaints));
  const praise = topItem(parseItems(latest.praises));
  const feature = topItem(parseItems(latest.feature_requests));

  // If the latest analysis has nothing in any of the three buckets, hide.
  if (!complaint && !praise && !feature) return null;

  return (
    <section data-testid="key-insights" aria-labelledby="key-insights-h">
      <div style={{ marginBottom: 12 }}>
        <h2
          id="key-insights-h"
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "var(--tx)",
            margin: 0,
          }}
        >
          Key Insights
        </h2>
        <p
          style={{
            fontSize: 13,
            color: "var(--tx2)",
            margin: "2px 0 0 0",
          }}
        >
          From your latest analysis.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 16,
        }}
      >
        <InsightCard
          testId="insight-complaint"
          label="Top Complaint"
          icon="warn"
          accent="var(--neg)"
          item={complaint}
        />
        <InsightCard
          testId="insight-strength"
          label="Top Strength"
          icon="trend"
          accent="var(--pos)"
          item={praise}
        />
        <InsightCard
          testId="insight-feature"
          label="Top Feature Request"
          icon="bulb"
          accent="var(--teal)"
          item={feature}
        />
      </div>
    </section>
  );
}

function InsightCard({
  testId,
  label,
  icon,
  accent,
  item,
}: {
  testId: string;
  label: string;
  icon: IconName;
  accent: string;
  item: AnalysisItem | null;
}) {
  return (
    <div
      className="card"
      data-testid={testId}
      style={{
        padding: 20,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        borderLeft: `3px solid ${accent}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: 8,
            background: `color-mix(in srgb, ${accent} 14%, transparent)`,
            flexShrink: 0,
          }}
        >
          <Icon name={icon} size={14} color={accent} />
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: "var(--tx2)",
            textTransform: "uppercase",
            letterSpacing: "0.04em",
          }}
        >
          {label}
        </span>
      </div>
      {item ? (
        <>
          <div
            data-testid={`${testId}-text`}
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--tx)",
              lineHeight: 1.4,
            }}
          >
            {item.text}
          </div>
          {typeof item.count === "number" && item.count > 0 && (
            <div
              data-testid={`${testId}-count`}
              style={{ fontSize: 12, color: "var(--tx3)" }}
            >
              {item.count} mention{item.count === 1 ? "" : "s"}
            </div>
          )}
        </>
      ) : (
        <div
          data-testid={`${testId}-empty`}
          style={{ fontSize: 13, color: "var(--tx3)", fontStyle: "italic" }}
        >
          Nothing yet.
        </div>
      )}
    </div>
  );
}
