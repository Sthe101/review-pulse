import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReviewPulse collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: "var(--tx3)", marginBottom: 32 }}>Last updated: April 2026</p>

      <section style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          What we collect
        </h2>
        <p>
          We collect the email address you sign up with, the reviews you paste or upload for
          analysis, and standard usage telemetry (page views, error logs).
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          How we use it
        </h2>
        <p>
          Reviews are sent to Anthropic&apos;s Claude API for analysis and stored only when you save
          them to a project. We never sell your data and never use it to train AI models.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Data security
        </h2>
        <p>
          All data is encrypted in transit (TLS) and at rest. Access tokens for connected platforms
          are encrypted with AES-256. We&apos;re GDPR compliant.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Contact
        </h2>
        <p>
          Questions about your data? Email <strong>privacy@reviewpulse.app</strong>.
        </p>
      </section>
    </article>
  );
}
