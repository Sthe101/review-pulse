export interface ReviewFixture {
  content: string;
  rating: number;
  author: string;
  source: string;
  review_date: string;
}

export const positiveReviews: ReviewFixture[] = [
  {
    content:
      "Absolutely love this product. Shipping was fast and the quality exceeded my expectations.",
    rating: 5,
    author: "Alex P.",
    source: "Google",
    review_date: "2026-03-01",
  },
  {
    content:
      "Best purchase I've made this year. Customer service actually responds within an hour.",
    rating: 5,
    author: "Jamie R.",
    source: "Trustpilot",
    review_date: "2026-03-04",
  },
  {
    content: "Works exactly as advertised, great value for the price.",
    rating: 4,
    author: "Sam T.",
    source: "Google",
    review_date: "2026-03-07",
  },
];

export const negativeReviews: ReviewFixture[] = [
  {
    content:
      "Terrible experience. Item arrived damaged and support took three weeks to reply.",
    rating: 1,
    author: "Morgan K.",
    source: "Yelp",
    review_date: "2026-03-02",
  },
  {
    content:
      "The product broke after a week. Requested a refund and got ghosted.",
    rating: 1,
    author: "Chris L.",
    source: "Trustpilot",
    review_date: "2026-03-05",
  },
  {
    content: "Not worth the money. Quality is nothing like the marketing photos.",
    rating: 2,
    author: "Taylor B.",
    source: "Google",
    review_date: "2026-03-09",
  },
];

export const mixedReviews: ReviewFixture[] = [
  ...positiveReviews,
  ...negativeReviews,
  {
    content:
      "Decent product but the onboarding flow is confusing. Wish they had a clearer tutorial.",
    rating: 3,
    author: "Jordan M.",
    source: "G2",
    review_date: "2026-03-10",
  },
  {
    content:
      "Love the features but the app crashes on iOS sometimes. Please fix the stability issues.",
    rating: 3,
    author: "Riley S.",
    source: "App Store",
    review_date: "2026-03-11",
  },
];

export const emptyReviews: ReviewFixture[] = [];

export const largeBatchReviews: ReviewFixture[] = Array.from(
  { length: 250 },
  (_, i) => {
    const rating = ((i % 5) + 1) as 1 | 2 | 3 | 4 | 5;
    const positive = rating >= 4;
    return {
      content: positive
        ? `Review ${i + 1}: Happy with the purchase, would recommend to others.`
        : `Review ${i + 1}: Had some issues with this, expected better quality.`,
      rating,
      author: `User ${i + 1}`,
      source: ["Google", "Yelp", "Trustpilot", "G2"][i % 4] ?? "Google",
      review_date: `2026-03-${String((i % 28) + 1).padStart(2, "0")}`,
    };
  }
);
