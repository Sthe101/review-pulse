import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Why ReviewPulse exists and who's behind it.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 16 }}>About ReviewPulse</h1>

      <section style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7 }}>
        <p style={{ marginBottom: 16 }}>
          ReviewPulse exists because reading customer reviews shouldn&apos;t be a 20-hour-a-month
          job. The signal is in there — it&apos;s just buried in tens of thousands of words across
          a half-dozen platforms.
        </p>
        <p style={{ marginBottom: 16 }}>
          We use Claude (by Anthropic) to read every review, group complaints into themes, surface
          praise patterns, and rank action items by what to fix first. No keyword counting. No
          dashboards full of widgets you have to interpret.
        </p>
        <p>
          Built by people who have actually waded through 500-review CSVs trying to find the one
          thing that&apos;s tanking conversion.
        </p>
      </section>
    </article>
  );
}
