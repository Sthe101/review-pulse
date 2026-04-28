"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Icon } from "@/components/ui/icon";
import { createClient } from "@/lib/supabase/client";
import {
  coerceRating,
  detectColumns,
  extractRows,
  parseCsvFile,
  type CsvField,
  type CsvMapping,
  type CsvRow,
  type ExtractedReview,
} from "@/lib/csv/parse";

export {
  coerceRating,
  detectColumns,
  extractRows,
  parseCsvFile,
};
export type { CsvField, CsvMapping, CsvRow, ExtractedReview };

export function parseReviews(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

type SubTab = "paste" | "csv";

const SUB_TABS: { id: SubTab; label: string }[] = [
  { id: "paste", label: "Paste" },
  { id: "csv", label: "CSV" },
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

      {subTab === "csv" && (
        <CsvSubTab
          projectId={projectId}
          onAnalysisComplete={onAnalysisComplete}
        />
      )}
    </div>
  );
}

type InsertReviewRow = {
  project_id: string;
  content: string;
  rating?: number | null;
  source?: string | null;
  author?: string | null;
};

async function insertAndAnalyze(args: {
  projectId: string;
  rows: InsertReviewRow[];
  onAnalysisComplete: (payload: AnalysisCompletePayload) => void;
}): Promise<{ ok: boolean }> {
  const { projectId, rows, onAnalysisComplete } = args;
  const supabase = createClient();

  const insRes = await (
    supabase.from("reviews") as unknown as ReviewInsertChain
  ).insert(rows);

  if (insRes.error) {
    toast.error("Couldn't save reviews. Please try again.");
    return { ok: false };
  }

  let resp: Response;
  try {
    resp = await fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ project_id: projectId }),
    });
  } catch {
    toast.error("Network error. Please try again.");
    return { ok: false };
  }

  if (!resp.ok) {
    const errBody = (await resp.json().catch(() => ({}))) as {
      error?: string;
    };
    toast.error(errBody.error ?? "Analysis failed. Please try again.");
    return { ok: false };
  }

  const okBody = (await resp.json().catch(() => null)) as {
    analysis_id: string;
    analysis: AnalysisCompletePayload["analysis"];
  } | null;

  toast.success(
    `Added ${rows.length} review${rows.length === 1 ? "" : "s"} and ran analysis.`,
  );
  if (okBody?.analysis_id) {
    onAnalysisComplete({
      analysis_id: okBody.analysis_id,
      analysis: okBody.analysis,
      reviewCount: rows.length,
    });
  }
  return { ok: true };
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
    const result = await insertAndAnalyze({
      projectId,
      rows: reviews.map((content) => ({ project_id: projectId, content })),
      onAnalysisComplete,
    });
    setSubmitting(false);
    if (result.ok) setText("");
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

type CsvParseState = {
  fileName: string;
  headers: string[];
  rows: CsvRow[];
};

const EMPTY_MAPPING: CsvMapping = {
  content: null,
  rating: null,
  source: null,
  author: null,
};

