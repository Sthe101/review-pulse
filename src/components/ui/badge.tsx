import type { CSSProperties, ReactNode } from "react";

type Variant = "teal" | "pos" | "neg" | "warn" | "navy";

type BadgeProps = {
  variant?: Variant;
  color?: string;
  bg?: string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

const VARIANT_COLORS: Record<Variant, { color: string; bg: string }> = {
  teal: { color: "var(--teal)", bg: "var(--tealbg)" },
  pos: { color: "var(--pos)", bg: "var(--posbg)" },
  neg: { color: "var(--neg)", bg: "var(--negbg)" },
  warn: { color: "var(--warn)", bg: "var(--warnbg)" },
  navy: { color: "var(--navy)", bg: "var(--navybg)" },
};

export function Badge({
  variant = "teal",
  color,
  bg,
  children,
  className = "",
  style,
}: BadgeProps) {
  const v = VARIANT_COLORS[variant];
  return (
    <span
      className={`badge ${className}`}
      style={{
        color: color ?? v.color,
        background: bg ?? v.bg,
        ...style,
      }}
    >
      {children}
    </span>
  );
}
