import type { Industry, Sentiment } from "@/types/database";

export type DemoIndustryId =
  | "ecommerce"
  | "saas"
  | "restaurant"
  | "healthcare"
  | "professional"
  | "agency";

export interface DemoReview {
  content: string;
  rating: number;
  author: string;
  source: string;
  review_date: string;
  sentiment: Sentiment;
  sentiment_score: number;
  themes: string[];
}

export interface DemoComplaint {
  text: string;
  count: number;
  severity: "low" | "medium" | "high";
  examples: string[];
}

export interface DemoPraise {
  text: string;
  count: number;
  examples: string[];
}

export interface DemoFeatureRequest {
  text: string;
  count: number;
  examples: string[];
}

export interface DemoActionItem {
  title: string;
  description: string;
  priority: "low" | "medium" | "high";
}

export interface DemoAnalysis {
  summary: string;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    mixed: number;
  };
  overall_score: number;
  complaints: DemoComplaint[];
  praises: DemoPraise[];
  feature_requests: DemoFeatureRequest[];
  action_items: DemoActionItem[];
  rating_distribution: Record<"1" | "2" | "3" | "4" | "5", number>;
}

export interface DemoSet {
  industryLabel: string;
  dbIndustry: Industry;
  reviews: DemoReview[];
  analysis: DemoAnalysis;
}

// ---------- E-commerce ----------

const ecommerceReviews: DemoReview[] = [
  {
    content:
      "Delivery was faster than promised and the packaging was great — items arrived in perfect condition.",
    rating: 5,
    author: "Alex M.",
    source: "Google",
    review_date: "2026-04-02",
    sentiment: "positive",
    sentiment_score: 0.94,
    themes: ["shipping", "packaging"],
  },
  {
    content:
      "Quality exceeded my expectations for the price. Will definitely reorder.",
    rating: 5,
    author: "Jamie R.",
    source: "Trustpilot",
    review_date: "2026-04-05",
    sentiment: "positive",
    sentiment_score: 0.92,
    themes: ["quality", "value"],
  },
  {
    content:
      "Product broke after two weeks. Tried to initiate a return and nobody responded for 8 days.",
    rating: 1,
    author: "Morgan K.",
    source: "Yelp",
    review_date: "2026-04-01",
    sentiment: "negative",
    sentiment_score: 0.08,
    themes: ["durability", "support"],
  },
  {
    content:
      "Wrong size arrived and the return portal kept erroring. Had to call three times.",
    rating: 2,
    author: "Taylor B.",
    source: "Trustpilot",
    review_date: "2026-04-07",
    sentiment: "negative",
    sentiment_score: 0.18,
    themes: ["returns", "support"],
  },
  {
    content:
      "Looks exactly like the photos and sturdy build. Shipping took 9 days though, not the 3 advertised.",
    rating: 4,
    author: "Sam T.",
    source: "Google",
    review_date: "2026-04-09",
    sentiment: "mixed",
    sentiment_score: 0.6,
    themes: ["quality", "shipping"],
  },
  {
    content: "Chat support resolved my issue in under 5 minutes. Such a relief.",
    rating: 5,
    author: "Priya S.",
    source: "Trustpilot",
    review_date: "2026-04-10",
    sentiment: "positive",
    sentiment_score: 0.9,
    themes: ["support"],
  },
  {
    content:
      "Item arrived damaged — clearly a packaging issue. Refund was processed quickly at least.",
    rating: 2,
    author: "Chris L.",
    source: "Google",
    review_date: "2026-04-11",
    sentiment: "mixed",
    sentiment_score: 0.45,
    themes: ["packaging", "support"],
  },
  {
    content: "Best birthday gift I've bought. Free gift wrap was a nice touch.",
    rating: 5,
    author: "Jordan W.",
    source: "Google",
    review_date: "2026-04-03",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["packaging", "value"],
  },
  {
    content:
      "Website checkout crashed twice with items in my cart. Lost my discount code. Please fix.",
    rating: 2,
    author: "Riley F.",
    source: "Yelp",
    review_date: "2026-04-12",
    sentiment: "negative",
    sentiment_score: 0.2,
    themes: ["checkout", "bugs"],
  },
];