function CsvSubTab({ projectId, onAnalysisComplete }: Props) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsed, setParsed] = useState<CsvParseState | null>(null);
  const [mapping, setMapping] = useState<CsvMapping>(EMPTY_MAPPING);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setParsed(null);
    setMapping(EMPTY_MAPPING);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleFile = async (file: File) => {
    setParseError(null);
    setParsing(true);
    const result = await parseCsvFile(file);
    if (!result.ok) {
      setParseError(result.error);
      setParsing(false);
      return;
    }
    setParsed({
      fileName: result.fileName,
      headers: result.headers,
      rows: result.rows,
    });
    setMapping(result.mapping);
    setParsing(false);
  };

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const validRows = parsed ? extractRows(parsed.rows, mapping) : [];
  const validCount = validRows.length;
  const skippedCount = parsed ? parsed.rows.length - validCount : 0;

  const submit = async () => {
    if (validCount === 0) {
      toast.error("Pick a column that contains review text.");
      return;
    }
    setSubmitting(true);
    const result = await insertAndAnalyze({
      projectId,
      rows: validRows.map((r) => ({ project_id: projectId, ...r })),
      onAnalysisComplete,
    });
    setSubmitting(false);
    if (result.ok) reset();
  };

  return (
    <Card padding={20}>
      <div data-testid="csv-sub-tab">
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
            Import CSV
          </h2>
          {parsed && (
            <span
              data-testid="csv-row-count"
              style={{ fontSize: 12, color: "var(--tx3)" }}
            >
              {validCount} {validCount === 1 ? "review" : "reviews"} ready
              {skippedCount > 0 ? ` · ${skippedCount} skipped` : ""}
            </span>
          )}
        </div>

        {!parsed && (
          <DropZone
            dragOver={dragOver}
            parsing={parsing}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
          />
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv,application/vnd.ms-excel"
          onChange={onInputChange}
          data-testid="csv-file-input"
          style={{ display: "none" }}
        />

        {parseError && (
          <p
            data-testid="csv-parse-error"
            role="alert"
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "color-mix(in srgb, var(--neg) 10%, transparent)",
              border: "1px solid var(--neg)",
              borderRadius: 6,
              fontSize: 13,
              color: "var(--neg)",
            }}
          >
            {parseError}
          </p>
        )}

        {parsed && (
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 16 }}>
            <div
              data-testid="csv-file-info"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                color: "var(--tx2)",
              }}
            >
              <Icon name="ok" size={14} color="var(--pos)" />
              <span style={{ fontWeight: 500 }}>{parsed.fileName}</span>
              <span style={{ color: "var(--tx3)" }}>
                · {parsed.rows.length} row{parsed.rows.length === 1 ? "" : "s"} ·
                {" "}{parsed.headers.length} column{parsed.headers.length === 1 ? "" : "s"}
              </span>
            </div>

            <ColumnMapping
              headers={parsed.headers}
              mapping={mapping}
              onChange={setMapping}
            />

            <PreviewTable
              rows={validRows.slice(0, 5)}
              totalReady={validCount}
            />
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 16,
            justifyContent: "flex-end",
            flexWrap: "wrap",
            alignItems: "center",
          }}
        >
          {submitting && (
            <span
              data-testid="csv-submitting"
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
          {parsed && (
            <Button
              variant="outline"
              onClick={reset}
              disabled={submitting}
              data-testid="csv-reset-button"
            >
              Remove
            </Button>
          )}
          <Button
            variant="coral"
            onClick={submit}
            loading={submitting}
            disabled={submitting || !parsed || validCount === 0}
            data-testid="csv-import-button"
          >
            {validCount > 0
              ? `Import ${validCount} Review${validCount === 1 ? "" : "s"}`
              : "Import"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

function DropZone(props: {
  dragOver: boolean;
  parsing: boolean;
  onDragOver: React.DragEventHandler<HTMLDivElement>;
  onDragLeave: React.DragEventHandler<HTMLDivElement>;
  onDrop: React.DragEventHandler<HTMLDivElement>;
  onClick: () => void;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid="csv-drop-zone"
      data-drag-over={props.dragOver ? "true" : "false"}
      onDragOver={props.onDragOver}
      onDragLeave={props.onDragLeave}
      onDrop={props.onDrop}
      onClick={props.onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          props.onClick();
        }
      }}
      style={{
        marginTop: 4,
        padding: "32px 20px",
        border: `2px dashed ${props.dragOver ? "var(--teal)" : "var(--bd)"}`,
        borderRadius: 12,
        background: props.dragOver
          ? "color-mix(in srgb, var(--teal) 8%, transparent)"
          : "var(--bg)",
        textAlign: "center",
        cursor: "pointer",
        transition: "background 120ms ease, border-color 120ms ease",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
        {props.parsing ? (
          <Spinner size="md" />
        ) : (
          <Icon name="up" size={28} color="var(--tx3)" />
        )}
        <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: "var(--tx)" }}>
          {props.parsing ? "Parsing file…" : "Drop a CSV file here, or click to browse"}
        </p>
        {!props.parsing && (
          <p style={{ margin: 0, fontSize: 12, color: "var(--tx3)" }}>
            We&apos;ll try to detect the review, rating, and source columns automatically.
          </p>
        )}
      </div>
    </div>
  );
}

function ColumnMapping({
  headers,
  mapping,
  onChange,
}: {
  headers: string[];
  mapping: CsvMapping;
  onChange: (next: CsvMapping) => void;
}) {
  const update = (field: CsvField, value: string) => {
    onChange({ ...mapping, [field]: value === "" ? null : value });
  };

  return (
    <div
      data-testid="csv-column-mapping"
      style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}
    >
      <MappingSelect
        label="Review text"
        required
        field="content"
        headers={headers}
        value={mapping.content}
        onChange={(v) => update("content", v)}
      />
      <MappingSelect
        label="Rating (1–5)"
        field="rating"
        headers={headers}
        value={mapping.rating}
        onChange={(v) => update("rating", v)}
      />
      <MappingSelect
        label="Source"
        field="source"
        headers={headers}
        value={mapping.source}
        onChange={(v) => update("source", v)}
      />
      <MappingSelect
        label="Author"
        field="author"
        headers={headers}
        value={mapping.author}
        onChange={(v) => update("author", v)}
      />
    </div>
  );
}

