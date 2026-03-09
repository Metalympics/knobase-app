"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  listTasksByDocument,
  listTasksBySchool,
  getAgentQueue,
  subscribeToDocumentTasks,
  subscribeToAgentTasks,
  cancelTask,
} from "@/lib/supabase/tasks";
import type { AgentTask, AgentTaskStatus } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* useDocumentTasks — realtime task list for a document                */
/* ------------------------------------------------------------------ */

export function useDocumentTasks(
  documentId: string | null,
  options?: { status?: AgentTaskStatus[]; limit?: number },
) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch initial tasks
  useEffect(() => {
    if (!documentId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listTasksByDocument(documentId, options)
      .then(setTasks)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [documentId, options?.status?.join(","), options?.limit]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!documentId) return;

    const sub = subscribeToDocumentTasks(documentId, (updated) => {
      setTasks((prev) => {
        const idx = prev.findIndex((t) => t.id === updated.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = updated;
          return next;
        }
        return [updated, ...prev];
      });
    });

    return () => sub.unsubscribe();
  }, [documentId]);

  const cancel = useCallback(async (taskId: string) => {
    try {
      await cancelTask(taskId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cancel failed");
    }
  }, []);

  const pending = tasks.filter((t) => t.status === "pending");
  const working = tasks.filter((t) => t.status === "working" || t.status === "acknowledged");
  const completed = tasks.filter((t) => t.status === "completed");
  const failed = tasks.filter((t) => t.status === "failed");

  return {
    tasks,
    pending,
    working,
    completed,
    failed,
    loading,
    error,
    cancel,
  };
}

/* ------------------------------------------------------------------ */
/* useWorkspaceTasks — tasks across all documents in a workspace       */
/* ------------------------------------------------------------------ */

export function useWorkspaceTasks(
  schoolId: string | null,
  options?: { agentId?: string; status?: AgentTaskStatus[]; limit?: number },
) {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) {
      setTasks([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listTasksBySchool(schoolId, options)
      .then(setTasks)
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [schoolId, options?.agentId, options?.status?.join(","), options?.limit]);

  return { tasks, loading };
}

/* ------------------------------------------------------------------ */
/* useAgentQueue — live queue for a specific agent                     */
/* ------------------------------------------------------------------ */

export function useAgentQueue(agentId: string | null) {
  const [queue, setQueue] = useState<AgentTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setQueue([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    getAgentQueue(agentId)
      .then(setQueue)
      .catch(() => setQueue([]))
      .finally(() => setLoading(false));
  }, [agentId]);

  // Realtime subscription
  useEffect(() => {
    if (!agentId) return;

    const sub = subscribeToAgentTasks(agentId, (task, eventType) => {
      if (eventType === "DELETE") {
        setQueue((prev) => prev.filter((t) => t.id !== task.id));
        return;
      }

      setQueue((prev) => {
        // Remove completed/failed/cancelled from queue
        if (["completed", "failed", "cancelled"].includes(task.status)) {
          return prev.filter((t) => t.id !== task.id);
        }

        const idx = prev.findIndex((t) => t.id === task.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = task;
          return next;
        }
        // New task; add and sort
        return [...prev, task].sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        });
      });
    });

    return () => sub.unsubscribe();
  }, [agentId]);

  const currentTask = queue.find(
    (t) => t.status === "working" || t.status === "acknowledged",
  );

  return { queue, currentTask, loading };
}
