type DonutData = {
  positive: number;
  neutral: number;
  negative: number;
  mixed: number;
};

type DonutChartProps = {
  data: DonutData;
  size?: number;
  className?: string;
};

const COLORS: Record<keyof DonutData, string> = {
  positive: "#059669",
  neutral: "#94A3B8",
  negative: "#DC2626",
  mixed: "#D97706",
};

const KEYS = ["positive", "neutral", "negative", "mixed"] as const satisfies readonly (keyof DonutData)[];

export function DonutChart({ data, size = 160, className }: DonutChartProps) {
  const total = KEYS.reduce((sum, k) => sum + data[k], 0) || 1;

  let cursor = 0;
  const segments = KEYS.map((k) => {
    const v = data[k];
    const start = cursor;
    cursor += (v / total) * 360;
    const r = 60;
    const sr = ((start - 90) * Math.PI) / 180;
    const er = ((cursor - 90) * Math.PI) / 180;
    const large = v / total > 0.5 ? 1 : 0;
    const d = `M80,80 L${80 + r * Math.cos(sr)},${80 + r * Math.sin(sr)} A${r},${r} 0 ${large},1 ${80 + r * Math.cos(er)},${80 + r * Math.sin(er)} Z`;
    return <path key={k} d={d} fill={COLORS[k]} />;
  });

  const score = Math.round((data.positive / total) * 100);

  return (
    <svg
      viewBox="0 0 160 160"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={`Sentiment score ${score} out of 100`}
    >
      {segments}
      <circle cx="80" cy="80" r="38" fill="var(--bg2)" />
      <text
        x="80"
        y="75"
        textAnchor="middle"
        fontSize="28"
        fontWeight="700"
        fill="var(--tx)"
      >
        {score}
      </text>
      <text x="80" y="93" textAnchor="middle" fontSize="10" fill="var(--tx2)">
        SCORE
      </text>
    </svg>
  );
}
