"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Icon } from "@/components/ui/icon";

export type ReviewRow = {
  id: string;
  content: string;
  rating: number | null;
  source: string | null;
  sentiment: string | null;
  themes: string[] | null;
  created_at: string;
};

type SentimentKey = "all" | "positive" | "neutral" | "negative" | "mixed";

const FILTERS: { id: SentimentKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "positive", label: "Positive" },
  { id: "neutral", label: "Neutral" },
  { id: "negative", label: "Negative" },
  { id: "mixed", label: "Mixed" },
];

const PAGE_SIZE = 20;

const SENTIMENT_BORDER: Record<string, string> = {
  positive: "var(--pos)",
  negative: "var(--neg)",
  neutral: "var(--tx3)",
  mixed: "var(--warn)",
};

function borderColor(sentiment: string | null): string {
  if (!sentiment) return "var(--bd)";
  return SENTIMENT_BORDER[sentiment] ?? "var(--bd)";
}

function Stars({ rating }: { rating: number }) {
  const safe = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      data-testid="review-stars"
      data-rating={safe}
      aria-label={`${safe} of 5 stars`}
      style={{
        color: "var(--warn)",
        fontSize: 13,
        letterSpacing: 1,
        whiteSpace: "nowrap",
      }}
    >
      {"★".repeat(safe)}
      <span style={{ color: "var(--bd)" }}>{"★".repeat(5 - safe)}</span>
    </span>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span
      data-testid="review-tag"
      style={{
        fontSize: 11,
        color: "var(--tx2)",
        background: "var(--bg2)",
        border: "1px solid var(--bd)",
        borderRadius: 99,
        padding: "2px 8px",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

export function ReviewsTab({ reviews }: { reviews: ReviewRow[] }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<SentimentKey>("all");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reviews.filter((r) => {
      if (filter !== "all" && r.sentiment !== filter) return false;
      if (q && !r.content.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [reviews, query, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const start = (safePage - 1) * PAGE_SIZE;
  const visible = filtered.slice(start, start + PAGE_SIZE);

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
      <Card padding={16}>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ position: "relative" }}>
            <span
              aria-hidden="true"
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--tx3)",
                pointerEvents: "none",
              }}
            >
              <Icon name="srch" size={14} />
            </span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search reviews"
              data-testid="reviews-search"
              aria-label="Search reviews"
              style={{
                width: "100%",
                padding: "8px 12px 8px 32px",
                fontSize: 13,
                border: "1px solid var(--bd)",
                borderRadius: 8,
                background: "var(--bg2)",
                color: "var(--tx)",
              }}
            />
          </div>
          <div
            role="group"
            aria-label="Filter by sentiment"
            data-testid="reviews-filter-group"
            style={{ display: "flex", gap: 6, flexWrap: "wrap" }}
          >
            {FILTERS.map((f) => {
              const active = filter === f.id;
              return (
                <button
                  key={f.id}
                  type="button"
                  data-testid={`reviews-filter-${f.id}`}
                  aria-pressed={active}
                  onClick={() => {
                    setFilter(f.id);
                    setPage(1);
                  }}
                  style={{
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    borderRadius: 99,
                    border: `1px solid ${
                      active ? "var(--teal)" : "var(--bd)"
                    }`,
                    background: active
                      ? "color-mix(in srgb, var(--teal) 10%, transparent)"
                      : "var(--bg2)",
                    color: active ? "var(--teal)" : "var(--tx2)",
                    cursor: "pointer",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
          <div
            data-testid="reviews-meta"
            style={{ fontSize: 12, color: "var(--tx3)" }}
          >
            {filtered.length === reviews.length
              ? `${reviews.length} reviews`
              : `${filtered.length} of ${reviews.length} reviews`}
          </div>
        </div>
      </Card>

      {visible.length === 0 ? (
        <Card padding={24}>
          <p
            data-testid="reviews-no-match"
            style={{ fontSize: 13, color: "var(--tx2)", margin: 0 }}
          >
            No reviews match your filters.
          </p>
        </Card>
      ) : (
        <>
          {visible.map((r) => (
            <Card key={r.id} padding={16}>
              <div
                data-testid={`review-item-${r.id}`}
                data-sentiment={r.sentiment ?? "unknown"}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  borderLeft: `3px solid ${borderColor(r.sentiment)}`,
                  paddingLeft: 12,
                  marginLeft: -16,
                }}
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
                    alignItems: "center",
                    gap: 12,
                    fontSize: 12,
                    color: "var(--tx3)",
                    flexWrap: "wrap",
                  }}
                >
                  {typeof r.rating === "number" && <Stars rating={r.rating} />}
                  {r.source && <span>{r.source}</span>}
                  <span>
                    {new Date(r.created_at).toLocaleDateString("en-US")}
                  </span>
                </div>
                {r.themes && r.themes.length > 0 && (
                  <div
                    data-testid="review-tags"
                    style={{
                      display: "flex",
                      gap: 6,
                      flexWrap: "wrap",
                    }}
                  >
                    {r.themes.map((t, i) => (
                      <Tag key={`${t}-${i}`} label={t} />
                    ))}
                  </div>
                )}
              </div>
            </Card>
          ))}

          {totalPages > 1 && (
            <div
              role="navigation"
              aria-label="Review pagination"
              data-testid="reviews-pagination"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontSize: 13,
                color: "var(--tx2)",
                paddingTop: 4,
              }}
            >
              <button
                type="button"
                data-testid="reviews-prev"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  border: "1px solid var(--bd)",
                  borderRadius: 6,
                  background: "var(--bg2)",
                  color: safePage <= 1 ? "var(--tx3)" : "var(--tx2)",
                  cursor: safePage <= 1 ? "not-allowed" : "pointer",
                }}
              >
                ← Prev
              </button>
              <span data-testid="reviews-page-indicator">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                data-testid="reviews-next"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                style={{
                  padding: "6px 12px",
                  fontSize: 12,
                  border: "1px solid var(--bd)",
                  borderRadius: 6,
                  background: "var(--bg2)",
                  color:
                    safePage >= totalPages ? "var(--tx3)" : "var(--tx2)",
                  cursor: safePage >= totalPages ? "not-allowed" : "pointer",
                }}
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
