import { useState } from "react";

/* ═══ STYLES ═══ */
const CSS = `
*{box-sizing:border-box;margin:0;padding:0}
:root{--bg:#FFFFFF;--bg2:#FFFFFF;--bg3:#F8FAFC;--tx:#0F172A;--tx2:#475569;--tx3:#94A3B8;--bd:#E2E8F0;--bd2:#CBD5E1;--teal:#0D9488;--navy:#1E3A5F;--coral:#EA580C;--pos:#059669;--neg:#DC2626;--warn:#D97706;--posbg:#D1FAE5;--negbg:#FEE2E2;--warnbg:#FEF3C7;--tealbg:#F0FDFA;--navybg:#EFF6FF;--pagebg:#F8FAFC}
body{font-family:system-ui,-apple-system,sans-serif;background:var(--pagebg);color:var(--tx)}
.btn{border:none;border-radius:8px;font-weight:600;font-size:14px;cursor:pointer;transition:opacity .15s;font-family:inherit;padding:10px 20px}
.btn:hover{opacity:0.9}
.btn-teal{background:var(--teal);color:#fff}
.btn-navy{background:var(--navy);color:#fff}
.btn-outline{background:var(--bg2);color:var(--tx2);border:1px solid var(--bd)}
@media print{.no-print{display:none!important}.page-break{page-break-before:always}}
`;

/* ═══ SAMPLE DATA ═══ */
const PROJECT = { name: "ShopEase Google Reviews", industry: "E-commerce", source: "Google Business" };
const ANALYSIS = {
  date: "March 28, 2026",
  reviewCount: 234,
  overallScore: 61,
  summary: "Overall sentiment is moderately positive (61%), but shipping delays are a growing frustration. Customer support is a major strength — mentioned positively 3x more than industry average. Improving delivery communication could address 40% of negative reviews.",
  sentiment: { positive: 45, neutral: 20, negative: 28, mixed: 7 },
  complaints: [
    { rank: 1, title: "Slow Shipping / Delivery Delays", severity: "critical", frequency: 34, percent: 28, trend: "growing", suggestion: "Add real-time tracking and proactive delay notifications" },
    { rank: 2, title: "Declining Product Quality", severity: "high", frequency: 22, percent: 18, trend: "growing", suggestion: "Audit manufacturing QA — complaints up 40% QoQ" },
    { rank: 3, title: "Pricing Too High", severity: "medium", frequency: 15, percent: 12, trend: "stable", suggestion: "Consider a mid-tier product line" },
    { rank: 4, title: "Limited Color Options", severity: "low", frequency: 8, percent: 7, trend: "stable", suggestion: "Survey customers on preferred colors" },
  ],
  praises: [
    { title: "Excellent Support", frequency: 38, percent: 31, tip: "Highlight response times in ads" },
    { title: "Product Design", frequency: 28, percent: 23, tip: "Use before/after in marketing" },
    { title: "Packaging Quality", frequency: 12, percent: 10, tip: "Run unboxing campaign" },
  ],
  featureRequests: [
    { title: "Dark Mode", demand: 12, percent: 10, urgency: "high", suggestion: "High demand, low complexity" },
    { title: "More Colors", demand: 8, percent: 7, urgency: "medium", suggestion: "Survey top 100 customers" },
    { title: "Order Tracking", demand: 6, percent: 5, urgency: "high", suggestion: "Partner with shipping API" },
  ],
  actionItems: [
    { priority: "P1", title: "Implement order tracking", rationale: "Addresses 28% of complaints. Fastest sentiment improvement.", effort: "Medium", impact: "+8-12 pts" },
    { priority: "P2", title: "Audit manufacturing QA", rationale: "Quality complaints up 40% QoQ.", effort: "High", impact: "-18% negatives" },
    { priority: "P3", title: "Add dark mode", rationale: "12 requests. Quick win.", effort: "Low", impact: "+0.2 stars" },
  ],
  ratingDistribution: { 5: 42, 4: 28, 3: 35, 2: 18, 1: 11 },
};
const REVIEWS = [
  { content: "Product quality is amazing but shipping took forever. Waited 3 weeks for a 5-day delivery.", rating: 3, sentiment: "mixed", score: 0.45, author: "Sarah M.", date: "2026-03-28", source: "Google", themes: ["Shipping", "Quality"] },
  { content: "Absolutely love this! Customer support was incredibly helpful with my sizing question.", rating: 5, sentiment: "positive", score: 0.92, author: "James K.", date: "2026-03-25", source: "Google", themes: ["Support", "Quality"] },
  { content: "Returned the item. Way too expensive for what you get. Materials feel cheap.", rating: 1, sentiment: "negative", score: 0.12, author: "Michelle T.", date: "2026-03-22", source: "Trustpilot", themes: ["Pricing", "Quality"] },
  { content: "Great product, fast shipping! Packaging was nice. Wish they had more colors.", rating: 4, sentiment: "positive", score: 0.81, author: "David L.", date: "2026-03-20", source: "Google", themes: ["Shipping", "Quality"] },
  { content: "Third order and quality has gone downhill. Stitching coming apart after two washes.", rating: 2, sentiment: "negative", score: 0.18, author: "Priya R.", date: "2026-03-18", source: "Amazon", themes: ["Quality"] },
  { content: "Decent for the price. Nothing spectacular but gets the job done.", rating: 3, sentiment: "neutral", score: 0.50, author: "Tom W.", date: "2026-03-15", source: "Google", themes: ["Pricing"] },
  { content: "New design is so much better! Impressed with improvements.", rating: 5, sentiment: "positive", score: 0.88, author: "Aisha B.", date: "2026-03-12", source: "App Store", themes: ["Quality"] },
  { content: "Wish the app had dark mode. Blinding at night. Otherwise solid.", rating: 4, sentiment: "positive", score: 0.72, author: "Carlos G.", date: "2026-03-10", source: "App Store", themes: ["Feature Request"] },
];

