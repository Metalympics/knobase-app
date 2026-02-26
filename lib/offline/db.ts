"use client";

import { openDB, type IDBPDatabase, type DBSchema } from "idb";

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

/** Shape of a locally-cached document (Yjs state + metadata). */
export interface OfflineDocument {
  /** Document ID (primary key) */
  id: string;
  /** Base64-encoded Yjs state vector */
  yjsState: string;
  /** Markdown content snapshot (for quick preview / fallback) */
  markdown: string;
  /** Document title */
  title: string;
  /** Workspace it belongs to */
  workspaceId: string;
  /** true when local edits have not yet been pushed to Supabase */
  dirty: boolean;
  /** ISO timestamp of last local edit */
  localUpdatedAt: string;
  /** ISO timestamp of last successful sync to Supabase */
  lastSyncedAt: string | null;
}

/** A queued write operation that must be replayed when connectivity returns. */
export interface PendingOp {
  /** Auto-incremented unique key */
  id?: number;
  /** Supabase table this targets */
  table: string;
  /** HTTP-style verb */
  method: "insert" | "update" | "upsert" | "delete";
  /** Row-level payload (specific to each table) */
  payload: Record<string, unknown>;
  /** ISO timestamp when the operation was created */
  createdAt: string;
  /** Number of times we have retried this op */
  retryCount: number;
}

/** Task cached for offline creation / display. */
export interface OfflineTask {
  /** Task ID (matches the Supabase task id) */
  id: string;
  payload: Record<string, unknown>;
  /** Has the task been synced to Supabase? */
  synced: boolean;
  createdAt: string;
}

/** Mention cached for offline submission. */
export interface OfflineMention {
  id: string;
  payload: Record<string, unknown>;
  synced: boolean;
  createdAt: string;
}

/** Cached agent session position (for fast rendering while offline). */
export interface CachedSession {
  id: string;
  agentId: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

/** An accept / reject decision made while offline. */
export interface PendingProposalDecision {
  id?: number;
  proposalId: string;
  decision: "accept" | "reject" | "modify";
  modifiedContent?: Record<string, unknown>;
  decidedBy: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* IndexedDB schema (idb typed wrapper)                                */
/* ------------------------------------------------------------------ */

interface KnobaseDB extends DBSchema {
  documents: {
    key: string;
    value: OfflineDocument;
    indexes: {
      "by-workspace": string;
      "by-dirty": string;
    };
  };
  pending_ops: {
    key: number;
    value: PendingOp;
    indexes: {
      "by-table": string;
    };
  };
  tasks: {
    key: string;
    value: OfflineTask;
    indexes: {
      "by-synced": string;
    };
  };
  mentions: {
    key: string;
    value: OfflineMention;
    indexes: {
      "by-synced": string;
    };
  };
  sessions: {
    key: string;
    value: CachedSession;
    indexes: {
      "by-agent": string;
    };
  };
  pending_proposals: {
    key: number;
    value: PendingProposalDecision;
    indexes: {
      "by-proposal": string;
    };
  };
}

const DB_NAME = "knobase-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<KnobaseDB>> | null = null;

/**
 * Get (or create) the singleton IndexedDB connection.
 * Safe to call many times – the promise is cached.
 */
export function getDB(): Promise<IDBPDatabase<KnobaseDB>> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("IndexedDB is not available on the server"));
  }

  if (!dbPromise) {
    dbPromise = openDB<KnobaseDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        /* ---- documents ---- */
        if (!db.objectStoreNames.contains("documents")) {
          const docs = db.createObjectStore("documents", { keyPath: "id" });
          docs.createIndex("by-workspace", "workspaceId");
          docs.createIndex("by-dirty", "dirty");
        }

        /* ---- pending_ops ---- */
        if (!db.objectStoreNames.contains("pending_ops")) {
          const ops = db.createObjectStore("pending_ops", {
            keyPath: "id",
            autoIncrement: true,
          });
          ops.createIndex("by-table", "table");
        }

        /* ---- tasks ---- */
        if (!db.objectStoreNames.contains("tasks")) {
          const tasks = db.createObjectStore("tasks", { keyPath: "id" });
          tasks.createIndex("by-synced", "synced");
        }

        /* ---- mentions ---- */
        if (!db.objectStoreNames.contains("mentions")) {
          const mentions = db.createObjectStore("mentions", { keyPath: "id" });
          mentions.createIndex("by-synced", "synced");
        }

        /* ---- sessions ---- */
        if (!db.objectStoreNames.contains("sessions")) {
          const sessions = db.createObjectStore("sessions", { keyPath: "id" });
          sessions.createIndex("by-agent", "agentId");
        }

        /* ---- pending_proposals ---- */
        if (!db.objectStoreNames.contains("pending_proposals")) {
          const proposals = db.createObjectStore("pending_proposals", {
            keyPath: "id",
            autoIncrement: true,
          });
          proposals.createIndex("by-proposal", "proposalId");
        }
      },
    });
  }

  return dbPromise;
}

/* ------------------------------------------------------------------ */
/* CRUD helpers — documents                                            */
/* ------------------------------------------------------------------ */

export async function getOfflineDocument(id: string): Promise<OfflineDocument | undefined> {
  const db = await getDB();
  return db.get("documents", id);
}

export async function putOfflineDocument(doc: OfflineDocument): Promise<void> {
  const db = await getDB();
  await db.put("documents", doc);
}

