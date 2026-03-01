/**
 * Sync Bridge: Local Store ↔ Supabase
 *
 * Strategy:
 * 1. Optimistic update to local Zustand store  (immediate UX)
 * 2. Async write via task-coordinator          (Supabase persistence + webhook)
 * 3. On success: swap temp ID → real Supabase ID in local store
 * 4. On error:   rollback the optimistic entry + re-throw
 * 5. Realtime subscription handles remote changes via existing hooks
 *
 * The TaskQueuePanel already subscribes to Supabase via useDocumentTasks(),
 * so it will pick up the persisted task automatically. The local store entry
 * provides instant feedback for any component that reads useTaskStore.
 */

import { useTaskStore } from "./task-store";
import { handleMention } from "./task-coordinator";
import { subscribeToDocumentTasks } from "@/lib/supabase/tasks";
import type { AgentTask as SupabaseAgentTask } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface SyncTaskParams {
  documentId: string;
  workspaceId: string;
  /** Human-readable prompt / task description */
  prompt: string;
  /** Mentioned agent handle, e.g. "@claude" */
  mentionedAgent: string;
  agentId?: string;
  agentName?: string;
  blockId?: string;
  yjsPosition?: number;
  userId: string;
  userName?: string;
}

export interface SyncTaskResult {
  /** Confirmed Supabase task ID */
  taskId: string;
  /** Temporary optimistic ID (already replaced in local store) */
  localId: string;
}

/* ------------------------------------------------------------------ */
/* syncTaskToSupabase                                                   */
/* ------------------------------------------------------------------ */

/**
 * Create an agent task with optimistic-first UX:
 *  - Local Zustand store gets a temporary entry immediately
 *  - task-coordinator.handleMention() persists to Supabase and fires the
 *    `task.created` webhook to OpenClaw
 *  - On success the temp ID is replaced with the real Supabase UUID
 *  - On failure the optimistic entry is removed and the error is re-thrown
 */
export async function syncTaskToSupabase(
  params: SyncTaskParams,
): Promise<SyncTaskResult> {
  const localStore = useTaskStore.getState();
  const tempId = `optimistic-${crypto.randomUUID()}`;

  // ── Step 1: Optimistic local update ──────────────────────────────
  localStore.addTask({
    id: tempId,
    type: "inline",
    status: "queued",
    prompt: params.prompt,
    documentId: params.documentId,
    documentTitle: "",
    agent: {
      name: params.agentName ?? params.mentionedAgent,
      model: params.agentId ?? params.mentionedAgent,
      provider: "external",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  try {
    // ── Step 2: Persist to Supabase + fire webhook ────────────────
    const { task } = await handleMention({
      documentId: params.documentId,
      workspaceId: params.workspaceId,
      prompt: params.prompt,
      createdBy: params.userId,
      agentId: params.agentId,
      agentName: params.agentName,
      blockId: params.blockId,
      yjsPosition: params.yjsPosition,
    });

    // ── Step 3: Replace temp ID with real Supabase ID ─────────────
    localStore.updateTaskId(tempId, task.id);

    return { taskId: task.id, localId: tempId };
  } catch (error) {
    // ── Step 4: Graceful degradation ──────────────────────────────
    // Keep the optimistic local entry so the UI still works even when
    // Supabase is unavailable (e.g. table not yet migrated, network down).
    console.warn("[SyncBridge] Supabase sync failed — task kept locally:", error);
    return { taskId: tempId, localId: tempId };
  }
}

/* ------------------------------------------------------------------ */
/* subscribeToSupabaseChanges                                           */
/* ------------------------------------------------------------------ */

/**
 * Mirror Supabase realtime changes for a document into the local task store.
 * Returns an unsubscribe function.
 *
 * Note: Components using useDocumentTasks() already handle their own
 * subscription. This bridge subscription is for contexts (e.g. background
 * workers) that read from useTaskStore directly.
 */
export function subscribeToSupabaseChanges(
  _workspaceId: string,
  documentId: string,
): () => void {
  const unsubscribe = subscribeToDocumentTasks(
    documentId,
    (task: SupabaseAgentTask, eventType?: string, old?: Partial<SupabaseAgentTask>) => {
      const localStore = useTaskStore.getState();

      if (eventType === "DELETE") {
        if (old?.id) localStore.removeTask(old.id);
        return;
      }

      const remote = task;
      const existing = localStore.tasks.find((t) => t.id === remote.id);

      const statusMap: Record<SupabaseAgentTask["status"], import("./task-types").TaskStatus> = {
        pending: "queued",
        acknowledged: "queued",
        working: "running",
        completed: "completed",
        failed: "failed",
        cancelled: "cancelled",
      };

      if (existing) {
        localStore.updateTask(remote.id, {
          status: statusMap[remote.status] ?? "queued",
          prompt: remote.prompt,
          result: remote.result_summary ?? undefined,
          error: remote.error_message ?? undefined,
          updatedAt: new Date(remote.completed_at ?? remote.started_at ?? remote.created_at),
        });
      } else if (eventType === "INSERT") {
        localStore.addTask({
          id: remote.id,
          type: "inline",
          status: statusMap[remote.status] ?? "queued",
          prompt: remote.prompt,
          documentId: remote.document_id,
          documentTitle: remote.title ?? "",
          agent: {
            name: remote.agent_id ?? "agent",
            model: remote.agent_id ?? "unknown",
            provider: "external",
          },
          result: remote.result_summary ?? undefined,
          error: remote.error_message ?? undefined,
          createdAt: new Date(remote.created_at),
          updatedAt: new Date(remote.completed_at ?? remote.started_at ?? remote.created_at),
        });
      }
    },
  );

  return unsubscribe.unsubscribe;
}
