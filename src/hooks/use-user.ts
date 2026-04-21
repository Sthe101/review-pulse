"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export type UseUserResult = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
};

export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr) throw userErr;

      const nextUser = userData?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        return;
      }

      const { data: profileData, error: profileErr } = (await supabase
        .from("profiles")
        .select("*")
        .eq("id", nextUser.id)
        .maybeSingle()) as {
        data: Profile | null;
        error: { message: string } | null;
      };

      if (profileErr) throw new Error(profileErr.message);
      setProfile(profileData);
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const signOut = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
  }, []);

  return { user, profile, isLoading, error, signOut, refresh: load };
}
