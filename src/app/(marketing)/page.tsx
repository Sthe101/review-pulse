import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/icon";
import { DonutChart } from "@/components/ui/donut-chart";
import { FAQ, type FaqItem } from "@/components/marketing/faq";

const SITE_URL = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");

const PAGE_TITLE = "ReviewPulse — Turn Customer Reviews Into Your Unfair Advantage";
const PAGE_DESC =
  "AI-powered customer review analysis. Paste reviews and get actionable insights — top complaints, strengths, feature requests, and what to fix first — in 30 seconds.";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESC,
  alternates: { canonical: "/" },
  openGraph: {
    title: PAGE_TITLE,
    description: PAGE_DESC,
    url: SITE_URL,
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESC,
  },
};

const FAQS: readonly FaqItem[] = [
  { q: "What types of reviews can I analyze?", a: "Any text-based customer reviews — Google, Amazon, Yelp, Trustpilot, G2, Capterra, App Store, Play Store, or any other source. Just paste the text or upload a CSV." },
  { q: "How accurate is the AI analysis?", a: "We use Claude (by Anthropic) which understands context, sarcasm, and nuance far better than basic NLP tools. It groups related complaints into themes rather than treating every keyword separately." },
  { q: "Is my data secure?", a: "Yes. Reviews are processed in real-time and not stored permanently unless you save them to a project. All data is encrypted in transit and at rest. We're GDPR compliant." },
  { q: "Can I analyze reviews in other languages?", a: "Yes. Our AI understands 50+ languages natively. No translation step needed — just paste reviews in any language." },
  { q: "How is this different from Birdeye?", a: "Birdeye costs $379+/month, requires weeks of onboarding, and locks you into annual contracts. ReviewPulse starts at $0, works in 30 seconds, and has no contracts. Our AI analysis is also more nuanced." },
  { q: "Do I need to connect my review platforms?", a: "No. You can start immediately by pasting text. Platform connections are optional for automatic syncing." },
  { q: "Can I export results?", a: "Yes. Pro and Business plans can export analysis results as PDF reports or CSV data files." },
  { q: "What happens if I exceed my plan limit?", a: "You'll see a prompt to upgrade. Your existing data and analyses are never deleted — you just can't add more reviews until the next billing cycle or you upgrade." },
];

const TESTIMONIALS = [
  { q: "Saved us 20 hours/month. Complaint ranking paid for itself.", n: "Rachel Kim", r: "E-commerce Mgr", c: "GreenLeaf" },
  { q: "Found a critical UX issue buried in 400 reviews.", n: "Marcus Chen", r: "Product Lead", c: "Flowstate" },
  { q: "Under $400/month and doesn't need a PhD to set up.", n: "Amara Osei", r: "Founder", c: "BiteBox" },
  { q: "Action items tell you exactly what to fix first.", n: "Liam O'Brien", r: "CX Director", c: "TravelNest" },
  { q: "We analyze competitor G2 reviews. Game-changer.", n: "Sofia Petrov", r: "Marketing Lead", c: "DataPulse" },
  { q: "Replaced $300/mo Birdeye. 10x better analysis.", n: "Jordan Hayes", r: "Agency Owner", c: "BrightStar" },
] as const;

const PROBLEMS: ReadonlyArray<{ ic: IconName; t: string; d: string; bg: string; c: string }> = [
  { ic: "dollar", t: "Hours Wasted", d: "Reading hundreds of reviews manually", bg: "var(--negbg)", c: "var(--neg)" },
  { ic: "srch", t: "Blind Spots", d: "Critical complaints buried in 5-star reviews", bg: "var(--warnbg)", c: "var(--warn)" },
  { ic: "trend", t: "Revenue Lost", d: "Competitors fix issues you don't know about", bg: "var(--negbg)", c: "var(--neg)" },
];

const STEPS: ReadonlyArray<{ ic: IconName; t: string; d: string; bg: string; c: string }> = [
  { ic: "msg", t: "1. Paste or Upload", d: "Drop reviews in. Paste, CSV, or connect a platform.", bg: "var(--navybg)", c: "var(--navy)" },
  { ic: "bulb", t: "2. AI Analyzes", d: "Reads every review, detects sarcasm, groups by theme.", bg: "var(--tealbg)", c: "var(--teal)" },
  { ic: "bar", t: "3. Get Insights", d: "What customers love, hate, and what to fix first.", bg: "var(--warnbg)", c: "var(--coral)" },
];

const PLANS = [
  { n: "Free", p: "$0", f: ["50 reviews/month", "1 project", "Basic sentiment"], cta: "Start Free", cls: "btn-navy", hl: false },
  { n: "Pro", p: "$29", f: ["500 reviews/month", "10 projects", "Full AI analysis", "Trend tracking", "Export reports"], cta: "Start Free Trial", cls: "btn-coral", hl: true },
  { n: "Business", p: "$79", f: ["Unlimited everything", "API access", "Team (5)", "Slack + webhooks"], cta: "Start Free Trial", cls: "btn-navy", hl: false },
] as const;

