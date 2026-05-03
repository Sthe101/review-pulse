import type { Industry } from "@/types/database";

export type Benchmarks = {
  sentimentScore: number;
  negativePct: number;
  rating: number;
  responsePct: number;
};

const TABLE: Record<Industry, Benchmarks> = {
  "E-commerce": { sentimentScore: 65, negativePct: 22, rating: 4.0, responsePct: 72 },
  SaaS: { sentimentScore: 72, negativePct: 18, rating: 4.2, responsePct: 78 },
  Restaurant: { sentimentScore: 70, negativePct: 20, rating: 4.1, responsePct: 65 },
  Healthcare: { sentimentScore: 68, negativePct: 21, rating: 4.3, responsePct: 80 },
  Agency: { sentimentScore: 74, negativePct: 15, rating: 4.4, responsePct: 82 },
  Other: { sentimentScore: 70, negativePct: 20, rating: 4.1, responsePct: 75 },
};

export function getBenchmarks(industry: Industry): Benchmarks {
  return TABLE[industry];
}
