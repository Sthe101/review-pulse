import type Anthropic from "@anthropic-ai/sdk";
import { ANALYSIS_SYSTEM_PROMPT } from "./prompt";
import { AnalysisResponseSchema } from "./schema";
import type { AnalysisResponse } from "./types";

export interface ReviewForPrompt {
  id: string;
  content: string;
  rating: number | null;
  source: string | null;
}

export function formatReviewsForPrompt(reviews: ReviewForPrompt[]): string {
  return reviews
    .map((r, i) => {
      const rating = r.rating != null ? `${r.rating}★` : "no rating";
      const source = r.source ?? "unknown source";
      return `Review ${i + 1} [${source}, ${rating}]:\n${r.content}`;
    })
    .join("\n\n");
}

function stripCodeFences(raw: string): string {
  return raw
    .replace(/^\s*```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
}

export interface CallAnalysisArgs {
  reviews: ReviewForPrompt[];
  model: string;
  client: Anthropic;
  maxTokens?: number;
}

export async function callAnalysis({
  reviews,
  model,
  client,
  maxTokens = 4096,
}: CallAnalysisArgs): Promise<AnalysisResponse> {
  const baseUser = `Please analyze the following ${reviews.length} review(s) and return the JSON report exactly as specified.\n\n${formatReviewsForPrompt(reviews)}`;

  let lastErr: unknown = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const userContent =
      attempt === 0
        ? baseUser
        : `${baseUser}\n\nIMPORTANT: your previous response could not be parsed. Return ONLY a single valid JSON object matching the schema — no prose, no code fences, no commentary.`;

    const resp = await client.messages.create({
      model,
      max_tokens: maxTokens,
      system: [
        {
          type: "text",
          text: ANALYSIS_SYSTEM_PROMPT,
          cache_control: { type: "ephemeral" },
        },
      ],
      messages: [{ role: "user", content: userContent }],
    });

    const textBlock = resp.content.find((c) => c.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      lastErr = new Error("Claude response contained no text block");
      continue;
    }

    try {
      const json: unknown = JSON.parse(stripCodeFences(textBlock.text));
      return AnalysisResponseSchema.parse(json);
    } catch (e) {
      lastErr = e;
    }
  }

  throw lastErr ?? new Error("analysis failed");
}