/* ═══ SHARED COMPONENTS ═══ */
const SevColor = { critical: "#DC2626", high: "#EA580C", medium: "#D97706", low: "#059669" };
const SevBg = { critical: "#FEE2E2", high: "#FFEDD5", medium: "#FEF3C7", low: "#D1FAE5" };
const PriColor = { P1: "#DC2626", P2: "#EA580C", P3: "#1E3A5F" };

const Logo = ({ size = 24 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size}>
    <rect x="4" y="18" width="5" height="10" rx="1.5" fill="#0D9488"/>
    <rect x="13" y="10" width="5" height="18" rx="1.5" fill="#1E3A5F"/>
    <rect x="22" y="14" width="5" height="14" rx="1.5" fill="#0D9488"/>
    <path d="M2 16Q8 8 16 12Q24 6 30 10" stroke="#EA580C" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
  </svg>
);

const SentimentDonut = ({ data, size = 120 }) => {
  const total = Object.values(data).reduce((a, b) => a + b, 0);
  const colors = { positive: "#059669", neutral: "#94A3B8", negative: "#DC2626", mixed: "#D97706" };
  let cumulative = 0;
  const segments = Object.entries(data).map(([key, value]) => {
    const start = cumulative;
    cumulative += (value / total) * 360;
    const r = 45, cx = 50, cy = 50;
    const sr = ((start - 90) * Math.PI) / 180;
    const er = ((cumulative - 90) * Math.PI) / 180;
    const large = value / total > 0.5 ? 1 : 0;
    return (
      <path key={key} d={`M${cx},${cy} L${cx + r * Math.cos(sr)},${cy + r * Math.sin(sr)} A${r},${r} 0 ${large},1 ${cx + r * Math.cos(er)},${cy + r * Math.sin(er)} Z`} fill={colors[key]}/>
    );
  });
  return (
    <svg viewBox="0 0 100 100" width={size} height={size}>
      {segments}
      <circle cx="50" cy="50" r="28" fill="white"/>
      <text x="50" y="47" textAnchor="middle" fontSize="18" fontWeight="700" fill="#0F172A">{Math.round((data.positive / total) * 100)}</text>
      <text x="50" y="58" textAnchor="middle" fontSize="7" fill="#475569" fontWeight="500">SCORE</text>
    </svg>
  );
};