const ecommerceAnalysis: DemoAnalysis = {
  summary:
    "Shoppers love the packaging, product quality, and fast chat support, but slow returns, delayed shipping, and a buggy checkout are recurring friction points.",
  sentiment: { positive: 44, neutral: 0, negative: 33, mixed: 23 },
  overall_score: 68,
  complaints: [
    {
      text: "Slow returns and refund response times",
      count: 3,
      severity: "high",
      examples: [
        "Nobody responded for 8 days",
        "Return portal kept erroring",
        "Had to call three times",
      ],
    },
    {
      text: "Shipping slower than advertised",
      count: 2,
      severity: "medium",
      examples: ["Shipping took 9 days not the 3 advertised"],
    },
    {
      text: "Checkout bugs losing cart / discount codes",
      count: 1,
      severity: "medium",
      examples: ["Website checkout crashed twice with items in my cart"],
    },
  ],
  praises: [
    {
      text: "Packaging quality and presentation",
      count: 3,
      examples: ["Free gift wrap was a nice touch", "Packaging was great"],
    },
    {
      text: "Product quality exceeds expectations",
      count: 3,
      examples: ["Quality exceeded my expectations", "Sturdy build"],
    },
    {
      text: "Fast chat support",
      count: 1,
      examples: ["Chat support resolved my issue in under 5 minutes"],
    },
  ],
  feature_requests: [
    {
      text: "Stabilize checkout and preserve discount codes on error",
      count: 1,
      examples: ["Lost my discount code when checkout crashed"],
    },
  ],
  action_items: [
    {
      title: "Cut return-request first response under 48h",
      description:
        "Multiple reviews mention 8+ day waits on return requests. Staff the returns queue and set a 48h SLA.",
      priority: "high",
    },
    {
      title: "Audit shipping estimates vs. actuals",
      description:
        "Reviews reference 9-day deliveries against a 3-day promise. Tighten carrier ETAs or update checkout copy.",
      priority: "medium",
    },
    {
      title: "Fix checkout crash and preserve cart state",
      description:
        "At least one review lost a discount code when checkout crashed. Add cart persistence and error recovery.",
      priority: "medium",
    },
  ],
  rating_distribution: { "1": 1, "2": 3, "3": 0, "4": 1, "5": 4 },
};

// ---------- SaaS ----------

const saasReviews: DemoReview[] = [
  {
    content:
      "Cut our reporting time from 2 hours to 10 minutes. The dashboard is intuitive and the API just works.",
    rating: 5,
    author: "Dana P.",
    source: "G2",
    review_date: "2026-04-01",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["dashboard", "api", "time-savings"],
  },
  {
    content:
      "Onboarding was painless. Integrations with Slack and HubSpot worked first try.",
    rating: 5,
    author: "Kai H.",
    source: "G2",
    review_date: "2026-04-03",
    sentiment: "positive",
    sentiment_score: 0.93,
    themes: ["onboarding", "integrations"],
  },
  {
    content:
      "Pricing jumps massively between the Pro and Business tiers. No middle option for a team of 12.",
    rating: 2,
    author: "Sam V.",
    source: "Capterra",
    review_date: "2026-04-04",
    sentiment: "negative",
    sentiment_score: 0.22,
    themes: ["pricing", "tiers"],
  },
  {
    content:
      "Love the product but the export to CSV breaks on datasets over 50k rows. Had to split manually.",
    rating: 3,
    author: "Avery N.",
    source: "G2",
    review_date: "2026-04-06",
    sentiment: "mixed",
    sentiment_score: 0.55,
    themes: ["export", "bugs"],
  },
  {
    content:
      "Support got back in 15 minutes with a working fix. Best ticket experience of any tool we use.",
    rating: 5,
    author: "Elena R.",
    source: "Trustpilot",
    review_date: "2026-04-08",
    sentiment: "positive",
    sentiment_score: 0.96,
    themes: ["support"],
  },
  {
    content:
      "Mobile app is basically unusable. Charts don't render and filters reset on every refresh.",
    rating: 2,
    author: "Noah T.",
    source: "App Store",
    review_date: "2026-04-09",
    sentiment: "negative",
    sentiment_score: 0.15,
    themes: ["mobile", "bugs"],
  },
  {
    content:
      "Solid platform — saved us from building this in-house. Role-based access could use more granularity.",
    rating: 4,
    author: "Blake C.",
    source: "G2",
    review_date: "2026-04-10",
    sentiment: "mixed",
    sentiment_score: 0.7,
    themes: ["permissions", "value"],
  },
  {
    content:
      "Missing SSO on the Pro plan is a dealbreaker — we can't roll this out company-wide.",
    rating: 2,
    author: "Casey D.",
    source: "Capterra",
    review_date: "2026-04-11",
    sentiment: "negative",
    sentiment_score: 0.25,
    themes: ["sso", "pricing"],
  },
  {
    content: "Great value overall. Wish reports could be scheduled to Slack.",
    rating: 4,
    author: "Morgan P.",
    source: "G2",
    review_date: "2026-04-12",
    sentiment: "positive",
    sentiment_score: 0.82,
    themes: ["value", "integrations"],
  },
];

