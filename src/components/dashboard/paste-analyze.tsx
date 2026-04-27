"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { DonutChart } from "@/components/ui/donut-chart";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { Spinner } from "@/components/ui/spinner";
import { createClient } from "@/lib/supabase/client";
import type { AnalysisResponse } from "@/lib/analysis/types";

export function parseReviews(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

export const ANALYSIS_STEPS = [
  "Parsing reviews",
  "Creating project",
  "Saving reviews",
  "Sending to Claude",
  "Analyzing sentiment",
  "Extracting themes",
  "Generating insights",
] as const;

type Phase = "idle" | "loading" | "done";

type Result = {
  analysis: AnalysisResponse;
  projectId: string;
  analysisId: string;
};

type ProjectInsertChain = {
  insert: (v: unknown) => {
    select: (cols: string) => {
      single: () => Promise<{
        data: { id: string } | null;
        error: unknown;
      }>;
    };
  };
};

type ReviewInsertChain = {
  insert: (v: unknown) => Promise<{ error: unknown }>;
};

export function PasteAnalyze({ userId }: { userId: string }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const reviews = parseReviews(text);
  const reviewCount = reviews.length;

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, []);

  const stopProgress = () => {
    if (progressTimer.current) {
      clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  };

  const startProgress = () => {
    stopProgress();
    setProgress(5);
    progressTimer.current = setInterval(() => {
      setProgress((p) => {
        if (p >= 90) return p;
        const step = p < 30 ? 3 : p < 60 ? 1.5 : 0.7;
        return Math.min(90, p + step);
      });
    }, 200);
  };

  const reset = () => {
    stopProgress();
    setText("");
    setPhase("idle");
    setProgress(0);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (reviewCount === 0) {
      toast.error("Please paste at least one review.");
      return;
    }

    setPhase("loading");
    startProgress();

    const supabase = createClient();
    setProgress((p) => Math.max(p, 14));

    const projRes = await (
      supabase.from("projects") as unknown as ProjectInsertChain
    )
      .insert({
        user_id: userId,
        name: `Quick Analysis - ${new Date().toLocaleDateString("en-US")}`,
        industry: "Other",
        review_source: "Pasted text",
        is_demo: false,
      })
      .select("id")
      .single();

    if (!projRes.data) {
      stopProgress();
      setPhase("idle");
      toast.error("Couldn't create project. Please try again.");
      return;
    }
    const projectId = projRes.data.id;

    setProgress((p) => Math.max(p, 28));

    const insRes = await (
      supabase.from("reviews") as unknown as ReviewInsertChain
    ).insert(reviews.map((content) => ({ project_id: projectId, content })));

    if (insRes.error) {
      stopProgress();
      setPhase("idle");
      toast.error("Couldn't save reviews. Please try again.");
      return;
    }

    setProgress((p) => Math.max(p, 45));

    let resp: Response;
    try {
      resp = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project_id: projectId }),
      });
    } catch {
      stopProgress();
      setPhase("idle");
      toast.error("Network error. Please try again.");
      return;
    }

    if (!resp.ok) {
      stopProgress();
      setPhase("idle");
      const errBody = (await resp.json().catch(() => ({}))) as {
        error?: string;
      };
      toast.error(errBody.error ?? "Analysis failed. Please try again.");
      return;
    }

    const data = (await resp.json()) as {
      analysis_id: string;
      analysis: AnalysisResponse;
    };

    stopProgress();
    setProgress(100);
    setPhase("done");
    setResult({
      analysis: data.analysis,
      projectId,
      analysisId: data.analysis_id,
    });
  };

  return (
    <Card padding={20}>
      {phase === "idle" && (
        <PasteForm
          text={text}
          setText={setText}
          reviewCount={reviewCount}
          onAnalyze={handleAnalyze}
          onUploadCsv={() => router.push("/projects?new=true")}
        />
      )}
      {phase === "loading" && (
        <LoadingView progress={progress} reviewCount={reviewCount} />
      )}
      {phase === "done" && result && (
        <CompactResults
          result={result}
          onOpen={() => router.push(`/projects/${result.projectId}`)}
          onReset={reset}
        />
      )}
    </Card>
  );
}

function PasteForm({
  text,
  setText,
  reviewCount,
  onAnalyze,
  onUploadCsv,
}: {
  text: string;
  setText: (v: string) => void;
  reviewCount: number;
  onAnalyze: () => void;
  onUploadCsv: () => void;
}) {
  return (
    <div data-testid="paste-form">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--tx)" }}>
          Quick Analysis
        </h2>
        <span
          data-testid="review-count"
          style={{ fontSize: 12, color: "var(--tx3)" }}
        >
          {reviewCount} {reviewCount === 1 ? "review" : "reviews"} detected
        </span>
      </div>
      <p
        style={{
          fontSize: 13,
          color: "var(--tx2)",
          marginBottom: 12,
          lineHeight: 1.5,
        }}
      >
        Paste reviews below. Separate each review with a blank line.
      </p>
      <textarea
        aria-label="Paste reviews"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`The shipping was really fast and packaging was great.\n\nProduct quality was disappointing for the price.\n\nCustomer support was helpful but slow to respond.`}
        rows={8}
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
        }}
      >
        <Button variant="outline" onClick={onUploadCsv}>
          <span
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Icon name="dl" size={14} />
            Upload CSV
          </span>
        </Button>
        <Button variant="coral" onClick={onAnalyze}>
          {reviewCount > 0
            ? `Analyze ${reviewCount} ${reviewCount === 1 ? "Review" : "Reviews"}`
            : "Analyze Reviews"}
        </Button>
      </div>
    </div>
  );
}

