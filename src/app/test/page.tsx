"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DonutChart } from "@/components/ui/donut-chart";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon, type IconName } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { SentimentBar } from "@/components/ui/sentiment-bar";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { useThemeStore } from "@/stores/theme-store";

const ALL_ICONS: IconName[] = [
  "logo", "dash", "folder", "plus", "trend", "link", "gear", "card",
  "cL", "cR", "cD", "cU", "ok", "x", "clk", "dollar", "bar", "msg",
  "srch", "bulb", "tgt", "dl", "usr", "mail", "lock", "warn", "play",
  "star", "out", "share", "up", "menu", "sun", "moon", "bell",
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 12, color: "var(--tx)" }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
        {children}
      </div>
    </section>
  );
}

export default function TestPage() {
  const [modalOpen, setModalOpen] = useState(false);
  const { isDark, toggle } = useThemeStore();

  return (
    <main
      style={{
        padding: "32px 24px",
        maxWidth: 1100,
        margin: "0 auto",
        color: "var(--tx)",
      }}
    >
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
        }}
      >
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700 }}>UI Test Page</h1>
          <p style={{ fontSize: 14, color: "var(--tx2)" }}>
            Visual verification of every primitive. Deleted in Feature 4.1.
          </p>
        </div>
        <Button variant="outline" onClick={toggle}>
          <Icon name={isDark ? "sun" : "moon"} size={16} />
          {isDark ? "Light" : "Dark"}
        </Button>
      </header>

      <Section title="Buttons — variants">
        <Button variant="coral">Coral</Button>
        <Button variant="navy">Navy</Button>
        <Button variant="teal">Teal</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="danger">Danger</Button>
      </Section>

      <Section title="Buttons — sizes">
        <Button variant="navy" size="sm">Small</Button>
        <Button variant="navy" size="md">Medium</Button>
        <Button variant="navy" size="lg">Large</Button>
      </Section>

      <Section title="Buttons — states">
        <Button variant="navy" loading>
          Loading
        </Button>
        <Button variant="navy" disabled>
          Disabled
        </Button>
        <Button variant="coral" fullWidth>
          Full width
        </Button>
      </Section>

      <Section title="Badges">
        <Badge variant="teal">teal</Badge>
        <Badge variant="pos">pos</Badge>
        <Badge variant="neg">neg</Badge>
        <Badge variant="warn">warn</Badge>
        <Badge variant="navy">navy</Badge>
        <Badge color="#fff" bg="#6B21A8">custom</Badge>
      </Section>

      <Section title="Cards">
        <Card style={{ width: 220 }}>
          <div style={{ fontWeight: 600 }}>Static card</div>
          <div style={{ fontSize: 13, color: "var(--tx2)", marginTop: 4 }}>
            Plain card with padding.
          </div>
        </Card>
        <Card
          clickable
          onClick={() => toast.success("Card clicked")}
          style={{ width: 220 }}
        >
          <div style={{ fontWeight: 600 }}>Clickable card</div>
          <div style={{ fontSize: 13, color: "var(--tx2)", marginTop: 4 }}>
            Click me.
          </div>
        </Card>
      </Section>

      <Section title="Spinner">
        <Spinner size="sm" />
        <Spinner size="md" />
        <Spinner size="lg" />
      </Section>

      <Section title="Skeleton">
        <div style={{ width: 260 }}>
          <Skeleton width="60%" height={12} />
          <div style={{ height: 8 }} />
          <Skeleton width="100%" height={12} />
          <div style={{ height: 8 }} />
          <Skeleton width="80%" height={12} />
        </div>
        <Skeleton width={64} height={64} rounded="50%" />
      </Section>

      <Section title="Sentiment bar">
        <div style={{ width: 280 }}>
          <SentimentBar positive={55} neutral={20} negative={25} />
        </div>
        <div style={{ width: 280 }}>
          <SentimentBar positive={30} neutral={40} negative={30} height={14} />
        </div>
      </Section>

      <Section title="Donut chart">
        <DonutChart data={{ positive: 45, neutral: 20, negative: 28, mixed: 7 }} size={140} />
        <DonutChart data={{ positive: 72, neutral: 16, negative: 8, mixed: 4 }} size={100} />
      </Section>

      <Section title="Empty state">
        <div style={{ width: 360 }}>
          <EmptyState
            icon="folder"
            title="No projects yet"
            description="Create your first project to start analyzing reviews."
            actionLabel="Create project"
            onAction={() => toast.info("Create project clicked")}
          />
        </div>
      </Section>

      <Section title="Modal">
        <Button variant="navy" onClick={() => setModalOpen(true)}>
          Open modal
        </Button>
        <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Example modal">
          <p style={{ fontSize: 14, color: "var(--tx2)", marginBottom: 16 }}>
            Backdrop blur, click-outside-to-close, Escape to close, focus trap.
          </p>
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="navy"
              onClick={() => {
                setModalOpen(false);
                toast.success("Confirmed");
              }}
            >
              Confirm
            </Button>
          </div>
        </Modal>
      </Section>

      <Section title="Toasts (sonner)">
        <Button variant="outline" onClick={() => toast("Neutral toast")}>
          default
        </Button>
        <Button variant="outline" onClick={() => toast.success("Saved successfully")}>
          success
        </Button>
        <Button variant="outline" onClick={() => toast.error("Something broke")}>
          error
        </Button>
        <Button variant="outline" onClick={() => toast.info("FYI")}>
          info
        </Button>
      </Section>

      <Section title="Icons">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))",
            gap: 8,
            width: "100%",
          }}
        >
          {ALL_ICONS.map((name) => (
            <div
              key={name}
              className="card"
              style={{
                padding: 12,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Icon name={name} size={22} color="var(--tx)" />
              <span style={{ fontSize: 11, color: "var(--tx3)" }}>{name}</span>
            </div>
          ))}
        </div>
      </Section>
    </main>
  );
}