const saasAnalysis: DemoAnalysis = {
  summary:
    "Customers praise the dashboard, integrations, and fast support but push back on the pricing cliff between tiers, SSO locked behind Business, and a weak mobile experience.",
  sentiment: { positive: 44, neutral: 0, negative: 33, mixed: 23 },
  overall_score: 71,
  complaints: [
    {
      text: "Pricing jump between Pro and Business tiers",
      count: 2,
      severity: "high",
      examples: [
        "No middle option for a team of 12",
        "Missing SSO on the Pro plan is a dealbreaker",
      ],
    },
    {
      text: "Mobile app stability and rendering issues",
      count: 1,
      severity: "high",
      examples: ["Charts don't render", "Filters reset on every refresh"],
    },
    {
      text: "CSV export breaks on large datasets",
      count: 1,
      severity: "medium",
      examples: ["Export to CSV breaks on datasets over 50k rows"],
    },
  ],
  praises: [
    {
      text: "Intuitive dashboard and time savings",
      count: 2,
      examples: ["Cut our reporting time from 2 hours to 10 minutes"],
    },
    {
      text: "Painless integrations (Slack, HubSpot)",
      count: 2,
      examples: ["Slack and HubSpot worked first try"],
    },
    {
      text: "Fast, effective support",
      count: 1,
      examples: ["Support got back in 15 minutes with a working fix"],
    },
  ],
  feature_requests: [
    {
      text: "Scheduled report delivery to Slack",
      count: 1,
      examples: ["Wish reports could be scheduled to Slack"],
    },
    {
      text: "More granular role-based access control",
      count: 1,
      examples: ["Role-based access could use more granularity"],
    },
    {
      text: "Mid-tier plan between Pro and Business",
      count: 2,
      examples: ["No middle option for a team of 12"],
    },
  ],
  action_items: [
    {
      title: "Introduce a mid-tier plan or SSO add-on",
      description:
        "Multiple reviews flag the Pro→Business gap and SSO gating. A Team tier or standalone SSO SKU unblocks rollouts.",
      priority: "high",
    },
    {
      title: "Stabilize mobile charts and filter state",
      description:
        "Mobile users report broken charts and resetting filters. Prioritize a mobile stability sprint.",
      priority: "high",
    },
    {
      title: "Fix CSV export for 50k+ row datasets",
      description:
        "Export currently breaks at scale. Stream or paginate exports and add progress feedback.",
      priority: "medium",
    },
  ],
  rating_distribution: { "1": 0, "2": 3, "3": 1, "4": 2, "5": 3 },
};

// ---------- Restaurant ----------