function LoadingView({
  progress,
  reviewCount,
}: {
  progress: number;
  reviewCount: number;
}) {
  const currentStep = Math.min(
    ANALYSIS_STEPS.length - 1,
    Math.floor((progress / 100) * ANALYSIS_STEPS.length),
  );

  return (
    <div data-testid="loading-view" style={{ padding: "8px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <Spinner size="md" />
        <div>
          <div
            data-testid="current-step-label"
            style={{ fontSize: 15, fontWeight: 600, color: "var(--tx)" }}
          >
            {ANALYSIS_STEPS[currentStep]}…
          </div>
          <div style={{ fontSize: 12, color: "var(--tx3)", marginTop: 2 }}>
            Analyzing {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
          </div>
        </div>
      </div>
      <ul
        aria-label="Analysis progress steps"
        style={{
          listStyle: "none",
          padding: 0,
          margin: "0 0 16px 0",
          display: "grid",
          gap: 4,
        }}
      >
        {ANALYSIS_STEPS.map((label, i) => {
          const state =
            i < currentStep ? "done" : i === currentStep ? "active" : "pending";
          return (
            <li
              key={i}
              data-testid={`analyze-step-${i}`}
              data-state={state}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "2px 0",
                fontSize: 12,
                color:
                  state === "active"
                    ? "var(--tx)"
                    : state === "done"
                      ? "var(--tx2)"
                      : "var(--tx3)",
                fontWeight: state === "active" ? 600 : 400,
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: 16,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {state === "done" ? (
                  <Icon name="ok" size={12} color="var(--pos)" />
                ) : state === "active" ? (
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 999,
                      background: "var(--teal)",
                    }}
                  />
                ) : (
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--bd)",
                    }}
                  />
                )}
              </span>
              <span>{label}</span>
            </li>
          );
        })}
      </ul>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress)}
        style={{
          height: 8,
          background: "var(--bd)",
          borderRadius: 4,
          overflow: "hidden",
        }}
      >
        <div
          data-testid="analyze-progress-fill"
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--teal)",
            transition: "width 200ms ease-out",
          }}
        />
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--tx3)",
          textAlign: "right",
          marginTop: 6,
        }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  );
}

function CompactResults({
  result,
  onOpen,
  onReset,
}: {
  result: Result;
  onOpen: () => void;
  onReset: () => void;
}) {
  const { analysis } = result;
  const topComplaints = analysis.complaints.slice(0, 3);
  const topPraises = analysis.praises.slice(0, 3);

  return (
    <div data-testid="compact-results">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--tx)" }}>
          Analysis Results
        </h2>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: 99,
            background: "color-mix(in srgb, var(--pos) 12%, transparent)",
            color: "var(--pos)",
            fontSize: 11,
            fontWeight: 700,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Icon name="ok" size={11} color="var(--pos)" />
          Complete
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: 24,
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
        }}
      >
        <DonutChart data={analysis.sentiment} size={120} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <p
            style={{
              fontSize: 13,
              color: "var(--tx2)",
              lineHeight: 1.6,
              marginBottom: 12,
            }}
          >
            {analysis.summary}
          </p>
          <SentimentBar
            positive={analysis.sentiment.positive}
            neutral={analysis.sentiment.neutral}
            negative={analysis.sentiment.negative + analysis.sentiment.mixed}
          />
        </div>
      </div>

      {topComplaints.length > 0 && (
        <ResultsList title="Top Complaints" items={topComplaints} />
      )}
      {topPraises.length > 0 && (
        <ResultsList title="Top Praises" items={topPraises} />
      )}

      <div
        style={{
          display: "flex",
          gap: 12,
          justifyContent: "flex-end",
          flexWrap: "wrap",
          marginTop: 16,
        }}
      >
        <Button variant="outline" onClick={onReset}>
          New Analysis
        </Button>
        <Button variant="coral" onClick={onOpen}>
          Open Full Report →
        </Button>
      </div>
    </div>
  );
}

function ResultsList({
  title,
  items,
}: {
  title: string;
  items: { text: string; count: number }[];
}) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: "var(--tx2)",
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {items.map((item, i) => (
          <li
            key={i}
            style={{
              fontSize: 13,
              color: "var(--tx)",
              padding: "4px 0",
              display: "flex",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <span style={{ flex: 1 }}>• {item.text}</span>
            <span
              style={{
                color: "var(--tx3)",
                fontSize: 11,
                whiteSpace: "nowrap",
              }}
            >
              {item.count} mention{item.count === 1 ? "" : "s"}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
