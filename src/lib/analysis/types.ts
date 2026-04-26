import type { z } from "zod";
import type {
  ActionItemSchema,
  AnalysisResponseSchema,
  AnalyzeRequestSchema,
  ComplaintItemSchema,
  MentionItemSchema,
  PrioritySchema,
  RatingDistributionSchema,
  ReviewInputSchema,
  SentimentBreakdownSchema,
  SeveritySchema,
} from "./schema";

export type AnalyzeRequest = z.infer<typeof AnalyzeRequestSchema>;
export type AnalysisResponse = z.infer<typeof AnalysisResponseSchema>;

export type SentimentBreakdown = z.infer<typeof SentimentBreakdownSchema>;
export type ComplaintItem = z.infer<typeof ComplaintItemSchema>;
export type MentionItem = z.infer<typeof MentionItemSchema>;
export type ActionItem = z.infer<typeof ActionItemSchema>;
export type RatingDistribution = z.infer<typeof RatingDistributionSchema>;
export type ReviewInput = z.infer<typeof ReviewInputSchema>;

export type Severity = z.infer<typeof SeveritySchema>;
export type Priority = z.infer<typeof PrioritySchema>;
