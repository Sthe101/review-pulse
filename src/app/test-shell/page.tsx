import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";

// Test-only fixture: renders the dashboard shell with hardcoded props so
// E2E tests can exercise sidebar/collapse/theme/sign-out without going
// through the real (dashboard) layout's SSR auth check.
export default function TestShellPage() {
  return (
    <DashboardShellClient
      user={{ name: "Jane Doe", email: "jane@example.com" }}
      usage={{ used: 12, limit: 50, plan: "Free" }}
    >
      <div>
        <h1
          style={{ fontSize: 24, fontWeight: 700, color: "var(--tx)", margin: 0 }}
        >
          Dashboard
        </h1>
        <p style={{ color: "var(--tx2)", marginTop: 8 }}>Shell fixture page.</p>
      </div>
    </DashboardShellClient>
  );
}