const restaurantReviews: DemoReview[] = [
  {
    content:
      "The pasta was incredible and our server knew every wine on the list. Best anniversary dinner in years.",
    rating: 5,
    author: "Lauren B.",
    source: "Yelp",
    review_date: "2026-04-02",
    sentiment: "positive",
    sentiment_score: 0.97,
    themes: ["food", "service"],
  },
  {
    content:
      "Charming atmosphere, great cocktails, and the chef's tasting menu was worth every penny.",
    rating: 5,
    author: "Marcus J.",
    source: "Google",
    review_date: "2026-04-04",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["ambiance", "food"],
  },
  {
    content:
      "Waited 45 minutes for our table despite a reservation. Then another 30 for appetizers. Food was fine, not worth the wait.",
    rating: 2,
    author: "Nia W.",
    source: "Yelp",
    review_date: "2026-04-05",
    sentiment: "negative",
    sentiment_score: 0.2,
    themes: ["wait-times", "service"],
  },
  {
    content:
      "They got my order wrong twice and charged for both. Manager was dismissive when I pointed it out.",
    rating: 1,
    author: "Ethan S.",
    source: "Google",
    review_date: "2026-04-06",
    sentiment: "negative",
    sentiment_score: 0.1,
    themes: ["order-accuracy", "service"],
  },
  {
    content:
      "Food quality is excellent but portions have shrunk noticeably over the last year while prices went up.",
    rating: 3,
    author: "Sofia P.",
    source: "Yelp",
    review_date: "2026-04-07",
    sentiment: "mixed",
    sentiment_score: 0.5,
    themes: ["portions", "pricing"],
  },
  {
    content:
      "Lovely brunch spot. The eggs benedict is reliably great and the coffee is actually good.",
    rating: 5,
    author: "Diego F.",
    source: "Google",
    review_date: "2026-04-09",
    sentiment: "positive",
    sentiment_score: 0.92,
    themes: ["food"],
  },
  {
    content:
      "Loud enough that we couldn't hold a conversation and the lighting was borderline strobe. Food was good though.",
    rating: 3,
    author: "Aisha R.",
    source: "Yelp",
    review_date: "2026-04-10",
    sentiment: "mixed",
    sentiment_score: 0.55,
    themes: ["ambiance", "food"],
  },
  {
    content:
      "Service was attentive without being hovering, and they accommodated a nut allergy without blinking.",
    rating: 5,
    author: "Henry O.",
    source: "Google",
    review_date: "2026-04-11",
    sentiment: "positive",
    sentiment_score: 0.94,
    themes: ["service", "dietary"],
  },
  {
    content:
      "Kitchen forgot our entrées entirely. By the time they arrived the table was already over it.",
    rating: 1,
    author: "Priya M.",
    source: "Yelp",
    review_date: "2026-04-12",
    sentiment: "negative",
    sentiment_score: 0.12,
    themes: ["wait-times", "order-accuracy"],
  },
];

const restaurantAnalysis: DemoAnalysis = {
  summary:
    "Diners rave about the food, cocktails, and attentive service, but wait times, kitchen accuracy, and noise are dragging the experience down.",
  sentiment: { positive: 44, neutral: 0, negative: 33, mixed: 23 },
  overall_score: 72,
  complaints: [
    {
      text: "Long waits with reservations and on entrées",
      count: 2,
      severity: "high",
      examples: [
        "Waited 45 minutes despite a reservation",
        "Kitchen forgot our entrées entirely",
      ],
    },
    {
      text: "Order accuracy and manager response",
      count: 1,
      severity: "high",
      examples: ["Got my order wrong twice", "Manager was dismissive"],
    },
    {
      text: "Noise level and lighting intensity",
      count: 1,
      severity: "low",
      examples: ["Couldn't hold a conversation", "Lighting was borderline strobe"],
    },
  ],
  praises: [
    {
      text: "Excellent food across menu",
      count: 4,
      examples: [
        "Pasta was incredible",
        "Eggs benedict is reliably great",
        "Chef's tasting menu was worth every penny",
      ],
    },
    {
      text: "Knowledgeable, accommodating service",
      count: 2,
      examples: [
        "Server knew every wine on the list",
        "Accommodated a nut allergy without blinking",
      ],
    },
  ],
  feature_requests: [
    {
      text: "Better reservation pacing / honoring booked times",
      count: 1,
      examples: ["45-minute wait despite a reservation"],
    },
  ],
  action_items: [
    {
      title: "Reduce seating and kitchen wait times",
      description:
        "Reservations aren't being honored on time and at least one table lost entrées entirely. Audit floor flow and ticket pacing.",
      priority: "high",
    },
    {
      title: "Retrain front-of-house on order errors and recovery",
      description:
        "One review flagged a dismissive manager after repeat billing for the wrong order. Coach service recovery scripts.",
      priority: "high",
    },
    {
      title: "Review ambient noise and lighting levels",
      description:
        "A review called out strobe-like lighting and noise preventing conversation. Small environmental tweaks likely pay off.",
      priority: "low",
    },
  ],
  rating_distribution: { "1": 2, "2": 1, "3": 2, "4": 0, "5": 4 },
};

// ---------- Healthcare ----------

