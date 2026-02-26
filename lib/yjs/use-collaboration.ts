"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import * as Y from "yjs";
import { SupabaseProvider, type ConnectionStatus } from "./supabase-provider";
import { getOfflineDocument } from "@/lib/offline/db";

const LS_PREFIX = "knobase-app:";

function hashToColor(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 50%)`;
}

function generateUserId(): string {
  if (typeof window === "undefined") return "";
  const stored = localStorage.getItem(`${LS_PREFIX}user-id`);
  if (stored) return stored;
  const id = crypto.randomUUID();
  localStorage.setItem(`${LS_PREFIX}user-id`, id);
  return id;
}

function getUserName(): string {
  if (typeof window === "undefined") return "Anonymous";
  return localStorage.getItem(`${LS_PREFIX}workspace`) ?? "Anonymous";
}

export interface CollaborationState {
  provider: SupabaseProvider | null;
  ydoc: Y.Doc | null;
  status: ConnectionStatus;
  isSynced: boolean;
  /** true only after connect() has fully completed (success or failure).
   *  Use this as the render guard so TiptapEditor never mounts mid-setup. */
  isReady: boolean;
  user: { id: string; name: string; color: string };
}

export function useCollaboration(
  documentId: string | null,
): CollaborationState {
  // Stable user identity – never changes for the lifetime of the page.
  const user = useMemo(() => {
    if (typeof window === "undefined")
      return { id: "", name: "Anonymous", color: "#888" };
    const id = generateUserId();
    return { id, name: getUserName(), color: hashToColor(id) };
  }, []);

  const [state, setState] = useState<{
    provider: SupabaseProvider | null;
    ydoc: Y.Doc | null;
    status: ConnectionStatus;
    isSynced: boolean;
    isReady: boolean;
  }>({
    provider: null,
    ydoc: null,
    status: "disconnected",
    isSynced: false,
    isReady: false,
  });

  // Keep a ref to the current provider so the cleanup can always reach it.
  const providerRef = useRef<SupabaseProvider | null>(null);

  useEffect(() => {
    if (!documentId) return;

    // Reset so isReady=false blocks TiptapEditor while we wire up the new
    // provider. A fresh Y.Doc is created per connection so Tiptap always
    // starts with a clean document (it is remounted via key={activeId} anyway).
    const ydoc = new Y.Doc();
    setState({
      provider: null,
      ydoc,
      status: "connecting",
      isSynced: false,
      isReady: false,
    });

    let provider: SupabaseProvider | null = null;
    let cancelled = false; // guard for React StrictMode double-invocation

    // Try to restore from IndexedDB (offline cache) or emergency localStorage
    (async () => {
      try {
        // 1) Check emergency localStorage backup first
        const emergencyKey = `knobase:emergency:${documentId}`;
        const emergency = localStorage.getItem(emergencyKey);
        if (emergency) {
          const { yjsState } = JSON.parse(emergency) as { yjsState: string };
          const update = base64ToUint8(yjsState);
          Y.applyUpdate(ydoc, update, "offline-restore");
          localStorage.removeItem(emergencyKey); // consumed
        }

        // 2) Restore from IndexedDB (richer, more recent)
        const cached = await getOfflineDocument(documentId);
        if (cached?.yjsState) {
          const update = base64ToUint8(cached.yjsState);
          Y.applyUpdate(ydoc, update, "offline-restore");
        }
      } catch {
        /* best-effort restore */
      }
    })();

    try {
      provider = new SupabaseProvider({ document: ydoc, documentId, user });
      providerRef.current = provider;

      provider.on("status", ({ status }: { status: ConnectionStatus }) => {
        if (!cancelled) setState((prev) => ({ ...prev, status }));
      });

      provider.on("synced", () => {
        if (!cancelled) setState((prev) => ({ ...prev, isSynced: true }));
      });

      // Mark ready — provider is fully constructed and non-null here.
      setState((prev) => ({ ...prev, provider, isReady: true }));
    } catch {
      // Supabase unavailable – run in offline / non-collaborative mode.
      setState((prev) => ({
        ...prev,
        provider: null,
        status: "disconnected",
        isSynced: true,
        isReady: true,
      }));
    }

    return () => {
      cancelled = true;

      // Destroy only the network provider. The ydoc is intentionally NOT
      // destroyed here: Tiptap may still be mid-unmount and holding an
      // internal reference to the ydoc (via y-prosemirror). Destroying it
      // while Tiptap is cleaning up is exactly what causes the ".doc" crash.
      if (provider) {
        try {
          provider.destroy();
        } catch {
          /* ignore */
        }
      }
      providerRef.current = null;

      // Drive isReady back to false so no lingering render can mount
      // TiptapEditor with the now-dead provider.
      setState({
        provider: null,
        ydoc: null,
        status: "disconnected",
        isSynced: false,
        isReady: false,
      });
    };
    // `user` intentionally omitted from deps — it is stable for the whole page
    // session and reconnecting on every user object recreation would be wrong.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId]);

  return { ...state, user };
}

function base64ToUint8(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
