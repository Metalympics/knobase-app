"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListTodo,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  AlertTriangle,
  RotateCcw,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentTasks } from "@/hooks/use-agent-tasks";
import type { AgentTask } from "@/lib/supabase/types";

const INACTIVE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 0) return "just now";
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function isInactive(task: AgentTask): boolean {
  if (task.status !== "working" && task.status !== "acknowledged") return false;
  const lastActivity = task.last_activity_at ?? task.created_at;
  return Date.now() - new Date(lastActivity).getTime() > INACTIVE_THRESHOLD_MS;
}

/* ------------------------------------------------------------------ */
/* Status helpers                                                      */
/* ------------------------------------------------------------------ */

const statusConfig = {
  pending: {
    label: "Pending",
    icon: Clock,
    color: "text-yellow-500",
    bg: "bg-yellow-500/10",
  },
  acknowledged: {
    label: "Starting",
    icon: Loader2,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
  },
  working: {
    label: "Working",
    icon: Loader2,
    color: "text-blue-500",
    bg: "bg-blue-500/10",
  },
  completed: {
    label: "Done",
    icon: CheckCircle2,
    color: "text-green-500",
    bg: "bg-green-500/10",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-red-500",
    bg: "bg-red-500/10",
  },
  cancelled: {
    label: "Cancelled",
    icon: X,
    color: "text-neutral-400",
    bg: "bg-neutral-500/10",
  },
} as const;

function StatusBadge({ status }: { status: AgentTask["status"] }) {
  const cfg = statusConfig[status];
  const Icon = cfg.icon;
  const spin = status === "working" || status === "acknowledged";

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <Icon className={`size-3 ${spin ? "animate-spin" : ""}`} />
      {cfg.label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Progress bar                                                        */
/* ------------------------------------------------------------------ */

function ProgressBar({ progress }: { progress: number }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
      <motion.div
        className="h-full rounded-full bg-blue-500"
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Single task row                                                     */
/* ------------------------------------------------------------------ */

function TaskRow({
  task,
  onCancel,
  onRetry,
  onNudge,
}: {
  task: AgentTask;
  onCancel: (id: string) => void;
  onRetry?: (id: string) => void;
  onNudge?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isActive = task.status === "working" || task.status === "acknowledged";
  const canCancel = task.status === "pending" || isActive;
  const inactive = isInactive(task);
  const lastActivity = task.last_activity_at ?? task.created_at;

  return (
    <div className="group rounded-lg border border-neutral-200 bg-white p-3 dark:border-neutral-700 dark:bg-neutral-800/50">
      {/* Header row */}
      <div className="flex items-start gap-2">
        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-0.5 shrink-0 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300"
        >
          {expanded ? (
            <ChevronDown className="size-4" />
          ) : (
            <ChevronRight className="size-4" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <StatusBadge status={task.status} />
            {inactive && (
              <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-xs font-medium text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3" />
                Inactive
              </span>
            )}
            <span className="truncate text-sm font-medium text-neutral-900 dark:text-neutral-100">
              {task.title}
            </span>
          </div>

          {/* Last activity for active tasks */}
          {isActive && (
            <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">
              Last activity {relativeTime(lastActivity)}
            </p>
          )}

          {/* Progress for active tasks */}
          {isActive && task.progress_percent > 0 && (
            <div className="mt-1">
              <ProgressBar progress={task.progress_percent} />
              {task.current_action && (
                <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                  {task.current_action}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {/* Nudge button for inactive tasks */}
          {inactive && onNudge && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-amber-500 hover:text-amber-600"
              onClick={() => onNudge(task.id)}
              title="Nudge agent — re-send task notification"
            >
              <Bell className="size-3" />
            </Button>
          )}

          {/* Retry button for failed tasks */}
          {task.status === "failed" && onRetry && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="text-blue-500 hover:text-blue-600"
              onClick={() => onRetry(task.id)}
              title="Retry task"
            >
              <RotateCcw className="size-3" />
            </Button>
          )}

          {/* Cancel button */}
          {canCancel && (
            <Button
              variant="ghost"
              size="icon-xs"
              className="shrink-0 opacity-0 group-hover:opacity-100"
              onClick={() => onCancel(task.id)}
              title="Cancel task"
            >
              <X className="size-3" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-2 space-y-1 border-t border-neutral-100 pt-2 text-xs text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
              <p>
                <span className="font-medium">Type:</span> {task.task_type}
              </p>
              {task.agent_id && (
                <p>
                  <span className="font-medium">Agent:</span> {task.agent_id}
                </p>
              )}
              {task.priority !== undefined && (
                <p>
                  <span className="font-medium">Priority:</span> {task.priority}
                </p>
              )}
              {task.result_summary && (
                <p>
                  <span className="font-medium">Result:</span>{" "}
                  {task.result_summary}
                </p>
              )}
              {task.error_message && (
                <p className="text-red-400">
                  <span className="font-medium">Error:</span>{" "}
                  {task.error_message}
                </p>
              )}
              <p className="tabular-nums">
                Created{" "}
                {new Date(task.created_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TaskQueuePanel — main exported component                            */
/* ------------------------------------------------------------------ */

interface TaskQueuePanelProps {
  documentId: string;
  className?: string;
}

export function TaskQueuePanel({ documentId, className }: TaskQueuePanelProps) {
  const { tasks, pending, working, completed, failed, loading, cancel } =
    useDocumentTasks(documentId);
  const [showCompleted, setShowCompleted] = useState(false);
  const [, setTick] = useState(0);

  // Re-render every 30s so relative timestamps stay fresh
  useEffect(() => {
    const iv = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(iv);
  }, []);

  const handleRetry = useCallback(async (taskId: string) => {
    try {
      await fetch(`/api/v1/agents/tasks/${taskId}/nudge`, { method: "POST" });
    } catch { /* best effort */ }
  }, []);

  const handleNudge = useCallback(async (taskId: string) => {
    try {
      await fetch(`/api/v1/agents/tasks/${taskId}/nudge`, { method: "POST" });
    } catch { /* best effort */ }
  }, []);

  const activeTasks = [...working, ...pending];
  const doneTasks = showCompleted ? [...completed, ...failed] : [];

  if (loading) {
    return (
      <div className={`flex items-center justify-center p-6 ${className ?? ""}`}>
        <Loader2 className="size-5 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (tasks.length === 0) return null;

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-sm font-semibold text-neutral-700 dark:text-neutral-300">
          <ListTodo className="size-4" />
          Agent Queue
          {activeTasks.length > 0 && (
            <span className="ml-1 rounded-full bg-blue-500/10 px-1.5 py-0.5 text-xs font-medium text-blue-500">
              {activeTasks.length}
            </span>
          )}
        </h3>

        {(completed.length > 0 || failed.length > 0) && (
          <Button
            variant="ghost"
            size="xs"
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? "Hide" : "Show"} completed ({completed.length + failed.length})
          </Button>
        )}
      </div>

      {/* Active tasks */}
      <div className="space-y-2">
        <AnimatePresence mode="popLayout">
          {activeTasks.map((task) => (
            <motion.div
              key={task.id}
              layout
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              <TaskRow
                task={task}
                onCancel={cancel}
                onNudge={handleNudge}
                onRetry={handleRetry}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Completed/failed tasks */}
      {doneTasks.length > 0 && (
        <div className="space-y-2 opacity-60">
          {doneTasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onCancel={cancel}
              onRetry={handleRetry}
            />
          ))}
        </div>
      )}
    </div>
  );
}