const healthcareReviews: DemoReview[] = [
  {
    content:
      "Dr. Patel took time to actually explain my lab results. First doctor in years who didn't rush me out.",
    rating: 5,
    author: "Robin C.",
    source: "Google",
    review_date: "2026-04-01",
    sentiment: "positive",
    sentiment_score: 0.96,
    themes: ["doctor", "communication"],
  },
  {
    content:
      "Front desk was warm, the facility was spotless, and I was called back within 5 minutes of my appointment time.",
    rating: 5,
    author: "Mei T.",
    source: "Google",
    review_date: "2026-04-03",
    sentiment: "positive",
    sentiment_score: 0.94,
    themes: ["facility", "wait-times", "staff"],
  },
  {
    content:
      "Billed me twice for the same visit and it took four calls to resolve. Billing department is a nightmare.",
    rating: 1,
    author: "Drew K.",
    source: "Yelp",
    review_date: "2026-04-04",
    sentiment: "negative",
    sentiment_score: 0.1,
    themes: ["billing"],
  },
  {
    content:
      "Waited 90 minutes past my appointment time. No one updated me or apologized.",
    rating: 2,
    author: "Priscilla N.",
    source: "Google",
    review_date: "2026-04-05",
    sentiment: "negative",
    sentiment_score: 0.2,
    themes: ["wait-times", "communication"],
  },
  {
    content:
      "The nurse was fantastic and the doctor was thorough, but the patient portal is a mess — can't find my after-visit summary.",
    rating: 4,
    author: "Aaron L.",
    source: "Google",
    review_date: "2026-04-07",
    sentiment: "mixed",
    sentiment_score: 0.65,
    themes: ["staff", "portal"],
  },
  {
    content:
      "Online scheduling is easy but phone reminders come in at 7am which wakes the whole house.",
    rating: 4,
    author: "Vivian H.",
    source: "Yelp",
    review_date: "2026-04-09",
    sentiment: "mixed",
    sentiment_score: 0.6,
    themes: ["scheduling", "reminders"],
  },
  {
    content:
      "Receptionist was short with me and the check-in kiosk rejected my insurance card three times.",
    rating: 2,
    author: "Owen F.",
    source: "Google",
    review_date: "2026-04-10",
    sentiment: "negative",
    sentiment_score: 0.22,
    themes: ["staff", "check-in"],
  },
  {
    content:
      "Walked in nervous about a procedure and left reassured. The team explained every step.",
    rating: 5,
    author: "Naomi B.",
    source: "Google",
    review_date: "2026-04-11",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["communication", "doctor"],
  },
  {
    content:
      "Clean waiting area with actual coffee that didn't taste like a vending machine. Small thing but appreciated.",
    rating: 4,
    author: "Jonah R.",
    source: "Google",
    review_date: "2026-04-12",
    sentiment: "positive",
    sentiment_score: 0.85,
    themes: ["facility"],
  },
];

const healthcareAnalysis: DemoAnalysis = {
  summary:
    "Patients consistently praise the clinical staff and facility, but billing errors, long appointment waits, and a clunky patient portal are the dominant pain points.",
  sentiment: { positive: 45, neutral: 0, negative: 33, mixed: 22 },
  overall_score: 75,
  complaints: [
    {
      text: "Billing errors and slow resolution",
      count: 1,
      severity: "high",
      examples: [
        "Billed me twice for the same visit",
        "Took four calls to resolve",
      ],
    },
    {
      text: "Long waits past appointment time",
      count: 1,
      severity: "high",
      examples: ["Waited 90 minutes past my appointment time"],
    },
    {
      text: "Front desk and check-in friction",
      count: 1,
      severity: "medium",
      examples: [
        "Receptionist was short with me",
        "Check-in kiosk rejected my insurance card three times",
      ],
    },
  ],
  praises: [
    {
      text: "Doctors explain results and procedures clearly",
      count: 2,
      examples: [
        "Dr. Patel took time to explain my lab results",
        "Team explained every step",
      ],
    },
    {
      text: "Clean, welcoming facility",
      count: 2,
      examples: ["Facility was spotless", "Actual coffee in the waiting area"],
    },
    {
      text: "Nursing staff quality",
      count: 1,
      examples: ["Nurse was fantastic"],
    },
  ],
  feature_requests: [
    {
      text: "Improved patient portal and after-visit summary access",
      count: 1,
      examples: ["Can't find my after-visit summary"],
    },
    {
      text: "Respect quiet hours on automated reminders",
      count: 1,
      examples: ["Phone reminders come in at 7am"],
    },
  ],
  action_items: [
    {
      title: "Audit billing for duplicate charges and streamline disputes",
      description:
        "A review flagged double-billing that took four calls to resolve. Add duplicate-charge detection and a single-touch dispute path.",
      priority: "high",
    },
    {
      title: "Communicate appointment delays proactively",
      description:
        "Patients waiting 90 minutes with no update. Have staff ping patients when provider is running >15min late.",
      priority: "high",
    },
    {
      title: "Fix patient portal after-visit summary discovery",
      description:
        "After-visit summaries are hard to find. Surface them on the home screen post-appointment.",
      priority: "medium",
    },
  ],
  rating_distribution: { "1": 1, "2": 2, "3": 0, "4": 3, "5": 3 },
};

