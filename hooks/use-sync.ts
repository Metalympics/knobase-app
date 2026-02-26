"use client";

import { useEffect, useRef, useSyncExternalStore, useCallback } from "react";
import * as Y from "yjs";
import { getSyncEngine, type SyncStatus } from "@/lib/sync/sync-engine";

/* ------------------------------------------------------------------ */
/* useSyncStatus — reactive sync status for UI                         */
/* ------------------------------------------------------------------ */

interface SyncInfo {
  status: SyncStatus;
  isOnline: boolean;
  pendingCount: number;
}

const fallback: SyncInfo = { status: "idle", isOnline: true, pendingCount: 0 };

/**
 * Subscribe to the global SyncEngine's status.
 * Returns the current `SyncStatus` and pending-ops count.
 */
export function useSyncStatus(): SyncInfo {
  const infoRef = useRef<SyncInfo>({ ...fallback });
  const listenersRef = useRef(new Set<() => void>());

  useEffect(() => {
    const engine = getSyncEngine();
    infoRef.current = {
      status: engine.status,
      isOnline: engine.isOnline,
      pendingCount: 0,
    };

    const unsub = engine.subscribe((status, detail) => {
      infoRef.current = {
        status,
        isOnline: engine.isOnline,
        pendingCount: detail?.pendingCount ?? 0,
      };
      for (const fn of listenersRef.current) fn();
    });

    return unsub;
  }, []);

  const subscribe = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => listenersRef.current.delete(cb);
  }, []);

  const getSnapshot = useCallback(() => infoRef.current, []);

  return useSyncExternalStore(subscribe, getSnapshot, () => fallback);
}

/* ------------------------------------------------------------------ */
/* useSyncDocument — track a Y.Doc with the sync engine                */
/* ------------------------------------------------------------------ */

/**
 * Registers the Y.Doc with the global SyncEngine so that:
 *  - Every local update is persisted to IndexedDB immediately.
 *  - Dirty documents are flushed to Supabase after a 2 s debounce.
 *
 * Ctrl+S triggers a force flush.
 */
export function useSyncDocument(
  documentId: string | undefined,
  ydoc: Y.Doc | null | undefined,
  meta: { title: string; workspaceId: string },
): {
  forceFlush: () => Promise<void>;
} {
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    if (!documentId || !ydoc) return;

    const engine = getSyncEngine();
    engine.track(documentId, ydoc, metaRef.current);

    return () => {
      engine.untrack(documentId);
    };
  }, [documentId, ydoc]);

  // Ctrl+S / Cmd+S force flush
  useEffect(() => {
    if (!documentId) return;

    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        getSyncEngine().forceFlush().catch(console.error);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [documentId]);

  const forceFlush = useCallback(async () => {
    await getSyncEngine().forceFlush();
  }, []);

  return { forceFlush };
}
