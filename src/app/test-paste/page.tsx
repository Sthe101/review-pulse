import { PasteAnalyze } from "@/components/dashboard/paste-analyze";

// Test-only fixture: mounts the paste-and-analyze component with a hardcoded
// userId so E2E tests can drive it without going through the (dashboard)
// layout's SSR auth check. Browser-side calls to Supabase + /api/analyze
// are intercepted by Playwright route handlers.
export default function TestPastePage() {
  return (
    <div style={{ maxWidth: 880, margin: "32px auto", padding: 16 }}>
      <h1
        style={{
          fontSize: 24,
          fontWeight: 700,
          color: "var(--tx)",
          margin: "0 0 16px 0",
        }}
      >
        Quick Analysis (test fixture)
      </h1>
      <PasteAnalyze userId="00000000-0000-0000-0000-000000000001" />
    </div>
  );
}
