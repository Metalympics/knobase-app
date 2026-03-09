"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./provider";
import { createClient } from "@/lib/supabase/client";
import type { School } from "@/lib/supabase/types";

export type Workspace = School;

export function useWorkspaces() {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<School[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!user) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const supabase = createClient();

        const { data: profile } = await supabase
          .from("users")
          .select("id, school_id")
          .eq("auth_id", user.id)
          .single();

        if (!profile?.school_id) {
          setWorkspaces([]);
          setLoading(false);
          return;
        }

        const { data, error: fetchError } = await supabase
          .from("schools")
          .select("*")
          .eq("id", profile.school_id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setWorkspaces((data as School[]) ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Unknown error"));
        setWorkspaces([]);
      } finally {
        setLoading(false);
      }
    }

    if (!authLoading) {
      fetchWorkspaces();
    }
  }, [user, authLoading]);

  const refetch = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const supabase = createClient();

      const { data: profile } = await supabase
        .from("users")
        .select("id, school_id")
        .eq("auth_id", user.id)
        .single();

      if (!profile?.school_id) {
        setWorkspaces([]);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("schools")
        .select("*")
        .eq("id", profile.school_id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setWorkspaces((data as School[]) ?? []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return { workspaces, loading: loading || authLoading, error, refetch };
}
