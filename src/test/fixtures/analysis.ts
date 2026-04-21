export interface AnalysisItemFixture {
  text: string;
  count: number;
  severity?: "low" | "medium" | "high";
  examples?: string[];
}

export interface ActionItemFixture {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface AnalysisResponseFixture {
  summary: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
  overall_score: number;
  complaints: AnalysisItemFixture[];
  praises: AnalysisItemFixture[];
  feature_requests: AnalysisItemFixture[];
  action_items: ActionItemFixture[];
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export const sampleAnalysisResponse: AnalysisResponseFixture = {
  summary:
    "Customers love the product quality and fast shipping but repeatedly call out slow support response times and occasional iOS crashes.",
  sentiment: {
    positive: 58,
    neutral: 12,
    negative: 22,
    mixed: 8,
  },
  overall_score: 74,
  complaints: [
    {
      text: "Slow customer support response times",
      count: 14,
      severity: "high",
      examples: [
        "Support took three weeks to reply",
        "Requested a refund and got ghosted",
      ],
    },
    {
      text: "iOS app stability issues",
      count: 6,
      severity: "medium",
      examples: ["App crashes on iOS sometimes"],
    },
  ],
  praises: [
    {
      text: "Fast shipping",
      count: 18,
      examples: ["Shipping was fast", "Arrived in two days"],
    },
    {
      text: "Product quality exceeds expectations",
      count: 12,
      examples: ["Quality exceeded my expectations"],
    },
  ],
  feature_requests: [
    {
      text: "Clearer onboarding tutorial",
      count: 4,
      examples: ["Wish they had a clearer tutorial"],
    },
  ],
  action_items: [
    {
      title: "Reduce first-response time on support tickets",
      description:
        "14 reviews mention multi-day or multi-week waits. Target <4h median response.",
      priority: "high",
    },
    {
      title: "Stabilize iOS app",
      description:
        "Triage crash logs on iOS; six reviews flag stability issues in the last month.",
      priority: "medium",
    },
    {
      title: "Ship an onboarding walkthrough",
      description: "Four reviews request a clearer first-run tutorial.",
      priority: "low",
    },
  ],
  rating_distribution: {
    "1": 6,
    "2": 4,
    "3": 5,
    "4": 8,
    "5": 27,
  },
};
