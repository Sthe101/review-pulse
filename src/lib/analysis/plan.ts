import type { Plan } from "@/types/database";

export interface PlanLimits {
  model: string;
  maxReviewsPerAnalysis: number;
  analysesPerMonth: number;
  reviewsPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    model: "claude-haiku-4-5-20251001",
    maxReviewsPerAnalysis: 50,
    analysesPerMonth: 3,
    reviewsPerMonth: 50,
  },
  pro: {
    model: "claude-sonnet-4-6",
    maxReviewsPerAnalysis: 1000,
    analysesPerMonth: 100,
    reviewsPerMonth: 5000,
  },
  business: {
    model: "claude-sonnet-4-6",
    maxReviewsPerAnalysis: 10000,
    analysesPerMonth: 1000,
    reviewsPerMonth: 50000,
  },
};
