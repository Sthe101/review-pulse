import type { SentimentBreakdown } from "./types";

export function normalizeSentiment(s: SentimentBreakdown): SentimentBreakdown {
  const sum = s.positive + s.neutral + s.negative + s.mixed;
  if (sum === 0) return { positive: 0, neutral: 100, negative: 0, mixed: 0 };
  if (sum === 100) return { ...s };

  const scale = 100 / sum;
  const scaled: SentimentBreakdown = {
    positive: Math.round(s.positive * scale),
    neutral: Math.round(s.neutral * scale),
    negative: Math.round(s.negative * scale),
    mixed: Math.round(s.mixed * scale),
  };
  const drift =
    100 - (scaled.positive + scaled.neutral + scaled.negative + scaled.mixed);
  if (drift !== 0) {
    const keys: Array<keyof SentimentBreakdown> = [
      "positive",
      "neutral",
      "negative",
      "mixed",
    ];
    const largest = keys.reduce((a, b) => (scaled[a] >= scaled[b] ? a : b));
    scaled[largest] += drift;
  }
  return scaled;
}
