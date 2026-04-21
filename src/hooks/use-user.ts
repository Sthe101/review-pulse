"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/types/database";

export type UseUserResult = {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  error: Error | null;
  signOut: () => Promise<void>;
  refetch: () => Promise<void>;
};

const profileCache = new Map<string, Profile>();

export function useUser(): UseUserResult {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async (opts?: { bypassCache?: boolean }) => {
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

      if (!opts?.bypassCache) {
        const cached = profileCache.get(nextUser.id);
        if (cached) {
          setProfile(cached);
          return;
        }
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
      if (profileData) profileCache.set(nextUser.id, profileData);
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
    profileCache.clear();
    setUser(null);
    setProfile(null);
    router.push("/");
  }, [router]);

  const refetch = useCallback(() => load({ bypassCache: true }), [load]);

  return { user, profile, isLoading, error, signOut, refetch };
}