// ---------- Professional Services ----------

const professionalReviews: DemoReview[] = [
  {
    content:
      "They replied to every email within an hour and delivered the contract review two days ahead of schedule.",
    rating: 5,
    author: "Cameron D.",
    source: "Google",
    review_date: "2026-04-01",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["responsiveness", "delivery"],
  },
  {
    content:
      "Deeply knowledgeable team. Caught a tax issue our previous accountant missed for three years.",
    rating: 5,
    author: "Hana Y.",
    source: "Google",
    review_date: "2026-04-03",
    sentiment: "positive",
    sentiment_score: 0.96,
    themes: ["expertise"],
  },
  {
    content:
      "Invoice was 40% higher than the estimate with no heads-up. Had to argue for a detailed breakdown.",
    rating: 2,
    author: "Ibrahim S.",
    source: "Yelp",
    review_date: "2026-04-04",
    sentiment: "negative",
    sentiment_score: 0.2,
    themes: ["billing", "transparency"],
  },
  {
    content:
      "Work quality was top-notch but communication dropped off for two weeks in the middle of the project.",
    rating: 3,
    author: "Eva M.",
    source: "Google",
    review_date: "2026-04-06",
    sentiment: "mixed",
    sentiment_score: 0.55,
    themes: ["quality", "communication"],
  },
  {
    content:
      "Missed our filing deadline by a day. Apologized but the damage was already done.",
    rating: 1,
    author: "Theo K.",
    source: "Yelp",
    review_date: "2026-04-07",
    sentiment: "negative",
    sentiment_score: 0.1,
    themes: ["deadlines"],
  },
  {
    content:
      "Clear, plain-English advice. I finally understand what I'm signing.",
    rating: 5,
    author: "Lila P.",
    source: "Google",
    review_date: "2026-04-09",
    sentiment: "positive",
    sentiment_score: 0.94,
    themes: ["communication", "expertise"],
  },
  {
    content:
      "Good work but their intake form is a 40-field PDF from 2008. Please modernize.",
    rating: 4,
    author: "Omar J.",
    source: "Google",
    review_date: "2026-04-10",
    sentiment: "mixed",
    sentiment_score: 0.65,
    themes: ["onboarding", "technology"],
  },
  {
    content:
      "Felt rushed through our intake call and the follow-up advice was generic.",
    rating: 2,
    author: "Grace T.",
    source: "Yelp",
    review_date: "2026-04-11",
    sentiment: "negative",
    sentiment_score: 0.25,
    themes: ["service-quality", "communication"],
  },
  {
    content:
      "Reasonable rates, clear scope upfront, and delivered exactly what was promised.",
    rating: 5,
    author: "Felix A.",
    source: "Google",
    review_date: "2026-04-12",
    sentiment: "positive",
    sentiment_score: 0.93,
    themes: ["pricing", "delivery"],
  },
];

