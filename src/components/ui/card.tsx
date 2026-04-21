"use client";

import type { CSSProperties, ReactNode } from "react";

type CardProps = {
  clickable?: boolean;
  padding?: number | string;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
};

export function Card({
  clickable = false,
  padding = 20,
  children,
  className = "",
  style,
  onClick,
}: CardProps) {
  const classes = `card ${clickable || onClick ? "card-click" : ""} ${className}`.trim();
  return (
    <div
      className={classes}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      style={{ padding, ...style }}
    >
      {children}
    </div>
  );
}
