"use client";

import * as Y from "yjs";
import {
  getOfflineDocument,
  putOfflineDocument,
  markDocumentClean,
  getAllPendingOps,
  deletePendingOp,
  incrementRetry,
  getPendingOpsCount,
  getAllPendingDecisions,
  deletePendingDecision,
  type OfflineDocument,
  type PendingOp,
} from "@/lib/offline/db";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type SyncStatus =
  | "idle"        // nothing to do
  | "dirty"       // local changes pending
  | "syncing"     // sync in progress
  | "synced"      // last sync succeeded
  | "offline"     // no network
  | "error";      // last sync failed

export interface SyncEngineConfig {
  /** Debounce interval (ms) before flushing dirty docs. Default: 2000 */
  debounceMs?: number;
  /** Max pending ops to process per flush. Default: 10 */
  batchSize?: number;
  /** Max retries for a pending op before it is dropped. Default: 5 */
  maxRetries?: number;
  /** Backoff schedule (ms) indexed by retry count. Default: [1000,2000,5000,10000,30000] */
  backoffMs?: number[];
}

type Listener = (status: SyncStatus, detail?: { pendingCount?: number }) => void;

/* ------------------------------------------------------------------ */
/* Sync Engine                                                         */
/* ------------------------------------------------------------------ */

const DEFAULT_BACKOFF = [1_000, 2_000, 5_000, 10_000, 30_000];

/**
 * Singleton sync engine that:
 *  1. Persists Yjs documents to IndexedDB on every local update.
 *  2. Debounces remote flushes to Supabase (default 2 s).
 *  3. Queues operations when offline, replays them on reconnect.
 *  4. Provides a reactive `SyncStatus` for UI indicators.
 */
export class SyncEngine {
  /* ---- config ---- */
  private debounceMs: number;
  private batchSize: number;
  private maxRetries: number;
  private backoffMs: number[];

  /* ---- state ---- */
  private _status: SyncStatus = "idle";
  private _online: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private dirtyDocs = new Set<string>();
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private flushInProgress = false;
  private listeners = new Set<Listener>();
  private destroyed = false;

  /* ---- tracked Y.Doc observers ---- */
  private trackedDocs = new Map<string, { ydoc: Y.Doc; handler: (update: Uint8Array, origin: unknown) => void }>();

