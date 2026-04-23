import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Database, OnboardingChecklist } from "@/types/database";

export type ChecklistKey = keyof OnboardingChecklist;

export interface UpdateChecklistResult {
  error: string | null;
  checklist: OnboardingChecklist | null;
}

export async function updateChecklistItem(
  userId: string,
  item: ChecklistKey,
  value: boolean,
  client?: SupabaseClient<Database>
): Promise<UpdateChecklistResult> {
  const supabase = client ?? (createClient() as SupabaseClient<Database>);

  const fetched = await (
    supabase.from("profiles") as unknown as {
      select: (cols: string) => {
        eq: (c: string, v: string) => {
          maybeSingle: () => Promise<{
            data: { onboarding_checklist: OnboardingChecklist } | null;
            error: { message: string } | null;
          }>;
        };
      };
    }
  )
    .select("onboarding_checklist")
    .eq("id", userId)
    .maybeSingle();

  if (fetched.error) return { error: fetched.error.message, checklist: null };
  if (!fetched.data) return { error: "Profile not found", checklist: null };

  const next: OnboardingChecklist = {
    ...fetched.data.onboarding_checklist,
    [item]: value,
  };

  const upd = await (
    supabase.from("profiles") as unknown as {
      update: (v: { onboarding_checklist: OnboardingChecklist }) => {
        eq: (
          c: string,
          v: string
        ) => Promise<{ error: { message: string } | null }>;
      };
    }
  )
    .update({ onboarding_checklist: next })
    .eq("id", userId);

  if (upd.error) return { error: upd.error.message, checklist: null };

  return { error: null, checklist: next };
}
