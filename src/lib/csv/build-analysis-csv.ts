import type {
  ActionItem,
  ComplaintItem,
  MentionItem,
} from "@/lib/analysis/types";

export type CsvAnalysisInput = {
  project: {
    name: string;
    industry: string;
    review_source: string;
  };
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
  reviews: ReviewRow[];
};

export type ReviewRow = {
  content: string;
  rating: number | null;
  source: string | null;
  author: string | null;
  review_date: string | null;
  created_at: string;
  sentiment: string | null;
  sentiment_score: number | null;
  themes: string[] | null;
};

type Cell = string | number | null | undefined;

const PRIORITY_LABEL: Record<string, string> = {
  high: "P1",
  medium: "P2",
  low: "P3",
};

export function escapeCsvCell(value: Cell): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function row(cells: Cell[]): string {
  return cells.map(escapeCsvCell).join(",");
}

function pct(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "";
  return `${Math.round(n)}%`;
}

function shareOf(count: number, total: number): string {
  if (total <= 0) return "";
  return `${Math.round((count / total) * 100)}%`;
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

function formatReviewDate(r: ReviewRow): string {
  const raw = r.review_date ?? r.created_at;
  if (!raw) return "";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toISOString().slice(0, 10);
}

export function buildAnalysisCsv(input: CsvAnalysisInput): string {
  const { project, analysis, reviews } = input;
  const total = analysis.review_count > 0 ? analysis.review_count : reviews.length;
  const lines: string[] = [];

  // Section 1: Report metadata
  lines.push(row(["ReviewPulse Analysis Report"]));
  lines.push(row(["Project", project.name]));
  lines.push(row(["Industry", project.industry]));
  lines.push(row(["Source", project.review_source]));
  lines.push(row(["Date", formatDate(analysis.created_at)]));
  lines.push(row(["Reviews Analyzed", analysis.review_count]));
  lines.push(
    row([
      "Overall Score",
      analysis.overall_score === null
        ? ""
        : `${Math.round(analysis.overall_score)}/100`,
    ]),
  );
  lines.push("");

  // Section 2: Sentiment breakdown
  lines.push(row(["SENTIMENT BREAKDOWN"]));
  lines.push(row(["Category", "Percentage"]));
  lines.push(row(["Positive", pct(analysis.sentiment_positive)]));
  lines.push(row(["Neutral", pct(analysis.sentiment_neutral)]));
  lines.push(row(["Negative", pct(analysis.sentiment_negative)]));
  lines.push(row(["Mixed", pct(analysis.sentiment_mixed)]));
  lines.push("");

  // Section 3: Top issues
  lines.push(row(["TOP ISSUES"]));
  lines.push(
    row([
      "Rank",
      "Issue",
      "Severity",
      "Mentions",
      "Percent",
      "Trend",
      "Recommendation",
    ]),
  );
  analysis.complaints.forEach((c, i) => {
    lines.push(
      row([
        i + 1,
        c.text,
        c.severity,
        c.count,
        shareOf(c.count, total),
        "",
        "",
      ]),
    );
  });
  lines.push("");

  // Section 4: Strengths
  lines.push(row(["STRENGTHS"]));
  lines.push(row(["Strength", "Mentions", "Percent", "Marketing Tip"]));
  analysis.praises.forEach((p) => {
    lines.push(row([p.text, p.count, shareOf(p.count, total), ""]));
  });
  lines.push("");

  // Section 5: Feature requests
  lines.push(row(["FEATURE REQUESTS"]));
  lines.push(
    row(["Feature", "Demand", "Percent", "Urgency", "Recommendation"]),
  );
  analysis.feature_requests.forEach((f) => {
    lines.push(row([f.text, f.count, shareOf(f.count, total), "", ""]));
  });
  lines.push("");

  // Section 6: Action items
  lines.push(row(["ACTION ITEMS"]));
  lines.push(row(["Priority", "Action", "Rationale", "Effort", "Impact"]));
  analysis.action_items.forEach((a) => {
    lines.push(
      row([
        PRIORITY_LABEL[a.priority] ?? a.priority,
        a.title,
        a.description,
        "",
        "",
      ]),
    );
  });
  lines.push("");

  // Section 7: Individual reviews
  lines.push(row(["INDIVIDUAL REVIEWS"]));
  lines.push(
    row([
      "Review",
      "Rating",
      "Sentiment",
      "Score",
      "Author",
      "Date",
      "Source",
      "Themes",
    ]),
  );
  reviews.forEach((r) => {
    lines.push(
      row([
        r.content,
        r.rating === null ? "" : `${r.rating}/5`,
        r.sentiment ?? "",
        r.sentiment_score === null || r.sentiment_score === undefined
          ? ""
          : r.sentiment_score.toFixed(2),
        r.author ?? "",
        formatReviewDate(r),
        r.source ?? "",
        (r.themes ?? []).join("; "),
      ]),
    );
  });

  return lines.join("\r\n") + "\r\n";
}

function dateSlug(createdAt: string): string {
  const d = new Date(createdAt);
  if (Number.isNaN(d.getTime())) return "report";
  return d.toISOString().slice(0, 10);
}

function projectSlug(projectName: string): string {
  return (
    projectName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "analysis"
  );
}

export function buildCsvFilename(
  projectName: string,
  createdAt: string,
): string {
  return `reviewpulse-${projectSlug(projectName)}-${dateSlug(createdAt)}.csv`;
}

export function buildPdfFilename(createdAt: string): string {
  return `reviewpulse-report-${dateSlug(createdAt)}.pdf`;
}
