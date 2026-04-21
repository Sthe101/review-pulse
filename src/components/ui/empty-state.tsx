"use client";

import { Button } from "./button";
import { Icon, type IconName } from "./icon";

type EmptyStateProps = {
  icon?: IconName;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  icon = "folder",
  title,
  description,
  actionLabel,
  onAction,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`card ${className}`}
      style={{
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 56,
          height: 56,
          borderRadius: 14,
          background: "var(--bg3)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
          color: "var(--tx3)",
        }}
      >
        <Icon name={icon} size={28} />
      </div>
      <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>{title}</div>
      {description && (
        <p
          style={{
            fontSize: 14,
            color: "var(--tx2)",
            maxWidth: 360,
            margin: "0 auto 16px",
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {actionLabel && onAction && (
        <Button variant="navy" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
