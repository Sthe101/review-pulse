"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";

export function parseReviews(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type SubTab = "paste";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "paste", label: "Paste" },
];

type ReviewInsertChain = {
  insert: (v: unknown) => Promise<{ error: unknown }>;
};

export type AnalysisCompletePayload = {
  analysis_id: string;
  analysis: {
    summary?: string | null;
    sentiment?: {
      positive?: number;
      neutral?: number;
      negative?: number;
      mixed?: number;
    };
    overall_score?: number | null;
  };
  reviewCount: number;
};

type Props = {
  projectId: string;
  onAnalysisComplete: (payload: AnalysisCompletePayload) => void;
};

export function AddReviewsTab({ projectId, onAnalysisComplete }: Props) {
  const [subTab, setSubTab] = useState<SubTab>("paste");

  return (
    <div
      data-testid="add-reviews-tab"
      style={{ display: "flex", flexDirection: "column", gap: 16 }}
    >
      <div
        role="tablist"
        aria-label="Add reviews source"
        data-testid="add-reviews-subtabs"
        style={{ display: "flex", gap: 4 }}
      >
        {SUB_TABS.map((s) => {
          const active = subTab === s.id;
          return (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={active}
              data-testid={`subtab-${s.id}`}
              onClick={() => setSubTab(s.id)}
              style={{
                padding: "6px 14px",
                background: active
                  ? "color-mix(in srgb, var(--teal) 12%, transparent)"
                  : "transparent",
                border: `1px solid ${active ? "var(--teal)" : "var(--bd)"}`,
                borderRadius: 999,
                color: active ? "var(--teal)" : "var(--tx2)",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {s.label}
            </button>
          );
        })}
      </div>

      {subTab === "paste" && (
        <PasteSubTab
          projectId={projectId}
          onAnalysisComplete={onAnalysisComplete}
        />
      )}
    </div>
  );
}

function PasteSubTab({ projectId, onAnalysisComplete }: Props) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reviews = parseReviews(text);
  const reviewCount = reviews.length;

  const clear = () => setText("");

  const submit = async () => {
    if (reviewCount === 0) {
      toast.error("Please paste at least one review.");
      return;
    }

    setSubmitting(true);
    const supabase = createClient();

    const insRes = await (
      supabase.from("reviews") as unknown as ReviewInsertChain
    ).insert(
      reviews.map((content) => ({ project_id: projectId, content }))
    );

    if (insRes.error) {
      setSubmitting(false);
      toast.error("Couldn't save reviews. Please try again.");
      return;
    }

    let resp: Response;
    try {
      resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
    } catch {
      setSubmitting(false);
      toast.error("Network error. Please try again.");
      return;
    }

    if (!resp.ok) {
      setSubmitting(false);
      const errBody = (await resp.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(errBody.error ?? "Analysis failed. Please try again.");
      return;
    }

    const okBody = (await resp.json().catch(() => null)) as {
      analysis_id: string;
      analysis: AnalysisCompletePayload["analysis"];
    } | null;

    toast.success(
      `Added ${reviewCount} review${reviewCount === 1 ? "" : "s"} and ran analysis.`
    );
    setText("");
    setSubmitting(false);
    if (okBody?.analysis_id) {
      onAnalysisComplete({
        analysis_id: okBody.analysis_id,
        analysis: okBody.analysis,
        reviewCount,
      });
    }
  };

  return (
    <Card padding={20}>
      <div data-testid="paste-sub-tab">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            marginBottom: 8,
            flexWrap: "wrap",
            gap: 8,
          }}
        >
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--tx)", margin: 0 }}>
            Paste reviews
          </h2>
          <span
            data-testid="paste-review-count"
            style={{ fontSize: 12, color: "var(--tx3)" }}
          >
            {reviewCount} {reviewCount === 1 ? "review" : "reviews"} detected
          </span>
        </div>
        <p
          style={{
            fontSize: 13,
            color: "var(--tx2)",
            lineHeight: 1.5,
            margin: "0 0 12px",
          }}
        >
          Paste reviews below. Separate each review with a blank line.
        </p>
        <textarea
          aria-label="Paste reviews"
          data-testid="paste-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={submitting}
          placeholder={`The shipping was really fast and packaging was great.\n\nProduct quality was disappointing for the price.\n\nCustomer support was helpful but slow to respond.`}
          rows={10}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 8,
            border: "1px solid var(--bd)",
            background: "var(--bg)",
            color: "var(--tx)",
            fontFamily: "inherit",
            fontSize: 14,
            resize: "vertical",
            outline: "none",
          }}
        />
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 12,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {submitting && (
            <span
              data-testid="paste-submitting"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 12,
                color: "var(--tx2)",
                marginRight: "auto",
              }}
            >
              <Spinner size="sm" />
              Saving and analyzing…
            </span>
          )}
          <Button
            variant="outline"
            onClick={clear}
            disabled={submitting || text.length === 0}
            data-testid="paste-clear-button"
          >
            Clear
          </Button>
          <Button
            variant="coral"
            onClick={submit}
            loading={submitting}
            disabled={submitting || reviewCount === 0}
            data-testid="paste-submit-button"
          >
            {reviewCount > 0
              ? `Add ${reviewCount} Review${reviewCount === 1 ? "" : "s"}`
              : "Add Reviews"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
