import { z } from "zod";

export const SeveritySchema = z.enum(["low", "medium", "high"]);
export const PrioritySchema = z.enum(["low", "medium", "high"]);

export const AnalyzeRequestSchema = z.object({
  project_id: z.string().uuid(),
  review_ids: z.array(z.string().uuid()).min(1).max(500).optional(),
});

export const SentimentBreakdownSchema = z.object({
  positive: z.number().min(0).max(100),
  neutral: z.number().min(0).max(100),
  negative: z.number().min(0).max(100),
  mixed: z.number().min(0).max(100),
});

export const ComplaintItemSchema = z.object({
  text: z.string().min(1),
  count: z.number().int().min(0),
  severity: SeveritySchema,
  examples: z.array(z.string().min(1)).max(5).default([]),
});

export const MentionItemSchema = z.object({
  text: z.string().min(1),
  count: z.number().int().min(0),
  examples: z.array(z.string().min(1)).max(5).default([]),
});

export const ActionItemSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  priority: PrioritySchema,
});

export const RatingDistributionSchema = z.object({
  "1": z.number().int().min(0),
  "2": z.number().int().min(0),
  "3": z.number().int().min(0),
  "4": z.number().int().min(0),
  "5": z.number().int().min(0),
});

export const AnalysisResponseSchema = z.object({
  summary: z.string().min(1),
  sentiment: SentimentBreakdownSchema,
  overall_score: z.number().min(0).max(100),
  complaints: z.array(ComplaintItemSchema),
  praises: z.array(MentionItemSchema),
  feature_requests: z.array(MentionItemSchema),
  action_items: z.array(ActionItemSchema),
  rating_distribution: RatingDistributionSchema,
});