const professionalAnalysis: DemoAnalysis = {
  summary:
    "Clients praise the team's expertise, plain-English communication, and on-time delivery, but a surprise invoice, a missed deadline, and communication dropoffs midway through engagements are denting trust.",
  sentiment: { positive: 44, neutral: 0, negative: 33, mixed: 23 },
  overall_score: 74,
  complaints: [
    {
      text: "Invoice overruns without warning",
      count: 1,
      severity: "high",
      examples: ["Invoice was 40% higher than the estimate with no heads-up"],
    },
    {
      text: "Mid-engagement communication dropoffs",
      count: 2,
      severity: "medium",
      examples: [
        "Communication dropped off for two weeks",
        "Felt rushed through our intake call",
      ],
    },
    {
      text: "Missed filing deadline",
      count: 1,
      severity: "high",
      examples: ["Missed our filing deadline by a day"],
    },
  ],
  praises: [
    {
      text: "Deep expertise catches things others miss",
      count: 2,
      examples: ["Caught a tax issue our previous accountant missed"],
    },
    {
      text: "Plain-English explanation of complex topics",
      count: 2,
      examples: ["I finally understand what I'm signing"],
    },
    {
      text: "On-time or ahead-of-schedule delivery",
      count: 2,
      examples: ["Delivered two days ahead of schedule"],
    },
  ],
  feature_requests: [
    {
      text: "Modern digital intake form",
      count: 1,
      examples: ["Intake form is a 40-field PDF from 2008"],
    },
  ],
  action_items: [
    {
      title: "Notify clients proactively on estimate overruns",
      description:
        "Auto-alert clients when projected invoice exceeds estimate by 10%+, with itemized reason.",
      priority: "high",
    },
    {
      title: "Set mid-engagement check-in cadence",
      description:
        "Two reviews flagged silence mid-project. Commit to weekly status notes regardless of milestone state.",
      priority: "medium",
    },
    {
      title: "Digitize client intake form",
      description:
        "Replace the legacy PDF with a modern online intake. Low lift, high perceived polish.",
      priority: "low",
    },
  ],
  rating_distribution: { "1": 1, "2": 2, "3": 1, "4": 1, "5": 4 },
};

// ---------- Agency ----------

const agencyReviews: DemoReview[] = [
  {
    content:
      "Our rebrand lift was 3× better than the last one and they delivered on schedule. Strategy work was sharp.",
    rating: 5,
    author: "Sydney K.",
    source: "Google",
    review_date: "2026-04-01",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["creative", "delivery", "strategy"],
  },
  {
    content:
      "Creative director brought ideas we hadn't considered. Landing page conversion jumped 28%.",
    rating: 5,
    author: "Wes D.",
    source: "Clutch",
    review_date: "2026-04-03",
    sentiment: "positive",
    sentiment_score: 0.94,
    themes: ["creative", "results"],
  },
  {
    content:
      "Campaign launched two weeks late and we missed our seasonal window. Hard to recommend after that.",
    rating: 2,
    author: "Amelia R.",
    source: "Google",
    review_date: "2026-04-04",
    sentiment: "negative",
    sentiment_score: 0.22,
    themes: ["deadlines"],
  },
  {
    content:
      "Project came in 22% over budget and the scope creep wasn't flagged until invoicing.",
    rating: 2,
    author: "Rafael M.",
    source: "Clutch",
    review_date: "2026-04-06",
    sentiment: "negative",
    sentiment_score: 0.18,
    themes: ["budget", "scope"],
  },
  {
    content:
      "Work was gorgeous but revisions took 4 days each. The loop made launch feel rushed at the end.",
    rating: 3,
    author: "Nora B.",
    source: "Google",
    review_date: "2026-04-07",
    sentiment: "mixed",
    sentiment_score: 0.55,
    themes: ["creative", "responsiveness"],
  },
  {
    content:
      "Account lead was proactive, the creative was fresh, and they pushed back on ideas that wouldn't have worked.",
    rating: 5,
    author: "Graham H.",
    source: "Google",
    review_date: "2026-04-09",
    sentiment: "positive",
    sentiment_score: 0.95,
    themes: ["strategy", "creative", "communication"],
  },
  {
    content:
      "Deliverables were solid but reporting was copy-paste and didn't tie back to our KPIs.",
    rating: 3,
    author: "Isla F.",
    source: "Clutch",
    review_date: "2026-04-10",
    sentiment: "mixed",
    sentiment_score: 0.5,
    themes: ["reporting"],
  },
  {
    content:
      "Felt like we were handed off to juniors after the pitch. Senior talent disappeared week two.",
    rating: 2,
    author: "Benji O.",
    source: "Clutch",
    review_date: "2026-04-11",
    sentiment: "negative",
    sentiment_score: 0.2,
    themes: ["team", "quality"],
  },
  {
    content:
      "Great partner for a small brand — they treated our tiny budget with the same care as a big client.",
    rating: 5,
    author: "Zoe T.",
    source: "Google",
    review_date: "2026-04-12",
    sentiment: "positive",
    sentiment_score: 0.96,
    themes: ["partnership", "value"],
  },
];