const RatingBar = ({ star, count, total }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
    <span style={{ fontSize: 12, width: 20, textAlign: "right", color: "#475569" }}>{star}★</span>
    <div style={{ flex: 1, height: 8, background: "#E2E8F0", borderRadius: 4 }}>
      <div style={{ height: "100%", background: star >= 4 ? "#059669" : star === 3 ? "#D97706" : "#DC2626", borderRadius: 4, width: `${(count / total) * 100}%` }}/>
    </div>
    <span style={{ fontSize: 11, color: "#475569", width: 24 }}>{count}</span>
  </div>
);

/* ═══════════════════════════════════════════════════════════════
   PDF REPORT TEMPLATE
   This is the exact layout that gets rendered to PDF.
   In production, use @react-pdf/renderer or puppeteer to capture this.
   ═══════════════════════════════════════════════════════════════ */
const PDFReport = () => {
  const a = ANALYSIS;
  const totalRatings = Object.values(a.ratingDistribution).reduce((x, y) => x + y, 0);

  return (
    <div style={{ background: "white", maxWidth: 794, margin: "0 auto", fontFamily: "system-ui, -apple-system, sans-serif", color: "#0F172A", fontSize: 13, lineHeight: 1.6 }}>

      {/* ——— PAGE 1: Cover + Summary ——— */}
      <div style={{ padding: "48px 56px" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 40, paddingBottom: 20, borderBottom: "2px solid #0D9488" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Logo size={32}/>
            <span style={{ fontWeight: 700, fontSize: 20, color: "#1E3A5F" }}>ReviewPulse</span>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: "0.1em" }}>Analysis Report</div>
            <div style={{ fontSize: 12, color: "#475569" }}>{a.date}</div>
          </div>
        </div>

        {/* Project Info */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{PROJECT.name}</h1>
          <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#475569" }}>
            <span>{PROJECT.industry}</span>
            <span>·</span>
            <span>{a.reviewCount} reviews analyzed</span>
            <span>·</span>
            <span>{PROJECT.source}</span>
          </div>
        </div>

        {/* Score Card */}
        <div style={{ display: "flex", gap: 24, padding: 28, background: "#F0FDFA", borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 28 }}>
          <SentimentDonut data={a.sentiment} size={100}/>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em", color: "#0D9488", fontWeight: 600, marginBottom: 6 }}>Overall Sentiment Score</div>
            <div style={{ display: "flex", gap: 20, marginBottom: 12 }}>
              {[["Positive", a.sentiment.positive, "#059669"], ["Neutral", a.sentiment.neutral, "#94A3B8"], ["Negative", a.sentiment.negative, "#DC2626"], ["Mixed", a.sentiment.mixed, "#D97706"]].map(([label, val, color]) => (
                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: color }}/>
                  <span style={{ fontSize: 12, color: "#475569" }}>{label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color }}>{val}%</span>
                </div>
              ))}
            </div>
            <div style={{ height: 8, display: "flex", borderRadius: 99, overflow: "hidden" }}>
              <div style={{ width: `${a.sentiment.positive}%`, background: "#059669" }}/>
              <div style={{ width: `${a.sentiment.neutral}%`, background: "#94A3B8" }}/>
              <div style={{ width: `${a.sentiment.negative}%`, background: "#DC2626" }}/>
              <div style={{ width: `${a.sentiment.mixed}%`, background: "#D97706" }}/>
            </div>
          </div>
        </div>

        {/* Executive Summary */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 8, color: "#1E3A5F" }}>Executive Summary</h2>
          <p style={{ fontSize: 13, lineHeight: 1.8, color: "#475569" }}>{a.summary}</p>
        </div>

        {/* Rating Distribution */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1E3A5F" }}>Rating Distribution</h2>
          <div style={{ maxWidth: 360 }}>
            {[5, 4, 3, 2, 1].map(s => <RatingBar key={s} star={s} count={a.ratingDistribution[s]} total={totalRatings}/>)}
          </div>
        </div>

        {/* Top Issues Table */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1E3A5F" }}>Top Issues</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Rank</th>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Issue</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 600, color: "#475569" }}>Severity</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 600, color: "#475569" }}>Mentions</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 600, color: "#475569" }}>Trend</th>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {a.complaints.map(c => (
                <tr key={c.rank} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "10px 0", fontWeight: 700, color: "#94A3B8" }}>#{c.rank}</td>
                  <td style={{ padding: "10px 0", fontWeight: 600 }}>{c.title}</td>
                  <td style={{ padding: "10px 0", textAlign: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: SevBg[c.severity], color: SevColor[c.severity] }}>{c.severity}</span>
                  </td>
                  <td style={{ padding: "10px 0", textAlign: "center", color: "#475569" }}>{c.frequency} ({c.percent}%)</td>
                  <td style={{ padding: "10px 0", textAlign: "center" }}>
                    <span style={{ color: c.trend === "growing" ? "#DC2626" : c.trend === "declining" ? "#059669" : "#94A3B8" }}>
                      {c.trend === "growing" ? "↑" : c.trend === "declining" ? "↓" : "→"} {c.trend}
                    </span>
                  </td>
                  <td style={{ padding: "10px 0", fontSize: 11, color: "#475569" }}>{c.suggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ——— PAGE 2: Strengths + Feature Requests + Action Items ——— */}
      <div className="page-break" style={{ padding: "48px 56px" }}>
        {/* Page 2 Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32, paddingBottom: 12, borderBottom: "1px solid #E2E8F0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><Logo size={18}/><span style={{ fontWeight: 600, fontSize: 13, color: "#94A3B8" }}>ReviewPulse</span></div>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>{PROJECT.name} — {a.date}</span>
        </div>

        {/* Strengths */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1E3A5F" }}>💪 Strengths</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Strength</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 600, color: "#475569" }}>Mentions</th>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Marketing Tip</th>
              </tr>
            </thead>
            <tbody>
              {a.praises.map((p, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "10px 0" }}><span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><span style={{ width: 8, height: 8, borderRadius: "50%", background: "#059669", display: "inline-block" }}/>{p.title}</span></td>
                  <td style={{ padding: "10px 0", textAlign: "center", color: "#475569" }}>{p.frequency} ({p.percent}%)</td>
                  <td style={{ padding: "10px 0", fontSize: 11, color: "#475569", fontStyle: "italic" }}>{p.tip}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Feature Requests */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1E3A5F" }}>💡 Feature Requests</h2>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #E2E8F0" }}>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Feature</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 600, color: "#475569" }}>Demand</th>
                <th style={{ padding: "8px 0", textAlign: "center", fontWeight: 600, color: "#475569" }}>Urgency</th>
                <th style={{ padding: "8px 0", textAlign: "left", fontWeight: 600, color: "#475569" }}>Recommendation</th>
              </tr>
            </thead>
            <tbody>
              {a.featureRequests.map((f, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #E2E8F0" }}>
                  <td style={{ padding: "10px 0", fontWeight: 500 }}>{f.title}</td>
                  <td style={{ padding: "10px 0", textAlign: "center", color: "#475569" }}>{f.demand} ({f.percent}%)</td>
                  <td style={{ padding: "10px 0", textAlign: "center" }}>
                    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: f.urgency === "high" ? "#FEE2E2" : "#FEF3C7", color: f.urgency === "high" ? "#DC2626" : "#D97706" }}>{f.urgency}</span>
                  </td>
                  <td style={{ padding: "10px 0", fontSize: 11, color: "#475569" }}>{f.suggestion}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Items */}
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, color: "#1E3A5F" }}>🎯 Recommended Actions</h2>
          {a.actionItems.map((item, i) => (
            <div key={i} style={{ display: "flex", gap: 12, padding: "14px 0", borderBottom: i < a.actionItems.length - 1 ? "1px solid #E2E8F0" : "none" }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99, background: item.priority === "P1" ? "#FEE2E2" : item.priority === "P2" ? "#FFEDD5" : "#EFF6FF", color: PriColor[item.priority], height: "fit-content" }}>{item.priority}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>{item.title}</div>
                <div style={{ fontSize: 12, color: "#475569", marginBottom: 4 }}>{item.rationale}</div>
                <div style={{ display: "flex", gap: 16, fontSize: 11, color: "#94A3B8" }}>
                  <span>Effort: <strong style={{ color: "#475569" }}>{item.effort}</strong></span>
                  <span>Impact: <strong style={{ color: "#059669" }}>{item.impact}</strong></span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ marginTop: 48, paddingTop: 16, borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Logo size={16}/>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>Generated by ReviewPulse — reviewpulse.com</span>
          </div>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>Page 2 of 2</span>
        </div>
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   CSV EXPORT PREVIEW
   Shows exactly what the downloaded CSV file contains.
   ═══════════════════════════════════════════════════════════════ */
const CSVPreview = () => {
  const a = ANALYSIS;

  /* Build the CSV string exactly as it would be generated */
  const csvLines = [];
  // Section 1: Report metadata
  csvLines.push(["ReviewPulse Analysis Report"]);
  csvLines.push(["Project", PROJECT.name]);
  csvLines.push(["Industry", PROJECT.industry]);
  csvLines.push(["Source", PROJECT.source]);
  csvLines.push(["Date", a.date]);
  csvLines.push(["Reviews Analyzed", a.reviewCount]);
  csvLines.push(["Overall Score", a.overallScore + "/100"]);
  csvLines.push([]);

  // Section 2: Sentiment breakdown
  csvLines.push(["SENTIMENT BREAKDOWN"]);
  csvLines.push(["Category", "Percentage"]);
  csvLines.push(["Positive", a.sentiment.positive + "%"]);
  csvLines.push(["Neutral", a.sentiment.neutral + "%"]);
  csvLines.push(["Negative", a.sentiment.negative + "%"]);
  csvLines.push(["Mixed", a.sentiment.mixed + "%"]);
  csvLines.push([]);

  // Section 3: Top issues
  csvLines.push(["TOP ISSUES"]);
  csvLines.push(["Rank", "Issue", "Severity", "Mentions", "Percent", "Trend", "Recommendation"]);
  a.complaints.forEach(c => csvLines.push([c.rank, c.title, c.severity, c.frequency, c.percent + "%", c.trend, c.suggestion]));
  csvLines.push([]);

  // Section 4: Strengths
  csvLines.push(["STRENGTHS"]);
  csvLines.push(["Strength", "Mentions", "Percent", "Marketing Tip"]);
  a.praises.forEach(p => csvLines.push([p.title, p.frequency, p.percent + "%", p.tip]));
  csvLines.push([]);

  // Section 5: Feature requests
  csvLines.push(["FEATURE REQUESTS"]);
  csvLines.push(["Feature", "Demand", "Percent", "Urgency", "Recommendation"]);
  a.featureRequests.forEach(f => csvLines.push([f.title, f.demand, f.percent + "%", f.urgency, f.suggestion]));
  csvLines.push([]);

  // Section 6: Action items
  csvLines.push(["ACTION ITEMS"]);
  csvLines.push(["Priority", "Action", "Rationale", "Effort", "Impact"]);
  a.actionItems.forEach(item => csvLines.push([item.priority, item.title, item.rationale, item.effort, item.impact]));
  csvLines.push([]);

  // Section 7: Individual reviews
  csvLines.push(["INDIVIDUAL REVIEWS"]);
  csvLines.push(["Review", "Rating", "Sentiment", "Score", "Author", "Date", "Source", "Themes"]);
  REVIEWS.forEach(r => csvLines.push([r.content, r.rating + "/5", r.sentiment, r.score.toFixed(2), r.author, r.date, r.source, r.themes.join("; ")]));

  const headerRows = new Set([0, 8, 9, 16, 17, 23, 24, 30, 31, 37, 38, 45, 46]);
  const sectionRows = new Set([0, 8, 16, 23, 30, 37, 45]);

  return (
    <div style={{ background: "white", maxWidth: 900, margin: "0 auto", padding: "32px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>CSV Export Preview</h2>
          <p style={{ fontSize: 13, color: "#475569" }}>reviewpulse-shopease-2026-03-28.csv · {csvLines.length} rows</p>
        </div>
        <button className="btn btn-teal" style={{ display: "flex", alignItems: "center", gap: 6 }}>
          ↓ Download CSV
        </button>
      </div>

      <div style={{ border: "1px solid #E2E8F0", borderRadius: 8, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            <tbody>
              {csvLines.map((row, i) => (
                <tr key={i} style={{
                  background: sectionRows.has(i) ? "#F0FDFA" : headerRows.has(i) ? "#F8FAFC" : i % 2 === 0 ? "white" : "#FAFBFC",
                  borderBottom: "1px solid #E2E8F0"
                }}>
                  {/* Row number */}
                  <td style={{ padding: "6px 10px", color: "#94A3B8", fontSize: 10, borderRight: "1px solid #E2E8F0", textAlign: "right", width: 36, userSelect: "none" }}>{i + 1}</td>
                  {row.length === 0
                    ? <td colSpan={8} style={{ padding: "4px 10px", color: "#CBD5E1" }}>—</td>
                    : row.map((cell, j) => (
                      <td key={j} style={{
                        padding: "6px 10px",
                        whiteSpace: "nowrap",
                        maxWidth: 280,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        fontWeight: sectionRows.has(i) ? 700 : headerRows.has(i) ? 600 : 400,
                        color: sectionRows.has(i) ? "#0D9488" : headerRows.has(i) ? "#1E3A5F" : "#475569",
                        borderRight: j < row.length - 1 ? "1px solid #F1F5F9" : "none",
                        fontSize: sectionRows.has(i) ? 13 : 11,
                      }}>{cell}</td>
                    ))
                  }
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ marginTop: 12, fontSize: 11, color: "#94A3B8", display: "flex", justifyContent: "space-between" }}>
        <span>7 sections · {REVIEWS.length} reviews · {csvLines.length} total rows</span>
        <span>Compatible with Excel, Google Sheets, Numbers</span>
      </div>
    </div>
  );
};

/* ═══ APP ═══ */
export default function App() {
  const [view, setView] = useState("pdf");

  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9" }}>
      <style>{CSS}</style>

      {/* Tab switcher */}
      <div className="no-print" style={{ display: "flex", justifyContent: "center", padding: "24px 16px 0", gap: 8 }}>
        <button className={`btn ${view === "pdf" ? "btn-navy" : "btn-outline"}`} onClick={() => setView("pdf")}>PDF Report Template</button>
        <button className={`btn ${view === "csv" ? "btn-navy" : "btn-outline"}`} onClick={() => setView("csv")}>CSV Export Preview</button>
      </div>

      <div style={{ padding: "24px 16px 48px" }}>
        {view === "pdf" ? (
          <div>
            <div className="no-print" style={{ textAlign: "center", marginBottom: 16 }}>
              <p style={{ fontSize: 13, color: "#475569" }}>This is the exact layout rendered to PDF. Two pages: Summary + Details.</p>
            </div>
            <div style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.12)", borderRadius: 4, overflow: "hidden" }}>
              <PDFReport/>
            </div>
          </div>
        ) : (
          <CSVPreview/>
        )}
      </div>
    </div>
  );
}
