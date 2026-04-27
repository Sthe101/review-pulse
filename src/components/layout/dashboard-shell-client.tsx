"use client";

import { useRouter, usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { createClient } from "@/lib/supabase/client";

const ID_TO_PATH: Record<string, string> = {
  dashboard: "/dashboard",
  projects: "/projects",
  analysis: "/projects/new",
  trends: "/trends",
  integrations: "/integrations",
  settings: "/settings",
  billing: "/billing",
};

function pathToActiveId(pathname: string): string | undefined {
  if (pathname === "/projects/new" || pathname.startsWith("/projects/new/")) {
    return "analysis";
  }
  for (const [id, path] of Object.entries(ID_TO_PATH)) {
    if (id === "analysis") continue;
    if (pathname === path || pathname.startsWith(`${path}/`)) {
      return id;
    }
  }
  return undefined;
}

type Props = {
  user: { name: string; email: string };
  usage: { used: number; limit: number; plan: string };
  children: ReactNode;
};

export function DashboardShellClient({ user, usage, children }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const activeId = pathToActiveId(pathname ?? "");

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DashboardShell
      activeId={activeId}
      user={user}
      usage={usage}
      onNavigate={(id) => {
        const target = ID_TO_PATH[id];
        if (target) router.push(target);
      }}
      onSignOut={handleSignOut}
    >
      {children}
    </DashboardShell>
  );
}
