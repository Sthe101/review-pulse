type SkeletonProps = {
  width?: number | string;
  height?: number | string;
  rounded?: number | string;
  className?: string;
};

export function Skeleton({
  width = "100%",
  height = 16,
  rounded = 6,
  className = "",
}: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={`rp-pulse inline-block ${className}`}
      style={{
        width,
        height,
        borderRadius: rounded,
        background: "var(--bd)",
      }}
    />
  );
}
