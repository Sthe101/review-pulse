"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card } from "@/components/ui/card";
import { Icon, type IconName } from "@/components/ui/icon";
import type { OnboardingChecklist } from "@/types/database";

type ChecklistKey = keyof OnboardingChecklist;

interface ChecklistItemDef {
  key: ChecklistKey;
  label: string;
  icon: IconName;
  href: string;
  cta: string;
}

const ITEMS: ChecklistItemDef[] = [
  { key: "account", label: "Create your account", icon: "usr", href: "/dashboard", cta: "" },
  { key: "survey", label: "Complete setup survey", icon: "bulb", href: "/onboarding", cta: "Start →" },
  { key: "firstProject", label: "Create your first project", icon: "folder", href: "/projects", cta: "Start →" },
  { key: "firstAnalysis", label: "Run your first analysis", icon: "trend", href: "/projects", cta: "Start →" },
  { key: "firstExport", label: "Export your first report", icon: "dl", href: "/projects", cta: "Start →" },
];

export interface OnboardingChecklistCardProps {
  checklist: OnboardingChecklist;
  userId: string;
  onDismiss?: () => void;
}

export function OnboardingChecklistCard({
  checklist,
  userId,
  onDismiss,
}: OnboardingChecklistCardProps) {
  const completedCount = useMemo(
    () => ITEMS.filter((i) => checklist[i.key]).length,
    [checklist]
  );
  const total = ITEMS.length;
  const allDone = completedCount === total;
  const percent = (completedCount / total) * 100;

  const [hidden, setHidden] = useState(false);
  const [dismissing, setDismissing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(() => {
      setHidden(true);
      onDismiss?.();
    }, 5000);
    return () => clearTimeout(t);
  }, [allDone, onDismiss]);

  async function handleDismiss() {
    if (dismissing) return;
    setDismissing(true);
    const supabase = createClient();
    await (
      supabase.from("profiles") as unknown as {
        update: (v: { onboarding_completed: boolean }) => {
          eq: (
            c: string,
            v: string
          ) => Promise<{ error: { message: string } | null }>;
        };
      }
    )
      .update({ onboarding_completed: true })
      .eq("id", userId);
    setHidden(true);
    onDismiss?.();
  }

  if (hidden) return null;

  const activeItem = allDone ? null : ITEMS.find((i) => !checklist[i.key]) ?? null;

  return (
    <Card
      padding={20}
      style={{
        borderColor: "var(--teal)",
        borderWidth: 1.5,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {allDone && mounted && <Confetti />}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
          gap: 12,
        }}
      >
        <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>
          {allDone ? "You're all set!" : "Get started with ReviewPulse"}
        </h3>
        {!allDone && (
          <button
            type="button"
            onClick={handleDismiss}
            disabled={dismissing}
            aria-label="Dismiss onboarding checklist"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--tx3)",
              fontSize: 12,
              cursor: dismissing ? "not-allowed" : "pointer",
              fontWeight: 500,
              padding: 0,
            }}
          >
            {dismissing ? "Dismissing…" : "Dismiss"}
          </button>
        )}
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 6,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 500 }}>
          {completedCount} of {total} complete
        </span>
        <span style={{ fontSize: 12, color: "var(--teal)", fontWeight: 600 }}>
          {Math.round(percent)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completedCount}
        style={{
          height: 4,
          background: "var(--bd)",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 16,
        }}
      >
        <div
          data-testid="checklist-progress-fill"
          style={{
            height: "100%",
            width: `${percent}%`,
            background: "var(--teal)",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      <ul
        style={{
          listStyle: "none",
          padding: 0,
          margin: 0,
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {ITEMS.map((item) => {
          const done = checklist[item.key];
          const isActive = activeItem?.key === item.key;
          return (
            <li
              key={item.key}
              data-testid={`checklist-item-${item.key}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "6px 0",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 999,
                  border: `1.5px solid ${done ? "var(--teal)" : "var(--bd)"}`,
                  background: done ? "var(--teal)" : "transparent",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {done && <Icon name="ok" size={12} color="#ffffff" />}
              </span>
              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: done ? "var(--tx3)" : "var(--tx)",
                  textDecoration: done ? "line-through" : "none",
                  fontWeight: isActive ? 600 : 400,
                }}
              >
                {item.label}
              </span>
              {isActive && item.cta && (
                <Link
                  href={item.href}
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--teal)",
                    textDecoration: "none",
                    whiteSpace: "nowrap",
                  }}
                >
                  {item.cta}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Confetti() {
  const pieces = useMemo(() => {
    const colors = ["var(--teal)", "var(--coral)", "var(--pos)", "var(--warn)", "var(--navy)"];
    return Array.from({ length: 30 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      duration: 2 + Math.random() * 1.4,
      rotate: Math.random() * 360,
      color: colors[i % colors.length]!,
      drift: (Math.random() - 0.5) * 60,
    }));
  }, []);

  return (
    <div
      aria-hidden
      data-testid="checklist-confetti"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {pieces.map((p, i) => (
        <span
          key={i}
          className="rp-confetti-piece"
          style={{
            position: "absolute",
            top: -12,
            left: `${p.left}%`,
            width: 8,
            height: 8,
            background: p.color,
            borderRadius: 1,
            transform: `rotate(${p.rotate}deg)`,
            animation: `rp-confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
            ["--drift" as string]: `${p.drift}px`,
          } as React.CSSProperties}
        />
      ))}
      <style>{`
        @keyframes rp-confetti-fall {
          to {
            transform: translate(var(--drift, 0), 240px) rotate(720deg);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .rp-confetti-piece { animation: none !important; opacity: 0 !important; }
        }
      `}</style>
    </div>
  );
}
