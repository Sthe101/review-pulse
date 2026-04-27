import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How ReviewPulse collects, uses, and protects your data.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS = [
  {
    id: "information-collected",
    h: "1. Information We Collect",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          When you create a ReviewPulse account, we collect your email address, full name (if
          provided during signup), and a hashed password. If you sign in with Google, we receive
          your Google account email and profile name.
        </p>
        <p style={{ marginBottom: 12 }}>
          When you use the product we collect:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li style={{ marginBottom: 6 }}>
            <strong>Reviews you upload or paste</strong> — text content, ratings, and any source
            metadata (author name, date, platform) you choose to include.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Project and analysis data</strong> — projects you create, analyses you
            generate, and exports you produce.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Usage telemetry</strong> — page views, feature interactions, and error logs to
            improve product quality.
          </li>
          <li>
            <strong>Billing information</strong> — handled entirely by Stripe; we never see your
            card number.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "data-usage",
    h: "2. How We Use Your Data",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>We use your data only to:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li style={{ marginBottom: 6 }}>
            Provide review analysis (passing review text to Anthropic&apos;s Claude API).
          </li>
          <li style={{ marginBottom: 6 }}>
            Display your projects, analyses, and exports back to you.
          </li>
          <li style={{ marginBottom: 6 }}>
            Send transactional email (account verification, password resets, billing receipts).
          </li>
          <li style={{ marginBottom: 6 }}>
            Improve product reliability via aggregated, anonymized usage metrics.
          </li>
          <li>Comply with legal obligations (tax records, lawful requests).</li>
        </ul>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          We <strong>never</strong> sell your data, share it with advertisers, or use your reviews
          to train AI models — ours or anyone else&apos;s.
        </p>
      </>
    ),
  },
  {
    id: "storage-security",
    h: "3. Storage & Security",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          Your data is stored on Supabase (Postgres) infrastructure hosted in the EU/US, with
          backups encrypted at rest. All traffic to and from ReviewPulse is encrypted in transit
          using TLS 1.2+.
        </p>
        <p style={{ marginBottom: 0 }}>
          OAuth access tokens and refresh tokens for connected review platforms (Google Business,
          Yelp, etc.) are encrypted with AES-256 before being written to the database. Access to
          production data is restricted to the engineering team and gated behind multi-factor
          authentication. We are GDPR compliant.
        </p>
      </>
    ),
  },
  {
    id: "third-parties",
    h: "4. Third Parties",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          We share data only with the sub-processors required to run the service:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li style={{ marginBottom: 6 }}>
            <strong>Supabase</strong> — database, authentication, file storage.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Anthropic</strong> — review text is sent to the Claude API for analysis.
            Anthropic does not retain content for training.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Stripe</strong> — payment processing.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Vercel</strong> — application hosting and edge delivery.
          </li>
          <li>
            <strong>Resend / transactional email provider</strong> — delivers verification and
            notification emails.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "deletion",
    h: "5. Data Deletion & Export",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          You can delete any project, review, or analysis at any time from the dashboard — deleted
          rows are removed from the live database immediately and from backups within 30 days.
        </p>
        <p style={{ marginBottom: 0 }}>
          To delete your entire account and all associated data, email{" "}
          <strong>privacy@reviewpulse.app</strong> from the address on file. We&apos;ll process
          deletion within 14 days. You can request a full export of your data in CSV/JSON format
          from the same address.
        </p>
      </>
    ),
  },
  {
    id: "cookies",
    h: "6. Cookies & Tracking",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          We use a small number of first-party cookies for the things that genuinely require them:
        </p>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li style={{ marginBottom: 6 }}>
            <strong>Authentication</strong> — Supabase session cookies keep you signed in.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Theme preference</strong> — remembers light/dark mode choice.
          </li>
          <li>
            <strong>Anonymous analytics</strong> — aggregate page-view counts (no cross-site
            tracking, no advertising IDs).
          </li>
        </ul>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          We don&apos;t use third-party advertising trackers, social pixels, or session replay
          tools.
        </p>
      </>
    ),
  },
  {
    id: "contact",
    h: "7. Contact",
    body: (
      <p style={{ marginBottom: 0 }}>
        Questions about this policy or your data? Email{" "}
        <strong>privacy@reviewpulse.app</strong>. We respond within 5 business days.
      </p>
    ),
  },
] as const;

export default function PrivacyPage() {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
      <Link
        href="/"
        style={{
          display: "inline-block",
          fontSize: 14,
          color: "var(--teal)",
          textDecoration: "none",
          marginBottom: 24,
          fontWeight: 500,
        }}
      >
        ← Back to Home
      </Link>

      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Privacy Policy</h1>
      <p style={{ fontSize: 14, color: "var(--tx3)", marginBottom: 32 }}>
        Last updated: April 2026
      </p>

      <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, marginBottom: 32 }}>
        ReviewPulse takes privacy seriously. This page explains, in plain English, what data we
        collect, why we collect it, and what control you have over it.
      </p>

      {SECTIONS.map((s) => (
        <section
          key={s.id}
          id={s.id}
          style={{
            fontSize: 15,
            color: "var(--tx2)",
            lineHeight: 1.7,
            marginBottom: 28,
            scrollMarginTop: 80,
          }}
        >
          <h2
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: "var(--tx)",
              marginBottom: 12,
            }}
          >
            {s.h}
          </h2>
          {s.body}
        </section>
      ))}
    </article>
  );
}
