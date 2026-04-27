import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StatCards } from "@/components/dashboard/stat-cards";
import { PasteAnalyze } from "@/components/dashboard/paste-analyze";
import { RecentProjects } from "@/components/dashboard/recent-projects";
import { KeyInsights } from "@/components/dashboard/key-insights";

export const metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/dashboard");

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
      <PasteAnalyze userId={user.id} />
      <KeyInsights />
      <RecentProjects />
    </div>
  );
}
