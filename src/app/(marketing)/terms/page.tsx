import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "ReviewPulse terms of service.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <article style={{ maxWidth: 720, margin: "0 auto", padding: "64px 24px" }}>
      <h1 style={{ fontSize: 36, fontWeight: 700, marginBottom: 12 }}>Terms of Service</h1>
      <p style={{ fontSize: 14, color: "var(--tx3)", marginBottom: 32 }}>Last updated: April 2026</p>

      <section style={{ fontSize: 15, color: "var(--tx2)", lineHeight: 1.7 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Your account
        </h2>
        <p>
          You&apos;re responsible for the content you upload and for keeping your login credentials
          secure. One person per Free or Pro account; Business plans support team members.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Acceptable use
        </h2>
        <p>
          Don&apos;t upload reviews you don&apos;t have the right to analyze. Don&apos;t use
          ReviewPulse to harass, defame, or build profiles of individuals.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Billing
        </h2>
        <p>
          Paid plans bill monthly. Cancel anytime — your data stays accessible through the end of
          the billing period.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Liability
        </h2>
        <p>
          ReviewPulse is provided &quot;as is.&quot; We&apos;re not liable for business decisions
          made based on AI analysis output.
        </p>

        <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--tx)", marginTop: 24, marginBottom: 8 }}>
          Contact
        </h2>
        <p>
          Questions? Email <strong>support@reviewpulse.app</strong>.
        </p>
      </section>
    </article>
  );
}
