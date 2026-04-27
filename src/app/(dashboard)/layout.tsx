import { redirect } from "next/navigation";
import { type ReactNode } from "react";
import { DashboardShellClient } from "@/components/layout/dashboard-shell-client";
import { createClient } from "@/lib/supabase/server";
import type { Plan } from "@/types/database";

const PLAN_LIMITS: Record<Plan, number> = {
  free: 50,
  pro: 500,
  business: 10000,
};

const PLAN_LABELS: Record<Plan, string> = {
  free: "Free",
  pro: "Pro",
  business: "Business",
};

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const profileQuery = (await supabase
    .from("profiles")
    .select("full_name, plan, reviews_used_this_month")
    .eq("id", user.id)
    .maybeSingle()) as unknown as {
    data: {
      full_name: string | null;
      plan: Plan;
      reviews_used_this_month: number;
    } | null;
  };

  const profile = profileQuery.data;
  const plan: Plan = profile?.plan ?? "free";
  const used = profile?.reviews_used_this_month ?? 0;
  const limit = PLAN_LIMITS[plan];
  const planLabel = PLAN_LABELS[plan];

  const name = profile?.full_name?.trim() || user.email?.split("@")[0] || "User";
  const email = user.email ?? "";

  return (
    <DashboardShellClient
      user={{ name, email }}
      usage={{ used, limit, plan: planLabel }}
    >
      {children}
    </DashboardShellClient>
  );
}
