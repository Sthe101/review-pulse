type SentimentBarProps = {
  positive: number;
  neutral: number;
  negative: number;
  height?: number;
  className?: string;
};

export function SentimentBar({
  positive,
  neutral,
  negative,
  height = 8,
  className = "",
}: SentimentBarProps) {
  const total = positive + neutral + negative || 1;
  const p = Math.round((positive / total) * 100);
  const nu = Math.round((neutral / total) * 100);
  const n = Math.max(0, 100 - p - nu);

  return (
    <div
      className={className}
      role="img"
      aria-label={`Sentiment: ${p}% positive, ${nu}% neutral, ${n}% negative`}
      style={{
        display: "flex",
        borderRadius: 99,
        overflow: "hidden",
        height,
        width: "100%",
      }}
    >
      <div style={{ width: `${p}%`, background: "var(--pos)" }} />
      <div style={{ width: `${nu}%`, background: "var(--tx3)" }} />
      <div style={{ width: `${n}%`, background: "var(--neg)" }} />
    </div>
  );
}