export async function getDirtyDocuments(): Promise<OfflineDocument[]> {
  const db = await getDB();
  return db.getAllFromIndex("documents", "by-dirty", IDBKeyRange.only("true"));
}

export async function markDocumentClean(id: string): Promise<void> {
  const db = await getDB();
  const doc = await db.get("documents", id);
  if (doc) {
    doc.dirty = false;
    doc.lastSyncedAt = new Date().toISOString();
    await db.put("documents", doc);
  }
}

export async function listWorkspaceDocuments(workspaceId: string): Promise<OfflineDocument[]> {
  const db = await getDB();
  return db.getAllFromIndex("documents", "by-workspace", workspaceId);
}

export async function deleteOfflineDocument(id: string): Promise<void> {
  const db = await getDB();
  await db.delete("documents", id);
}

/* ------------------------------------------------------------------ */
/* CRUD helpers — pending_ops queue                                    */
/* ------------------------------------------------------------------ */

export async function enqueuePendingOp(op: Omit<PendingOp, "id">): Promise<number> {
  const db = await getDB();
  return db.add("pending_ops", op as PendingOp);
}

export async function getAllPendingOps(): Promise<PendingOp[]> {
  const db = await getDB();
  return db.getAll("pending_ops");
}

export async function deletePendingOp(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("pending_ops", id);
}

export async function incrementRetry(id: number): Promise<void> {
  const db = await getDB();
  const op = await db.get("pending_ops", id);
  if (op) {
    op.retryCount += 1;
    await db.put("pending_ops", op);
  }
}

export async function getPendingOpsCount(): Promise<number> {
  const db = await getDB();
  return db.count("pending_ops");
}

/* ------------------------------------------------------------------ */
/* CRUD helpers — tasks                                                */
/* ------------------------------------------------------------------ */

export async function cacheTask(task: OfflineTask): Promise<void> {
  const db = await getDB();
  await db.put("tasks", task);
}

export async function getUnsyncedTasks(): Promise<OfflineTask[]> {
  const db = await getDB();
  return db.getAllFromIndex("tasks", "by-synced", IDBKeyRange.only("false"));
}

export async function markTaskSynced(id: string): Promise<void> {
  const db = await getDB();
  const task = await db.get("tasks", id);
  if (task) {
    task.synced = true;
    await db.put("tasks", task);
  }
}

/* ------------------------------------------------------------------ */
/* CRUD helpers — mentions                                             */
/* ------------------------------------------------------------------ */

export async function cacheMention(mention: OfflineMention): Promise<void> {
  const db = await getDB();
  await db.put("mentions", mention);
}

export async function getUnsyncedMentions(): Promise<OfflineMention[]> {
  const db = await getDB();
  return db.getAllFromIndex("mentions", "by-synced", IDBKeyRange.only("false"));
}

export async function markMentionSynced(id: string): Promise<void> {
  const db = await getDB();
  const mention = await db.get("mentions", id);
  if (mention) {
    mention.synced = true;
    await db.put("mentions", mention);
  }
}

/* ------------------------------------------------------------------ */
/* CRUD helpers — sessions                                             */
/* ------------------------------------------------------------------ */

export async function cacheSession(session: CachedSession): Promise<void> {
  const db = await getDB();
  await db.put("sessions", session);
}

export async function getCachedSession(id: string): Promise<CachedSession | undefined> {
  const db = await getDB();
  return db.get("sessions", id);
}

export async function getSessionsByAgent(agentId: string): Promise<CachedSession[]> {
  const db = await getDB();
  return db.getAllFromIndex("sessions", "by-agent", agentId);
}

/* ------------------------------------------------------------------ */
/* CRUD helpers — pending proposal decisions                           */
/* ------------------------------------------------------------------ */

export async function enqueueProposalDecision(
  decision: Omit<PendingProposalDecision, "id">,
): Promise<number> {
  const db = await getDB();
  return db.add("pending_proposals", decision as PendingProposalDecision);
}

export async function getAllPendingDecisions(): Promise<PendingProposalDecision[]> {
  const db = await getDB();
  return db.getAll("pending_proposals");
}

export async function deletePendingDecision(id: number): Promise<void> {
  const db = await getDB();
  await db.delete("pending_proposals", id);
}

/* ------------------------------------------------------------------ */
/* Utility — clear all offline data (e.g. on logout)                   */
/* ------------------------------------------------------------------ */

export async function clearAllOfflineData(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(
    ["documents", "pending_ops", "tasks", "mentions", "sessions", "pending_proposals"],
    "readwrite",
  );
  await Promise.all([
    tx.objectStore("documents").clear(),
    tx.objectStore("pending_ops").clear(),
    tx.objectStore("tasks").clear(),
    tx.objectStore("mentions").clear(),
    tx.objectStore("sessions").clear(),
    tx.objectStore("pending_proposals").clear(),
    tx.done,
  ]);
}

/* ------------------------------------------------------------------ */
/* Utility — storage usage estimate                                    */
/* ------------------------------------------------------------------ */

export async function getStorageEstimate(): Promise<{
  usedBytes: number;
  totalBytes: number;
  percentUsed: number;
}> {
  if (!navigator.storage?.estimate) {
    return { usedBytes: 0, totalBytes: 0, percentUsed: 0 };
  }
  const est = await navigator.storage.estimate();
  const used = est.usage ?? 0;
  const total = est.quota ?? 0;
  return {
    usedBytes: used,
    totalBytes: total,
    percentUsed: total > 0 ? (used / total) * 100 : 0,
  };
}