function MappingSelect({
  label,
  required,
  field,
  headers,
  value,
  onChange,
}: {
  label: string;
  required?: boolean;
  field: CsvField;
  headers: string[];
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 4,
        fontSize: 12,
        color: "var(--tx2)",
        fontWeight: 500,
      }}
    >
      <span>
        {label}
        {required && <span style={{ color: "var(--neg)" }}> *</span>}
      </span>
      <select
        data-testid={`csv-map-${field}`}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "8px 10px",
          border: "1px solid var(--bd)",
          borderRadius: 6,
          background: "var(--bg)",
          color: "var(--tx)",
          fontSize: 13,
        }}
      >
        <option value="">— Not mapped —</option>
        {headers.map((h) => (
          <option key={h} value={h}>
            {h}
          </option>
        ))}
      </select>
    </label>
  );
}

function PreviewTable({
  rows,
  totalReady,
}: {
  rows: ExtractedReview[];
  totalReady: number;
}) {
  if (rows.length === 0) {
    return (
      <p
        data-testid="csv-preview-empty"
        style={{ margin: 0, fontSize: 13, color: "var(--tx3)" }}
      >
        Nothing to preview yet — pick a column with review text.
      </p>
    );
  }
  return (
    <div data-testid="csv-preview" style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 500 }}>
        Preview · showing {rows.length} of {totalReady}
      </div>
      <div style={{ overflowX: "auto", border: "1px solid var(--bd)", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "color-mix(in srgb, var(--tx) 4%, transparent)" }}>
              <Th>Content</Th>
              <Th width={80}>Rating</Th>
              <Th width={140}>Source</Th>
              <Th width={140}>Author</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr
                key={i}
                data-testid={`csv-preview-row-${i}`}
                style={{ borderTop: "1px solid var(--bd)" }}
              >
                <Td>
                  <span
                    style={{
                      display: "block",
                      maxWidth: 480,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.content}
                  </span>
                </Td>
                <Td>{r.rating ?? "—"}</Td>
                <Td>{r.source ?? "—"}</Td>
                <Td>{r.author ?? "—"}</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: number }) {
  return (
    <th
      style={{
        textAlign: "left",
        padding: "8px 12px",
        fontSize: 11,
        textTransform: "uppercase",
        letterSpacing: 0.4,
        color: "var(--tx3)",
        fontWeight: 600,
        width,
      }}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "8px 12px", color: "var(--tx2)", verticalAlign: "top" }}>
      {children}
    </td>
  );
}