  constructor(config: SyncEngineConfig = {}) {
    this.debounceMs = config.debounceMs ?? 2_000;
    this.batchSize = config.batchSize ?? 10;
    this.maxRetries = config.maxRetries ?? 5;
    this.backoffMs = config.backoffMs ?? DEFAULT_BACKOFF;

    if (typeof window !== "undefined") {
      window.addEventListener("online", this.handleOnline);
      window.addEventListener("offline", this.handleOffline);
      window.addEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  /* ================================================================ */
  /* Public API                                                        */
  /* ================================================================ */

  /** Current sync status. */
  get status(): SyncStatus {
    return this._status;
  }

  /** Whether the browser is online. */
  get isOnline(): boolean {
    return this._online;
  }

  /**
   * Start tracking a Y.Doc — every local update is persisted to IndexedDB
   * and the document is marked dirty for the next debounced flush.
   */
  track(documentId: string, ydoc: Y.Doc, meta: { title: string; workspaceId: string }): void {
    // Don't double-track
    if (this.trackedDocs.has(documentId)) return;

    const handler = (update: Uint8Array, origin: unknown) => {
      if (origin === "remote") return;          // ignore inbound sync
      this.onLocalUpdate(documentId, ydoc, meta);
    };

    ydoc.on("update", handler);
    this.trackedDocs.set(documentId, { ydoc, handler });

    // Persist the initial state
    this.onLocalUpdate(documentId, ydoc, meta);
  }

  /** Stop tracking a Y.Doc (e.g. when switching documents). */
  untrack(documentId: string): void {
    const entry = this.trackedDocs.get(documentId);
    if (entry) {
      entry.ydoc.off("update", entry.handler);
      this.trackedDocs.delete(documentId);
    }
  }

  /** Force an immediate sync of all dirty documents + pending ops. */
  async forceFlush(): Promise<void> {
    this.cancelDebounce();
    await this.flush();
  }

  /** Subscribe to status changes. Returns an unsubscribe function. */
  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** Number of operations waiting in the offline queue. */
  async pendingCount(): Promise<number> {
    return getPendingOpsCount();
  }

  /** Tear down — remove global listeners and stop tracking. */
  destroy(): void {
    this.destroyed = true;
    this.cancelDebounce();

    for (const [id] of this.trackedDocs) {
      this.untrack(id);
    }

    if (typeof window !== "undefined") {
      window.removeEventListener("online", this.handleOnline);
      window.removeEventListener("offline", this.handleOffline);
      window.removeEventListener("beforeunload", this.handleBeforeUnload);
    }
  }

  /* ================================================================ */
  /* Internal — local persistence                                      */
  /* ================================================================ */

  private async onLocalUpdate(
    documentId: string,
    ydoc: Y.Doc,
    meta: { title: string; workspaceId: string },
  ): Promise<void> {
    // 1) Persist to IndexedDB immediately (non-blocking)
    const state = Y.encodeStateAsUpdate(ydoc);
    const yjsState = uint8ToBase64(state);

    // Extract markdown if possible — fallback to empty string
    let markdown = "";
    try {
      const text = ydoc.getText("default");
      markdown = text.toString();
    } catch {
      /* Yjs fragment may use a different key */
    }

    const now = new Date().toISOString();
    const existing = await getOfflineDocument(documentId);

    const doc: OfflineDocument = {
      id: documentId,
      yjsState,
      markdown,
      title: meta.title,
      workspaceId: meta.workspaceId,
      dirty: true,
      localUpdatedAt: now,
      lastSyncedAt: existing?.lastSyncedAt ?? null,
    };

    await putOfflineDocument(doc);

    // 2) Mark dirty + schedule debounced flush
    this.dirtyDocs.add(documentId);
    this.setStatus("dirty");
    this.scheduleFlush();
  }

  /* ================================================================ */
  /* Internal — debounced flush                                        */
  /* ================================================================ */

  private scheduleFlush(): void {
    if (this.debounceTimer) return; // already scheduled
    this.debounceTimer = setTimeout(() => {
      this.debounceTimer = null;
      this.flush().catch(console.error);
    }, this.debounceMs);
  }

  private cancelDebounce(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  private async flush(): Promise<void> {
    if (this.flushInProgress || this.destroyed) return;
    if (!this._online) {
      this.setStatus("offline");
      return;
    }

    this.flushInProgress = true;
    this.setStatus("syncing");

    try {
      // 1) Flush dirty documents
      await this.flushDirtyDocuments();

      // 2) Replay pending ops queue
      await this.replayPendingOps();

      // 3) Replay pending proposal decisions
      await this.replayPendingDecisions();

      this.setStatus(this.dirtyDocs.size > 0 ? "dirty" : "synced");
    } catch (err) {
      console.error("[SyncEngine] flush failed:", err);
      this.setStatus("error");
    } finally {
      this.flushInProgress = false;
    }
  }

  /* ================================================================ */
  /* Internal — flush dirty docs to Supabase                           */
  /* ================================================================ */

  private async flushDirtyDocuments(): Promise<void> {
    const ids = Array.from(this.dirtyDocs);
    if (ids.length === 0) return;

    const supabase = createClient();

    for (const id of ids) {
      const doc = await getOfflineDocument(id);
      if (!doc || !doc.dirty) {
        this.dirtyDocs.delete(id);
        continue;
      }

      // Flush editor page content to the `pages` table in Supabase.
      // The Yjs state is persisted locally in IndexedDB; Supabase stores
      // the rendered markdown for search, API access, and collaboration.
      const { error } = await supabase
        .from("pages")
        .update({
          title: doc.title,
          content_md: doc.markdown,
        })
        .eq("id", doc.id);

      if (error) {
        console.warn(`[SyncEngine] failed to sync document ${id}:`, error.message);
        // leave dirty so it retries on next flush
        continue;
      }

      this.dirtyDocs.delete(id);
      await markDocumentClean(id);
    }
  }

  /* ================================================================ */
  /* Internal — replay pending ops                                     */
  /* ================================================================ */

  private async replayPendingOps(): Promise<void> {
    const ops = await getAllPendingOps();
    if (ops.length === 0) return;

    const supabase = createClient();
    const batch = ops.slice(0, this.batchSize);

    for (const op of batch) {
      if (op.retryCount >= this.maxRetries) {
        console.warn(`[SyncEngine] dropping op ${op.id} after ${op.retryCount} retries`);
        await deletePendingOp(op.id!);
        continue;
      }

      try {
        await this.executePendingOp(supabase, op);
        await deletePendingOp(op.id!);
      } catch {
        await incrementRetry(op.id!);
        const delay = this.backoffMs[Math.min(op.retryCount, this.backoffMs.length - 1)];
        await sleep(delay);
      }
    }
  }

  private async executePendingOp(
    supabase: ReturnType<typeof createClient>,
    op: PendingOp,
  ): Promise<void> {
    // Pending ops target arbitrary tables, so we cast via `any` to bypass
    // the typed client's strict overload resolution. The payload shape was
    // validated when the op was enqueued.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const client = supabase as any;
    switch (op.method) {
      case "insert": {
        const { error } = await client.from(op.table).insert(op.payload);
        if (error) throw error;
        break;
      }
      case "update": {
        const { id, ...rest } = op.payload;
        const { error } = await client
          .from(op.table)
          .update(rest)
          .eq("id", id as string);
        if (error) throw error;
        break;
      }
      case "upsert": {
        const { error } = await client
          .from(op.table)
          .upsert(op.payload, { onConflict: "id" });
        if (error) throw error;
        break;
      }
      case "delete": {
        const { error } = await client
          .from(op.table)
          .delete()
          .eq("id", op.payload.id as string);
        if (error) throw error;
        break;
      }
    }
  }

  /* ================================================================ */
  /* Internal — replay pending proposal decisions                      */
  /* ================================================================ */

  private async replayPendingDecisions(): Promise<void> {
    const decisions = await getAllPendingDecisions();
    if (decisions.length === 0) return;

    // Dynamic import to avoid circular deps
    const { acceptEdit, rejectEdit, acceptEditWithChanges } = await import(
      "@/lib/agents/task-coordinator"
    );

    for (const d of decisions) {
      try {
        switch (d.decision) {
          case "accept":
            await acceptEdit(d.proposalId, d.decidedBy);
            break;
          case "reject":
            await rejectEdit(d.proposalId, d.decidedBy);
            break;
          case "modify":
            if (d.modifiedContent) {
              await acceptEditWithChanges(d.proposalId, d.decidedBy, d.modifiedContent);
            }
            break;
        }
        await deletePendingDecision(d.id!);
      } catch (err) {
        console.warn(`[SyncEngine] failed to replay decision ${d.id}:`, err);
        // leave it for next flush
      }
    }
  }

  /* ================================================================ */
  /* Internal — network listeners                                      */
  /* ================================================================ */

  private handleOnline = () => {
    this._online = true;
    console.log("[SyncEngine] network restored — flushing pending");
    this.flush().catch(console.error);
  };

  private handleOffline = () => {
    this._online = false;
    this.setStatus("offline");
  };

  private handleBeforeUnload = () => {
    // Emergency sync: serialize dirty Y.Docs to IndexedDB synchronously.
    // The full Supabase flush is background-only, but at least local data
    // is persisted so nothing is lost.
    for (const [docId, { ydoc }] of this.trackedDocs) {
      if (!this.dirtyDocs.has(docId)) continue;
      try {
        const state = Y.encodeStateAsUpdate(ydoc);
        const yjsState = uint8ToBase64(state);
        // Use synchronous localStorage as a last-resort backup
        // (IndexedDB transactions may not complete before unload).
        localStorage.setItem(
          `knobase:emergency:${docId}`,
          JSON.stringify({ yjsState, savedAt: Date.now() }),
        );
      } catch {
        /* best-effort */
      }
    }
  };

  /* ================================================================ */
  /* Internal — helpers                                                */
  /* ================================================================ */

  private setStatus(status: SyncStatus): void {
    if (status === this._status) return;
    this._status = status;
    const count = this.dirtyDocs.size;
    for (const fn of this.listeners) {
      try {
        fn(status, { pendingCount: count });
      } catch {
        /* listener error should not break engine */
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/* Singleton                                                           */
/* ------------------------------------------------------------------ */

let _instance: SyncEngine | null = null;

/** Get (or create) the global SyncEngine singleton. */
export function getSyncEngine(config?: SyncEngineConfig): SyncEngine {
  if (!_instance) {
    _instance = new SyncEngine(config);
  }
  return _instance;
}

/** Destroy the global SyncEngine (e.g. on logout). */
export function destroySyncEngine(): void {
  _instance?.destroy();
  _instance = null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function uint8ToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
