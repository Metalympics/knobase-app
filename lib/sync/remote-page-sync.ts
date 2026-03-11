"use client";

/**
 * Remote Page Sync — bridges Supabase `pages` table to localStorage + live editor.
 *
 * Two complementary mechanisms:
 *  1. **Hydration**: on document open, fetch from Supabase and merge into
 *     localStorage so MCP-created/edited content is immediately visible.
 *  2. **Realtime subscription**: `postgres_changes` on the `pages` table so
 *     external writes (e.g. from an MCP agent on another device) appear in
 *     the open editor without a manual refresh.
 */

import { useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  getDocument,
  upsertDocumentFromRemote,
  removeDocumentById,
} from "@/lib/documents/store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RemotePage {
  id: string;
  title: string;
  content_md: string;
  icon: string | null;
  parent_id: string | null;
  school_id: string;
  created_at: string;
  updated_at: string;
}

export interface RemotePageSyncCallbacks {
  /** Called when content/title was updated externally. */
  onContentUpdated?: (page: RemotePage) => void;
  /** Called when the page was deleted externally. */
  onDeleted?: (pageId: string) => void;
}

/* ------------------------------------------------------------------ */
/* Hydration — one-shot fetch on document open                         */
/* ------------------------------------------------------------------ */

/**
 * Fetch a page from Supabase and merge it into localStorage.
 * Returns the remote page data, or null if it doesn't exist.
 *
 * If the Supabase version is newer than what's in localStorage (or the
 * document is missing locally), localStorage is updated so the editor
 * gets the latest content on mount.
 */
export async function hydratePageFromSupabase(
  pageId: string,
): Promise<RemotePage | null> {
  try {
    const supabase = createClient();
    const { data, error } = await supabase
      .from("pages")
      .select("id, title, content_md, icon, parent_id, school_id, created_at, updated_at")
      .eq("id", pageId)
      .single();

    if (error || !data) return null;

    const remote = data as RemotePage;

    upsertDocumentFromRemote({
      id: remote.id,
      title: remote.title,
      content: remote.content_md ?? "",
      icon: remote.icon,
      parentId: remote.parent_id,
      createdAt: remote.created_at,
      updatedAt: remote.updated_at,
    });

    return remote;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Realtime subscription hook                                          */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to `postgres_changes` on the `pages` table for a single page.
 *
 * When an UPDATE arrives whose content differs from what we last sent,
 * localStorage is updated and the `onContentUpdated` callback fires so
 * the page component can refresh its state / editor.
 *
 * Also listens for DELETE to handle external page removal.
 */
export function useRemotePageSync(
  pageId: string | null,
  callbacks: RemotePageSyncCallbacks = {},
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  // Track the last content we wrote locally so we can skip our own echoes
  const lastLocalContent = useRef<string | null>(null);

  const markLocalWrite = useCallback((content: string) => {
    lastLocalContent.current = content;
  }, []);

  useEffect(() => {
    if (!pageId) return;

    // Seed the echo-guard with the current local content
    const local = getDocument(pageId);
    if (local) lastLocalContent.current = local.content;

    const supabase = createClient();
    const channel = supabase
      .channel(`page-remote-sync:${pageId}`)
      .on(
        "postgres_changes" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        {
          event: "UPDATE",
          schema: "public",
          table: "pages",
          filter: `id=eq.${pageId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const remote = payload.new as unknown as RemotePage;
          if (!remote?.id) return;

          // Skip echo — content identical to what we last wrote locally
          if (
            lastLocalContent.current !== null &&
            remote.content_md === lastLocalContent.current
          ) {
            return;
          }

          // Merge into localStorage
          upsertDocumentFromRemote(
            {
              id: remote.id,
              title: remote.title,
              content: remote.content_md ?? "",
              icon: remote.icon,
              parentId: remote.parent_id,
              createdAt: remote.created_at,
              updatedAt: remote.updated_at,
            },
            true, // force — remote wins
          );

          cbRef.current.onContentUpdated?.(remote);
        },
      )
      .on(
        "postgres_changes" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        {
          event: "DELETE",
          schema: "public",
          table: "pages",
          filter: `id=eq.${pageId}`,
        },
        () => {
          removeDocumentById(pageId);
          cbRef.current.onDeleted?.(pageId);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [pageId]);

  return { markLocalWrite };
}

/* ------------------------------------------------------------------ */
/* Workspace-level subscription (sidebar: new + deleted pages)         */
/* ------------------------------------------------------------------ */

/**
 * Subscribe to INSERT and DELETE on `pages` for a workspace so the sidebar
 * can reflect documents created or removed by MCP agents on other devices.
 *
 * @returns unsubscribe function
 */
export function useWorkspacePageSync(
  schoolId: string | null,
  callbacks: {
    onPageCreated?: (page: RemotePage) => void;
    onPageDeleted?: (pageId: string) => void;
  } = {},
) {
  const cbRef = useRef(callbacks);
  cbRef.current = callbacks;

  useEffect(() => {
    if (!schoolId) return;

    const supabase = createClient();
    const channel = supabase
      .channel(`workspace-pages:${schoolId}`)
      .on(
        "postgres_changes" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        {
          event: "INSERT",
          schema: "public",
          table: "pages",
          filter: `school_id=eq.${schoolId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const remote = payload.new as unknown as RemotePage;
          if (!remote?.id) return;

          upsertDocumentFromRemote({
            id: remote.id,
            title: remote.title,
            content: remote.content_md ?? "",
            icon: remote.icon,
            parentId: remote.parent_id,
            createdAt: remote.created_at,
            updatedAt: remote.updated_at,
          });

          cbRef.current.onPageCreated?.(remote);
        },
      )
      .on(
        "postgres_changes" as any, // eslint-disable-line @typescript-eslint/no-explicit-any
        {
          event: "DELETE",
          schema: "public",
          table: "pages",
          filter: `school_id=eq.${schoolId}`,
        },
        (payload: { old: Record<string, unknown> }) => {
          const old = payload.old as { id?: string };
          if (!old?.id) return;
          removeDocumentById(old.id);
          cbRef.current.onPageDeleted?.(old.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [schoolId]);
}
