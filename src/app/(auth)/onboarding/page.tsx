"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { createDemoProject } from "@/lib/onboarding/create-demo-project";
import { updateChecklistItem } from "@/lib/onboarding/update-checklist";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Icon, type IconName } from "@/components/ui/icon";

type Option = { id: string; label: string; icon: IconName };

const ROLES: Option[] = [
  { id: "owner", label: "Business Owner", icon: "usr" },
  { id: "marketing", label: "Marketing Manager", icon: "trend" },
  { id: "product", label: "Product Manager", icon: "bulb" },
  { id: "support", label: "CX/Support", icon: "msg" },
  { id: "agency", label: "Agency", icon: "folder" },
  { id: "other", label: "Other", icon: "gear" },
];

const INDUSTRIES: Option[] = [
  { id: "ecommerce", label: "E-commerce", icon: "card" },
  { id: "saas", label: "SaaS", icon: "dash" },
  { id: "restaurant", label: "Restaurant/Hospitality", icon: "star" },
  { id: "healthcare", label: "Healthcare", icon: "plus" },
  { id: "professional", label: "Professional Services", icon: "usr" },
  { id: "agency", label: "Agency", icon: "folder" },
];

const SOURCES: Option[] = [
  { id: "google", label: "Google", icon: "srch" },
  { id: "amazon", label: "Amazon", icon: "card" },
  { id: "yelp", label: "Yelp", icon: "star" },
  { id: "trustpilot", label: "Trustpilot", icon: "ok" },
  { id: "g2", label: "G2/Capterra", icon: "bar" },
  { id: "app_store", label: "App Store", icon: "play" },
  { id: "multiple", label: "Multiple", icon: "share" },
  { id: "none", label: "None yet", icon: "x" },
];

const GOALS: Option[] = [
  { id: "complaints", label: "Find & Fix Complaints", icon: "warn" },
  { id: "sentiment", label: "Track Sentiment", icon: "trend" },
  { id: "competitive", label: "Competitive Analysis", icon: "tgt" },
  { id: "stakeholders", label: "Report to Stakeholders", icon: "dl" },
];

const TOTAL_STEPS = 4;

const STEP_META: Record<number, { title: string; subtitle: string }> = {
  1: { title: "What best describes your role?", subtitle: "We'll tailor ReviewPulse to you." },
  2: { title: "Which industry are you in?", subtitle: "Helps us benchmark your results." },
  3: { title: "Where do your reviews come from?", subtitle: "Pick any that apply." },
  4: { title: "What's your main goal?", subtitle: "We'll highlight the right features first." },
};

type OnboardingData = {
  role: string | null;
  industry: string | null;
  sources: string[];
  goal: string | null;
};

function SelectCard({
  option,
  selected,
  onClick,
}: {
  option: Option;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      padding={16}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        minHeight: 96,
        textAlign: "center",
        borderColor: selected ? "var(--teal)" : undefined,
        background: selected
          ? "color-mix(in srgb, var(--teal) 10%, transparent)"
          : undefined,
        transition: "border-color 0.15s, background 0.15s",
      }}
    >
      <Icon
        name={option.icon}
        size={22}
        color={selected ? "var(--teal)" : "var(--tx2)"}
      />
      <span
        style={{
          fontSize: 13,
          fontWeight: 600,
          color: selected ? "var(--teal)" : "var(--tx)",
          lineHeight: 1.3,
        }}
      >
        {option.label}
      </span>
    </Card>
  );
}

