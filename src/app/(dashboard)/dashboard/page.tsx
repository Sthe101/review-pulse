import { StatCards } from "@/components/dashboard/stat-cards";

export const metadata = {
  title: "Dashboard",
};

export default function DashboardPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div>
        <h1
          style={{ fontSize: 24, fontWeight: 700, color: "var(--tx)", margin: 0 }}
        >
          Dashboard
        </h1>
        <p style={{ color: "var(--tx2)", marginTop: 4 }}>
          Overview of your review analysis activity.
        </p>
      </div>
      <StatCards />
    </div>
  );
}
