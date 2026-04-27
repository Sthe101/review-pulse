import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import {
  AnalyzeRequestSchema,
  type ReviewInputSchema,
} from "@/lib/analysis/schema";
import { checkRateLimit } from "@/lib/analysis/rate-limit";
import { runAnalysis, loadPlanForUser } from "@/lib/analysis/run";
import { type ReviewForPrompt } from "@/lib/analysis/claude";
import { PLAN_LIMITS } from "@/lib/analysis/plan";
import type { z } from "zod";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const CONTENT_KEYWORDS = [
  "content",
  "review",
  "text",
  "comment",
  "body",
  "feedback",
  "message",
];
const RATING_KEYWORDS = ["rating", "stars", "score", "rate"];
const SOURCE_KEYWORDS = ["source", "platform", "site", "origin", "channel"];
const AUTHOR_KEYWORDS = ["author", "name", "user", "reviewer", "customer"];
const DATE_KEYWORDS = ["date", "created", "reviewed", "timestamp", "posted"];

function detectColumn(
  headers: string[],
  keywords: string[],
): string | null {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.indexOf(kw);
    if (idx >= 0) return headers[idx] ?? null;
  }
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx >= 0) return headers[idx] ?? null;
  }
  return null;
}

function parseRating(raw: string | undefined): number | null {
  if (!raw) return null;
  const m = raw.match(/([1-5])/);
  if (!m) return null;
  const n = parseInt(m[1]!, 10);
  return n >= 1 && n <= 5 ? n : null;
}

function parseDate(raw: string | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

type ReviewInput = z.infer<typeof ReviewInputSchema>;

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }

  const rl = await checkRateLimit(supabase, `analyze:${user.id}`);
  if (!rl.ok) {
    return NextResponse.json(
      { error: "Too many requests. Please wait and try again." },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfterSec) },
      },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid multipart form data." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  const projectIdRaw = form.get("project_id");

  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing CSV file." },
      { status: 400 },
    );
  }
  if (typeof projectIdRaw !== "string") {
    return NextResponse.json(
      { error: "Missing project_id." },
      { status: 400 },
    );
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File too large. Maximum size is 5 MB." },
      { status: 400 },
    );
  }

  const rawText = await file.text();
  const text = rawText.replace(/^﻿/, "");

  const parseResult = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  if (parseResult.errors.length > 0 && parseResult.data.length === 0) {
    return NextResponse.json(
      { error: "Could not parse CSV file." },
      { status: 400 },
    );
  }

  const headers = parseResult.meta.fields ?? [];
  const contentCol = detectColumn(headers, CONTENT_KEYWORDS);
  if (!contentCol) {
    return NextResponse.json(
      {
        error:
          "Couldn't find a review content column. Include a header like 'content', 'review', or 'text'.",
      },
      { status: 400 },
    );
  }
  const ratingCol = detectColumn(headers, RATING_KEYWORDS);
  const sourceCol = detectColumn(headers, SOURCE_KEYWORDS);
  const authorCol = detectColumn(headers, AUTHOR_KEYWORDS);
  const dateCol = detectColumn(headers, DATE_KEYWORDS);

  const parsedReviews: ReviewInput[] = [];
  for (const row of parseResult.data) {
    const content = (row[contentCol] ?? "").trim();
    if (content.length === 0 || content.length > 10000) continue;
    parsedReviews.push({
      content,
      rating: ratingCol ? parseRating(row[ratingCol]) : null,
      source: sourceCol ? (row[sourceCol]?.trim() || null) : null,
      author: authorCol ? (row[authorCol]?.trim() || null) : null,
      review_date: dateCol ? parseDate(row[dateCol]) : null,
    });
  }

  if (parsedReviews.length === 0) {
    return NextResponse.json(
      { error: "No valid reviews found in the CSV." },
      { status: 400 },
    );
  }

  const validated = AnalyzeRequestSchema.safeParse({
    project_id: projectIdRaw,
    reviews: parsedReviews,
  });
  if (!validated.success) {
    return NextResponse.json(
      {
        error: "Invalid CSV data.",
        issues: validated.error.issues,
      },
      { status: 400 },
    );
  }
  const { project_id, reviews: validReviews } = validated.data;
  if (!validReviews || validReviews.length === 0) {
    return NextResponse.json(
      { error: "No valid reviews found in the CSV." },
      { status: 400 },
    );
  }

  const projectRes = (await (
    supabase.from("projects") as unknown as {
      select: (cols: string) => {
        eq: (
          col: string,
          val: string,
        ) => {
          eq: (
            col: string,
            val: string,
          ) => {
            maybeSingle: () => Promise<{
              data: { id: string; user_id: string } | null;
              error: unknown;
            }>;
          };
        };
      };
    }
  )
    .select("id, user_id")
    .eq("id", project_id)
    .eq("user_id", user.id)
    .maybeSingle()) as {
    data: { id: string; user_id: string } | null;
    error: unknown;
  };

  if (!projectRes.data) {
    return NextResponse.json({ error: "Project not found." }, { status: 404 });
  }

  const plan = await loadPlanForUser(supabase, user.id);
  if (!plan) {
    return NextResponse.json({ error: "Profile not found." }, { status: 404 });
  }
  const limits = PLAN_LIMITS[plan];
  if (validReviews.length > limits.maxReviewsPerAnalysis) {
    return NextResponse.json(
      {
        error: `Your plan allows up to ${limits.maxReviewsPerAnalysis} reviews per analysis. Trim the CSV or upgrade.`,
      },
      { status: 403 },
    );
  }

  const insertRows = validReviews.map((r) => ({
    project_id,
    content: r.content,
    rating: r.rating ?? null,
    source: r.source ?? null,
    author: r.author ?? null,
    review_date: r.review_date ?? null,
  }));

  const insertRes = (await (
    supabase.from("reviews") as unknown as {
      insert: (v: unknown) => {
        select: (
          cols: string,
        ) => Promise<{
          data: ReviewForPrompt[] | null;
          error: unknown;
        }>;
      };
    }
  )
    .insert(insertRows)
    .select("id, content, rating, source")) as {
    data: ReviewForPrompt[] | null;
    error: unknown;
  };

  if (insertRes.error || !insertRes.data || insertRes.data.length === 0) {
    return NextResponse.json(
      { error: "Could not save reviews. Please try again." },
      { status: 500 },
    );
  }

  const reviews = insertRes.data;

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY ?? "missing-key",
  });

  const result = await runAnalysis({
    supabase,
    anthropic,
    userId: user.id,
    projectId: project_id,
    reviews,
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    analysis_id: result.analysis_id,
    analysis: result.analysis,
    review_count: reviews.length,
  });
}
