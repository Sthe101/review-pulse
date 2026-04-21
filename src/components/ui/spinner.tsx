type SpinnerProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = { sm: 20, md: 32, lg: 48 } as const;

export function Spinner({ size = "md", className = "" }: SpinnerProps) {
  const px = SIZES[size];
  return (
    <span
      role="status"
      aria-label="Loading"
      className={`rp-spin inline-block ${className}`}
      style={{
        width: px,
        height: px,
        border: `${Math.max(2, Math.round(px / 12))}px solid var(--bd)`,
        borderTopColor: "var(--teal)",
        borderRadius: "50%",
      }}
    />
  );
}