const SAMPLE_SENT = { positive: 45, neutral: 20, negative: 28, mixed: 7 };

export default function MarketingHome() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "ReviewPulse",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: PAGE_DESC,
      url: SITE_URL,
      offers: [
        { "@type": "Offer", name: "Free", price: "0", priceCurrency: "USD" },
        { "@type": "Offer", name: "Pro", price: "29", priceCurrency: "USD" },
        { "@type": "Offer", name: "Business", price: "79", priceCurrency: "USD" },
      ],
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "ReviewPulse",
      url: SITE_URL,
    },
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section
        className="hero-wrap"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "80px 24px 60px",
          gap: 48,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 480px", maxWidth: 560 }}>
          <h1 style={{ fontSize: 48, fontWeight: 700, lineHeight: 1.15, marginBottom: 20 }}>
            Turn Customer Reviews Into Your{" "}
            <span style={{ color: "var(--teal)" }}>Unfair Advantage</span>
          </h1>
          <p style={{ fontSize: 18, color: "var(--tx2)", lineHeight: 1.6, marginBottom: 28 }}>
            Paste your reviews. Get AI-powered insights in seconds. Know exactly what customers
            love, hate, and wish you&apos;d build.
          </p>
          <div style={{ display: "flex", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
            <Link
              href="/signup"
              className="btn btn-coral"
              style={{
                padding: "14px 28px",
                fontSize: 16,
                boxShadow: "0 4px 14px color-mix(in srgb, var(--coral) 30%, transparent)",
                textDecoration: "none",
              }}
            >
              Analyze Reviews Free →
            </Link>
            <a
              href="#how-it-works"
              className="btn btn-outline"
              style={{
                padding: "12px 24px",
                fontSize: 16,
                textDecoration: "none",
              }}
            >
              See How It Works
            </a>
          </div>
          <p style={{ fontSize: 13, color: "var(--tx3)" }}>
            No credit card required · Free forever plan · 10,000+ reviews analyzed
          </p>
        </div>
        <div
          className="hero-mockup card"
          style={{
            flex: "1 1 400px",
            maxWidth: 520,
            padding: 20,
            boxShadow: "0 20px 60px rgba(0,0,0,0.1)",
            transform: "rotate(1deg)",
          }}
          aria-label="Sample analysis preview"
        >
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Analysis — ShopEase</div>
          <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
            <DonutChart data={SAMPLE_SENT} size={100} />
            <div style={{ flex: 1 }}>
              {(
                [
                  ["Positive", 45, "var(--pos)"],
                  ["Neutral", 20, "var(--tx3)"],
                  ["Negative", 28, "var(--neg)"],
                  ["Mixed", 7, "var(--warn)"],
                ] as const
              ).map(([l, v, c]) => (
                <div
                  key={l}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 6,
                    fontSize: 12,
                  }}
                >
                  <span style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
                  <span style={{ color: "var(--tx2)" }}>{l}</span>
                  <span style={{ marginLeft: "auto", fontWeight: 600 }}>{v}%</span>
                </div>
              ))}
            </div>
          </div>
          <div
            style={{
              background: "var(--negbg)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: "var(--neg)",
              marginBottom: 8,
            }}
          >
            <strong>#1:</strong> Slow shipping — 28% ↑
          </div>
          <div
            style={{
              background: "var(--posbg)",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 12,
              color: "var(--pos)",
            }}
          >
            <strong>Strength:</strong> Customer support — 31%
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section
        style={{
          borderTop: "1px solid var(--bd)",
          borderBottom: "1px solid var(--bd)",
          padding: "20px 24px",
          textAlign: "center",
        }}
        aria-label="Supported review platforms"
      >
        <p
          style={{
            fontSize: 13,
            color: "var(--tx3)",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Works with: Google · Amazon · Yelp · Trustpilot · G2 · Capterra · App Store · Play Store
        </p>
      </section>

      {/* Problem */}
      <section style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 24px", textAlign: "center" }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 40 }}>
          You&apos;re Sitting on a <span style={{ color: "var(--teal)" }}>Goldmine</span>
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(250px,1fr))",
            gap: 20,
            marginBottom: 32,
          }}
        >
          {PROBLEMS.map((p) => (
            <div key={p.t} className="card" style={{ padding: 28, textAlign: "center" }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  background: p.bg,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  margin: "0 auto 16px",
                }}
              >
                <Icon name={p.ic} color={p.c} size={22} />
              </div>
              <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{p.t}</div>
              <div style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.5 }}>{p.d}</div>
            </div>
          ))}
        </div>
        <p style={{ fontSize: 18, color: "var(--teal)", fontWeight: 600 }}>
          ReviewPulse finds every pattern and tells you what to fix — in 30 seconds.
        </p>
      </section>

      {/* Steps */}
      <section id="how-it-works" style={{ background: "var(--bg3)", padding: "64px 24px", scrollMarginTop: 72 }}>
        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 48 }}>Three Steps to Clarity</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))",
              gap: 32,
            }}
          >
            {STEPS.map((s) => (
              <div key={s.t}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 14,
                    background: s.bg,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    margin: "0 auto 16px",
                  }}
                >
                  <Icon name={s.ic} color={s.c} size={26} />
                </div>
                <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8 }}>{s.t}</div>
                <div style={{ fontSize: 14, color: "var(--tx2)", lineHeight: 1.5 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        style={{ maxWidth: 1000, margin: "0 auto", padding: "64px 24px", textAlign: "center", scrollMarginTop: 72 }}
      >
        <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 8 }}>Simple, Honest Pricing</h2>
        <p style={{ fontSize: 16, color: "var(--tx2)", marginBottom: 40 }}>
          No annual contracts. No hidden fees.
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {PLANS.map((pl) => (
            <div
              key={pl.n}
              className="card"
              style={{
                padding: 32,
                border: pl.hl ? "2px solid var(--teal)" : undefined,
                transform: pl.hl ? "scale(1.03)" : undefined,
                boxShadow: pl.hl ? "0 8px 30px color-mix(in srgb, var(--teal) 15%, transparent)" : undefined,
                position: "relative",
              }}
            >
              {pl.hl && (
                <div
                  style={{
                    position: "absolute",
                    top: -12,
                    left: "50%",
                    transform: "translateX(-50%)",
                    background: "var(--teal)",
                    color: "#fff",
                    fontSize: 14,
                    fontWeight: 700,
                    padding: "4px 14px",
                    borderRadius: 99,
                    textTransform: "uppercase",
                  }}
                >
                  Most Popular
                </div>
              )}
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>{pl.n}</div>
              <div style={{ fontSize: 40, fontWeight: 700, marginBottom: 4 }}>
                {pl.p}
                <span style={{ fontSize: 16, fontWeight: 400, color: "var(--tx2)" }}>/mo</span>
              </div>
              <div style={{ borderTop: "1px solid var(--bd)", margin: "16px 0", paddingTop: 16 }}>
                {pl.f.map((f) => (
                  <div
                    key={f}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 14,
                      color: "var(--tx2)",
                      marginBottom: 10,
                    }}
                  >
                    <Icon name="ok" size={16} color="var(--pos)" />
                    {f}
                  </div>
                ))}
              </div>
              <Link
                href="/signup"
                className={`btn ${pl.cls}`}
                style={{ width: "100%", textDecoration: "none" }}
              >
                {pl.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section style={{ background: "var(--bg3)", padding: "64px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 40 }}>
            Loved by Teams &amp; Founders
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))",
              gap: 20,
            }}
          >
            {TESTIMONIALS.map((t) => (
              <div key={t.n} className="card" style={{ padding: 24 }}>
                <span style={{ display: "inline-flex", gap: 1 }} aria-label="5 stars">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Icon key={i} name="star" size={14} />
                  ))}
                </span>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--tx2)",
                    lineHeight: 1.6,
                    margin: "12px 0 16px",
                    fontStyle: "italic",
                  }}
                >
                  &ldquo;{t.q}&rdquo;
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: "var(--navybg)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--navy)",
                    }}
                    aria-hidden="true"
                  >
                    {t.n
                      .split(" ")
                      .map((x) => x[0])
                      .join("")}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{t.n}</div>
                    <div style={{ fontSize: 12, color: "var(--tx3)" }}>
                      {t.r}, {t.c}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section style={{ maxWidth: 800, margin: "0 auto", padding: "64px 24px" }}>
        <h2 style={{ fontSize: 32, fontWeight: 700, textAlign: "center", marginBottom: 40 }}>
          Frequently Asked Questions
        </h2>
        <FAQ items={FAQS} />
      </section>

      {/* CTA */}
      <section
        style={{
          background: "linear-gradient(135deg,#0F172A,#1E3A5F)",
          padding: "64px 24px",
          textAlign: "center",
        }}
      >
        <h2 style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 12 }}>
          Stop Guessing. Start Understanding.
        </h2>
        <p style={{ fontSize: 16, color: "rgba(255,255,255,0.7)", marginBottom: 28 }}>
          Join 2,000+ businesses turning feedback into growth.
        </p>
        <Link
          href="/signup"
          className="btn btn-coral"
          style={{
            padding: "14px 32px",
            fontSize: 16,
            boxShadow: "0 4px 20px color-mix(in srgb, var(--coral) 40%, transparent)",
            textDecoration: "none",
          }}
        >
          Get Started Free →
        </Link>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.75)", marginTop: 12 }}>
          No credit card required
        </p>
      </section>
    </>
  );
}
