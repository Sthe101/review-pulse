import Papa from "papaparse";

export const MAX_CSV_BYTES = 5 * 1024 * 1024;

export type CsvField = "content" | "rating" | "source" | "author";
export type CsvMapping = Record<CsvField, string | null>;
export type CsvRow = Record<string, string | undefined>;

export type ExtractedReview = {
  content: string;
  rating: number | null;
  source: string | null;
  author: string | null;
};

const HEADER_HINTS: Record<CsvField, string[]> = {
  content: [
    "content",
    "review",
    "comment",
    "feedback",
    "text",
    "body",
    "description",
    "message",
  ],
  rating: ["rating", "stars", "score", "rate"],
  source: ["source", "platform", "channel", "site"],
  author: ["author", "name", "customer", "reviewer", "user"],
};

export function detectColumns(headers: readonly string[]): CsvMapping {
  const out: CsvMapping = {
    content: null,
    rating: null,
    source: null,
    author: null,
  };
  for (const field of Object.keys(HEADER_HINTS) as CsvField[]) {
    const hints = HEADER_HINTS[field];
    const match = headers.find((h) => {
      const normalized = h.trim().toLowerCase();
      return hints.some((hint) => normalized.includes(hint));
    });
    out[field] = match ?? null;
  }
  return out;
}

export function coerceRating(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw).trim();
  if (s === "") return null;
  const m = s.match(/^(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const n = Math.round(Number(m[1]));
  if (!Number.isFinite(n) || n < 1 || n > 5) return null;
  return n;
}

export function extractRows(
  rows: readonly CsvRow[],
  mapping: CsvMapping,
): ExtractedReview[] {
  if (!mapping.content) return [];
  const out: ExtractedReview[] = [];
  for (const r of rows) {
    const rawContent = r[mapping.content];
    const content = typeof rawContent === "string" ? rawContent.trim() : "";
    if (!content) continue;
    if (content.length > 10_000) continue;
    const rating = mapping.rating ? coerceRating(r[mapping.rating]) : null;
    const sourceRaw = mapping.source ? r[mapping.source] : null;
    const source =
      typeof sourceRaw === "string" && sourceRaw.trim().length > 0
        ? sourceRaw.trim().slice(0, 100)
        : null;
    const authorRaw = mapping.author ? r[mapping.author] : null;
    const author =
      typeof authorRaw === "string" && authorRaw.trim().length > 0
        ? authorRaw.trim().slice(0, 200)
        : null;
    out.push({ content, rating, source, author });
  }
  return out;
}

export type ParseSuccess = {
  ok: true;
  fileName: string;
  headers: string[];
  rows: CsvRow[];
  mapping: CsvMapping;
};

export type ParseFailure = {
  ok: false;
  error: string;
};

export type ParseResult = ParseSuccess | ParseFailure;

export async function parseCsvFile(file: File): Promise<ParseResult> {
  if (file.size > MAX_CSV_BYTES) {
    return {
      ok: false,
      error: "File is larger than 5 MB. Please split it into smaller files.",
    };
  }

  let text: string;
  try {
    text = await file.text();
  } catch {
    return { ok: false, error: "Couldn't read the file." };
  }

  const result = Papa.parse<CsvRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = result.meta.fields ?? [];
  if (headers.length === 0) {
    return {
      ok: false,
      error: "Couldn't find any columns. Does the file have a header row?",
    };
  }

  const rows = (result.data ?? []).filter(
    (r): r is CsvRow => typeof r === "object" && r !== null,
  );

  if (rows.length === 0) {
    return {
      ok: false,
      error: "The file has a header row but no data rows.",
    };
  }

  const mapping = detectColumns(headers);
  if (!mapping.content) {
    return {
      ok: false,
      error:
        "Couldn't find a review/text column. Add one named 'review', 'text', 'comment', or 'feedback'.",
    };
  }

  return { ok: true, fileName: file.name, headers, rows, mapping };
}