function SourceChip({
  option,
  selected,
  onClick,
}: {
  option: Option;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 14px",
        borderRadius: 999,
        border: `1px solid ${selected ? "var(--teal)" : "var(--bd)"}`,
        background: selected
          ? "color-mix(in srgb, var(--teal) 10%, transparent)"
          : "var(--bg2)",
        color: selected ? "var(--teal)" : "var(--tx)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s, color 0.15s",
      }}
    >
      <Icon
        name={selected ? "ok" : option.icon}
        size={14}
        color={selected ? "var(--teal)" : "var(--tx2)"}
      />
      {option.label}
    </button>
  );
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userLoaded, setUserLoaded] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    role: null,
    industry: null,
    sources: [],
    goal: null,
  });

  useEffect(() => {
    const supabase = createClient();
    void supabase.auth.getUser().then(({ data: res }) => {
      setUserId(res?.user?.id ?? null);
      setUserLoaded(true);
    });
  }, []);

  const canContinue = (() => {
    if (step === 1) return data.role !== null;
    if (step === 2) return data.industry !== null;
    if (step === 3) return data.sources.length > 0;
    if (step === 4) return data.goal !== null;
    return false;
  })();

  async function persist(payload: Record<string, unknown>) {
    if (!userId) {
      toast.error("Session expired. Please sign in again.");
      router.push("/login");
      return false;
    }
    const supabase = createClient();
    const { error } = await (supabase.from("profiles") as unknown as {
      update: (v: {
        onboarding_data: Record<string, unknown>;
      }) => {
        eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
      };
    })
      .update({
        onboarding_data: payload,
      })
      .eq("id", userId);
    if (error) {
      toast.error("Couldn't save. Please try again.");
      return false;
    }
    const checklistResult = await updateChecklistItem(userId, "survey", true);
    if (checklistResult.error) {
      console.warn("Failed to mark survey complete:", checklistResult.error);
    }
    return true;
  }

  async function seedDemo(industryId: string | null, skipped: boolean) {
    if (!userId) return;
    const { error } = await createDemoProject({
      userId,
      industryId,
      skipped,
    });
    if (error) {
      console.warn("Demo project seeding failed:", error);
    }
  }

  async function handleComplete() {
    setSaving(true);
    const ok = await persist({
      role: data.role,
      industry: data.industry,
      sources: data.sources,
      goal: data.goal,
    });
    if (ok) {
      await seedDemo(data.industry, false);
      router.push("/dashboard");
    } else setSaving(false);
  }

  async function handleSkip() {
    setSaving(true);
    const ok = await persist({ skipped: true });
    if (ok) {
      await seedDemo(null, true);
      router.push("/dashboard");
    } else setSaving(false);
  }

  function handleNext() {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
      return;
    }
    void handleComplete();
  }

  function handleBack() {
    if (step > 1) setStep(step - 1);
  }

  function toggleSource(id: string) {
    setData((prev) => {
      const has = prev.sources.includes(id);
      return {
        ...prev,
        sources: has
          ? prev.sources.filter((s) => s !== id)
          : [...prev.sources, id],
      };
    });
  }

  const meta = STEP_META[step]!;
  const progress = (step / TOTAL_STEPS) * 100;

  return (
    <Card padding={28} style={{ width: "100%" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <span style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 600 }}>
          Step {step} of {TOTAL_STEPS}
        </span>
        <button
          type="button"
          onClick={handleSkip}
          disabled={saving || !userLoaded}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--tx3)",
            fontSize: 13,
            cursor: saving ? "not-allowed" : "pointer",
            fontWeight: 500,
            padding: 0,
          }}
        >
          Skip →
        </button>
      </div>

      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={TOTAL_STEPS}
        aria-valuenow={step}
        style={{
          height: 4,
          background: "var(--bd)",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: 24,
        }}
      >
        <div
          data-testid="progress-fill"
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "var(--teal)",
            transition: "width 0.2s ease",
          }}
        />
      </div>

      <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>
        {meta.title}
      </h1>
      <p
        style={{
          fontSize: 14,
          color: "var(--tx3)",
          marginBottom: 20,
        }}
      >
        {meta.subtitle}
      </p>

      {step === 1 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {ROLES.map((opt) => (
            <SelectCard
              key={opt.id}
              option={opt}
              selected={data.role === opt.id}
              onClick={() => setData((p) => ({ ...p, role: opt.id }))}
            />
          ))}
        </div>
      )}

      {step === 2 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {INDUSTRIES.map((opt) => (
            <SelectCard
              key={opt.id}
              option={opt}
              selected={data.industry === opt.id}
              onClick={() => setData((p) => ({ ...p, industry: opt.id }))}
            />
          ))}
        </div>
      )}

      {step === 3 && (
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginBottom: 24,
          }}
        >
          {SOURCES.map((opt) => (
            <SourceChip
              key={opt.id}
              option={opt}
              selected={data.sources.includes(opt.id)}
              onClick={() => toggleSource(opt.id)}
            />
          ))}
        </div>
      )}

      {step === 4 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
            marginBottom: 24,
          }}
        >
          {GOALS.map((opt) => (
            <SelectCard
              key={opt.id}
              option={opt}
              selected={data.goal === opt.id}
              onClick={() => setData((p) => ({ ...p, goal: opt.id }))}
            />
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        {step > 1 && (
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={saving}
            style={{ flex: 1 }}
          >
            Back
          </Button>
        )}
        <Button
          type="button"
          variant="coral"
          onClick={handleNext}
          disabled={!canContinue || saving || !userLoaded}
          loading={saving && step === TOTAL_STEPS}
          style={{ flex: 1 }}
        >
          {step === TOTAL_STEPS ? "Get Started →" : "Continue →"}
        </Button>
      </div>
    </Card>
  );
}
