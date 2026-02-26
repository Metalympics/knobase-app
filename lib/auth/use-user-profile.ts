"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./provider";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/client";

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<Tables<"users"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", user.id)
          .single();

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setProfile(data as unknown as Tables<"users">);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setProfile(null);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchProfile();
    }
  }, [user, authLoading]);

  return { profile, loading: loading || authLoading, error };
}
