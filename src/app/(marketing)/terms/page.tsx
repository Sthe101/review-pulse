import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ReviewPulse terms of service.",
  alternates: { canonical: "/terms" },
};

const SECTIONS = [
  {
    id: "service-description",
    h: "1. Service Description",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          ReviewPulse is a software-as-a-service platform that uses AI (Anthropic&apos;s Claude
          API) to analyze customer reviews and surface themes, complaints, praises, feature
          requests, and recommended actions. The service is delivered as a web application
          accessible from any modern browser.
        </p>
        <p style={{ marginBottom: 0 }}>
          By creating an account or using the service, you agree to these Terms of Service. If you
          don&apos;t agree, don&apos;t use ReviewPulse.
        </p>
      </>
    ),
  },
  {
    id: "accounts-plans",
    h: "2. Accounts & Plans",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          You need an account to use ReviewPulse. You&apos;re responsible for keeping your login
          credentials secure and for all activity under your account. Notify us immediately at{" "}
          <strong>support@reviewpulse.app</strong> if you suspect unauthorized access.
        </p>
        <p style={{ marginBottom: 12 }}>We offer three plans:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li style={{ marginBottom: 6 }}>
            <strong>Free</strong> — 50 reviews/month, 1 project, basic sentiment. One person per
            account.
          </li>
          <li style={{ marginBottom: 6 }}>
            <strong>Pro ($29/mo)</strong> — 500 reviews/month, 10 projects, full AI analysis,
            trend tracking, exports. One person per account.
          </li>
          <li>
            <strong>Business ($79/mo)</strong> — Unlimited reviews and projects, API access, up to
            5 team members, Slack and webhook integrations.
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "acceptable-use",
    h: "3. Acceptable Use",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>You agree not to:</p>
        <ul style={{ paddingLeft: 20, marginBottom: 0 }}>
          <li style={{ marginBottom: 6 }}>
            Upload reviews you don&apos;t have a legal right to analyze.
          </li>
          <li style={{ marginBottom: 6 }}>
            Use ReviewPulse to harass, defame, or build profiles of identifiable individuals.
          </li>
          <li style={{ marginBottom: 6 }}>
            Reverse-engineer the service, scrape its UI, or attempt to extract our prompts or
            model weights.
          </li>
          <li style={{ marginBottom: 6 }}>
            Send malicious payloads or attempt to disrupt the service for other users.
          </li>
          <li>
            Resell or sublicense ReviewPulse to third parties without a written agreement.
          </li>
        </ul>
        <p style={{ marginTop: 12, marginBottom: 0 }}>
          We may suspend or terminate accounts that violate these rules. Egregious violations
          (spam, abuse, illegal content) may result in immediate termination without refund.
        </p>
      </>
    ),
  },
  {
    id: "data-ownership",
    h: "4. Data Ownership",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          You own the reviews you upload and the analyses generated from them.{" "}
          <strong>We claim no rights over your content.</strong>
        </p>
        <p style={{ marginBottom: 0 }}>
          By using the service, you grant us a limited, non-exclusive license to process your
          content solely to provide the analysis features you&apos;re paying for. We don&apos;t
          use your data to train AI models, and we don&apos;t share it with anyone except the
          sub-processors listed in our{" "}
          <Link href="/privacy" style={{ color: "var(--teal)", textDecoration: "underline" }}>
            Privacy Policy
          </Link>
          .
        </p>
      </>
    ),
  },
  {
    id: "payment-refunds",
    h: "5. Payment & Refunds",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          Paid plans bill monthly in advance via Stripe. Prices are in USD and exclude applicable
          taxes. By subscribing, you authorize us to charge your payment method on each renewal
          date.
        </p>
        <p style={{ marginBottom: 12 }}>
          You can cancel any time from the billing page; cancellation takes effect at the end of
          the current billing period. We don&apos;t pro-rate refunds for partial months, but if
          you cancel within 14 days of your first paid charge and haven&apos;t exceeded the free
          plan limits during that window, email <strong>billing@reviewpulse.app</strong> for a
          full refund.
        </p>
        <p style={{ marginBottom: 0 }}>
          Failed payments will trigger up to three retry attempts. If all retries fail, the
          account is downgraded to the Free plan; your data stays accessible.
        </p>
      </>
    ),
  },
  {
    id: "liability",
    h: "6. Liability",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          ReviewPulse is provided <strong>&quot;as is&quot;</strong> and{" "}
          <strong>&quot;as available&quot;</strong>, without warranties of any kind. AI-generated
          analysis is a tool to assist human judgment, not a substitute for it. We don&apos;t
          guarantee that insights, action-item priorities, or sentiment classifications are
          accurate, complete, or appropriate for any specific business decision.
        </p>
        <p style={{ marginBottom: 0 }}>
          To the maximum extent permitted by law, our total liability for any claim arising from
          or related to the service is limited to the amount you paid us in the 12 months
          preceding the claim. We are not liable for indirect, incidental, consequential, or
          punitive damages, including lost profits, lost data, or business interruption.
        </p>
      </>
    ),
  },
  {
    id: "changes",
    h: "7. Changes to These Terms",
    body: (
      <>
        <p style={{ marginBottom: 12 }}>
          We may update these terms occasionally — for example, to reflect new features, pricing,
          or legal requirements. When we make material changes, we&apos;ll email the address on
          your account at least 14 days before they take effect.
        </p>
        <p style={{ marginBottom: 0 }}>
          Continuing to use the service after changes take effect means you accept the updated
          terms. If you don&apos;t agree, cancel your subscription before the effective date.
          Questions? Email <strong>support@reviewpulse.app</strong>.
        </p>
      </>
    ),
  },
] as const;

export default function TermsPage() {
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

      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 8 }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: "var(--tx3)", marginBottom: 32 }}>
        Last updated: April 2026
      </p>

      <p style={{ fontSize: 16, color: "var(--tx2)", lineHeight: 1.7, marginBottom: 32 }}>
        These terms govern your use of ReviewPulse. They&apos;re written to be readable, but they
        are binding — please skim them.
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