const agencyAnalysis: DemoAnalysis = {
  summary:
    "Clients love the creative work, strategic pushback, and measurable results, but missed launch windows, budget overruns, and senior-to-junior handoffs after the pitch are eroding retention.",
  sentiment: { positive: 44, neutral: 0, negative: 33, mixed: 23 },
  overall_score: 73,
  complaints: [
    {
      text: "Missed deadlines and seasonal launch windows",
      count: 1,
      severity: "high",
      examples: ["Campaign launched two weeks late"],
    },
    {
      text: "Budget overruns with unreported scope creep",
      count: 1,
      severity: "high",
      examples: ["22% over budget", "Scope creep wasn't flagged until invoicing"],
    },
    {
      text: "Senior-to-junior handoff after pitch",
      count: 1,
      severity: "medium",
      examples: ["Senior talent disappeared week two"],
    },
    {
      text: "Slow revision turnaround",
      count: 1,
      severity: "medium",
      examples: ["Revisions took 4 days each"],
    },
  ],
  praises: [
    {
      text: "Creative quality and fresh ideas",
      count: 3,
      examples: [
        "Creative was fresh",
        "Ideas we hadn't considered",
        "Work was gorgeous",
      ],
    },
    {
      text: "Measurable results (conversion, brand lift)",
      count: 2,
      examples: [
        "Landing page conversion jumped 28%",
        "Rebrand lift was 3× better",
      ],
    },
    {
      text: "Strategic pushback and account leadership",
      count: 1,
      examples: ["Pushed back on ideas that wouldn't have worked"],
    },
  ],
  feature_requests: [
    {
      text: "Custom KPI-tied reporting, not templated",
      count: 1,
      examples: ["Reporting was copy-paste and didn't tie back to our KPIs"],
    },
  ],
  action_items: [
    {
      title: "Tighten timeline ownership for seasonal launches",
      description:
        "Missed windows cost campaigns their moment. Add buffer + weekly timeline review in last 4 weeks pre-launch.",
      priority: "high",
    },
    {
      title: "Flag scope creep at 10%, not at invoicing",
      description:
        "A 22% budget overrun reached a client as a surprise. Automate scope/budget variance alerts midway through projects.",
      priority: "high",
    },
    {
      title: "Guarantee pitch-team continuity through week four",
      description:
        "Clients notice when senior talent disappears after the sell. Lock pitch-team hours into the engagement.",
      priority: "medium",
    },
  ],
  rating_distribution: { "1": 0, "2": 3, "3": 2, "4": 0, "5": 4 },
};

// ---------- Registry ----------

export const DEMO_SETS: Record<DemoIndustryId, DemoSet> = {
  ecommerce: {
    industryLabel: "E-commerce",
    dbIndustry: "E-commerce",
    reviews: ecommerceReviews,
    analysis: ecommerceAnalysis,
  },
  saas: {
    industryLabel: "SaaS",
    dbIndustry: "SaaS",
    reviews: saasReviews,
    analysis: saasAnalysis,
  },
  restaurant: {
    industryLabel: "Restaurant",
    dbIndustry: "Restaurant",
    reviews: restaurantReviews,
    analysis: restaurantAnalysis,
  },
  healthcare: {
    industryLabel: "Healthcare",
    dbIndustry: "Healthcare",
    reviews: healthcareReviews,
    analysis: healthcareAnalysis,
  },
  professional: {
    industryLabel: "Professional Services",
    dbIndustry: "Other",
    reviews: professionalReviews,
    analysis: professionalAnalysis,
  },
  agency: {
    industryLabel: "Agency",
    dbIndustry: "Agency",
    reviews: agencyReviews,
    analysis: agencyAnalysis,
  },
};

// Fallback when user skipped onboarding without picking an industry.
export const GENERIC_DEMO: DemoSet = {
  industryLabel: "Sample",
  dbIndustry: "Other",
  reviews: saasReviews,
  analysis: saasAnalysis,
};

export function getDemoSet(industryId: string | null | undefined): DemoSet {
  if (!industryId) return GENERIC_DEMO;
  const set = DEMO_SETS[industryId as DemoIndustryId];
  return set ?? GENERIC_DEMO;
}
