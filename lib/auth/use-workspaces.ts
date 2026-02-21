"use client";

import { useEffect, useState } from "react";
import { useAuth } from "./provider";
import { createClient } from "@/lib/supabase/client";
import type { Workspace } from "@/lib/supabase/types";

export function useWorkspaces() {
  const { user, loading: authLoading } = useAuth();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
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
          .select("id")
          .eq("auth_id", user.id)
          .single();

        if (!profile) {
          throw new Error("User profile not found");
        }

        const { data, error: fetchError } = await supabase
          .from("workspaces")
          .select(
            `
            *,
            workspace_members!inner (
              role,
              joined_at
            )
          `
          )
          .eq("workspace_members.user_id", profile.id)
          .order("created_at", { ascending: false });

        if (fetchError) {
          throw new Error(fetchError.message);
        }

        setWorkspaces(data as Workspace[]);
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
        .select("id")
        .eq("auth_id", user.id)
        .single();

      if (!profile) {
        throw new Error("User profile not found");
      }

      const { data, error: fetchError } = await supabase
        .from("workspaces")
        .select(
          `
          *,
          workspace_members!inner (
            role,
            joined_at
          )
        `
        )
        .eq("workspace_members.user_id", profile.id)
        .order("created_at", { ascending: false });

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      setWorkspaces(data as Workspace[]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setLoading(false);
    }
  };

  return { workspaces, loading: loading || authLoading, error, refetch };
}
