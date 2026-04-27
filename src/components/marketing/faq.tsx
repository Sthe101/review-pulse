"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";

export type FaqItem = { q: string; a: string };

export function FAQ({ items }: { items: readonly FaqItem[] }) {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <ul style={{ listStyle: "none" }}>
      {items.map((it, i) => {
        const expanded = open === i;
        const panelId = `faq-panel-${i}`;
        const buttonId = `faq-button-${i}`;
        return (
          <li key={it.q} className="card" style={{ marginBottom: 8, overflow: "hidden" }}>
            <button
              id={buttonId}
              type="button"
              aria-expanded={expanded}
              aria-controls={panelId}
              onClick={() => setOpen(expanded ? null : i)}
              style={{
                width: "100%",
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
                background: "transparent",
                border: "none",
                color: "inherit",
                fontFamily: "inherit",
                textAlign: "left",
              }}
            >
              <span style={{ fontWeight: 600, fontSize: 15 }}>{it.q}</span>
              <Icon name={expanded ? "cU" : "cD"} size={18} color="var(--tx3)" />
            </button>
            {expanded && (
              <div
                id={panelId}
                role="region"
                aria-labelledby={buttonId}
                style={{
                  padding: "0 20px 16px",
                  fontSize: 14,
                  color: "var(--tx2)",
                  lineHeight: 1.6,
                }}
              >
                {it.a}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
