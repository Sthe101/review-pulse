"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Spinner } from "./spinner";

type Variant = "coral" | "navy" | "teal" | "outline" | "danger";
type Size = "sm" | "md" | "lg";

type ButtonProps = {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  loading?: boolean;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const VARIANT_CLASS: Record<Variant, string> = {
  coral: "btn-coral",
  navy: "btn-navy",
  teal: "btn-teal",
  outline: "btn-outline",
  danger: "btn-danger",
};

const SIZE_STYLE: Record<Size, { padding: string; fontSize: number }> = {
  sm: { padding: "6px 12px", fontSize: 13 },
  md: { padding: "10px 20px", fontSize: 14 },
  lg: { padding: "14px 28px", fontSize: 16 },
};

export function Button({
  variant = "navy",
  size = "md",
  fullWidth = false,
  loading = false,
  disabled,
  className = "",
  style,
  children,
  ...rest
}: ButtonProps) {
  const sz = SIZE_STYLE[size];
  return (
    <button
      className={`btn ${VARIANT_CLASS[variant]} ${className}`}
      disabled={disabled || loading}
      style={{
        padding: sz.padding,
        fontSize: sz.fontSize,
        width: fullWidth ? "100%" : undefined,
        ...style,
      }}
      {...rest}
    >
      {loading ? <Spinner size="sm" /> : null}
      {children}
    </button>
  );
}
