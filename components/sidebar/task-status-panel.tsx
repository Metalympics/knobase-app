"use client";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  Trash2,
  FileText,
} from "lucide-react";
import { useTaskStore } from "@/lib/agents/task-store";
import type { AgentTask, TaskStatus } from "@/lib/agents/task-types";

interface TaskStatusPanelProps {
  onNavigateToTask?: (documentId: string, selection?: { from: number; to: number }) => void;
}

type FilterStatus = "all" | "active" | "completed";

const STATUS_ICONS: Record<TaskStatus, React.ReactNode> = {
  queued: <Clock className="h-3.5 w-3.5 text-neutral-400" />,
  running: <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-500" />,
  completed: <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-500" />,
  cancelled: <AlertCircle className="h-3.5 w-3.5 text-orange-500" />,
};

const STATUS_COLORS: Record<TaskStatus, string> = {
  queued: "bg-neutral-50",
  running: "bg-blue-50",
  completed: "bg-green-50",
  failed: "bg-red-50",
  cancelled: "bg-orange-50",
};

function truncateText(text: string, maxLength: number = 60): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function TaskStatusPanel({ onNavigateToTask }: TaskStatusPanelProps) {
  const { tasks, clearCompleted } = useTaskStore();
  const [isExpanded, setIsExpanded] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");

  const filteredTasks = useMemo(() => {
    let filtered = tasks;
    
    if (filterStatus === "active") {
      filtered = tasks.filter(
        (task) => task.status === "queued" || task.status === "running"
      );
    } else if (filterStatus === "completed") {
      filtered = tasks.filter(
        (task) =>
          task.status === "completed" ||
          task.status === "failed" ||
          task.status === "cancelled"
      );
    }

    return [...filtered].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
    );
  }, [tasks, filterStatus]);

  const activeTasks = useMemo(
    () => tasks.filter((task) => task.status === "queued" || task.status === "running"),
    [tasks]
  );

  const completedTasks = useMemo(
    () =>
      tasks.filter(
        (task) =>
          task.status === "completed" ||
          task.status === "failed" ||
          task.status === "cancelled"
      ),
    [tasks]
  );

  const handleTaskClick = useCallback(
    (task: AgentTask) => {
      if (onNavigateToTask) {
        onNavigateToTask(task.documentId, task.selection);
      }
    },
    [onNavigateToTask]
  );

  const handleClearCompleted = useCallback(() => {
    clearCompleted();
  }, [clearCompleted]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div className="py-2">
      <div
        className="flex cursor-pointer items-center justify-between px-4 pb-1 transition-colors hover:bg-neutral-50"
        onClick={toggleExpand}
      >
        <div className="flex items-center gap-2">
          <ChevronRight
            className={`h-3 w-3 text-neutral-400 transition-transform ${
              isExpanded ? "rotate-90" : ""
            }`}
          />
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Agent Tasks
          </span>
          {activeTasks.length > 0 && (
            <span className="flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-500 px-1 text-[9px] font-bold text-white">
              {activeTasks.length}
            </span>
          )}
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-b border-neutral-100 px-2 pb-2">
              <div className="flex gap-1 rounded-md bg-neutral-100 p-0.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterStatus("all");
                  }}
                  className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                    filterStatus === "all"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  All ({tasks.length})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterStatus("active");
                  }}
                  className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                    filterStatus === "active"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Active ({activeTasks.length})
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFilterStatus("completed");
                  }}
                  className={`flex-1 rounded px-2 py-1 text-[10px] font-medium transition-colors ${
                    filterStatus === "completed"
                      ? "bg-white text-neutral-900 shadow-sm"
                      : "text-neutral-500 hover:text-neutral-700"
                  }`}
                >
                  Done ({completedTasks.length})
                </button>
              </div>
            </div>

            <div className="max-h-96 overflow-y-auto px-2">
              {filteredTasks.length === 0 ? (
                <div className="py-6 text-center">
                  <Clock className="mx-auto mb-2 h-5 w-5 text-neutral-200" />
                  <p className="text-[10px] text-neutral-400">
                    {filterStatus === "all"
                      ? "No tasks yet"
                      : filterStatus === "active"
                      ? "No active tasks"
                      : "No completed tasks"}
                  </p>
                </div>
              ) : (
                <div className="space-y-1 py-1">
                  {filteredTasks.map((task) => (
                    <button
                      key={task.id}
                      onClick={() => handleTaskClick(task)}
                      className={`group flex w-full flex-col gap-1.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-100 ${
                        STATUS_COLORS[task.status]
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className="mt-0.5 shrink-0">
                          {STATUS_ICONS[task.status]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <FileText className="h-3 w-3 shrink-0 text-neutral-400" />
                            <span className="truncate text-xs font-medium text-neutral-700">
                              {task.documentTitle || "Untitled"}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-neutral-500">
                            {truncateText(task.prompt)}
                          </p>
                          {task.error && (
                            <p className="mt-1 text-[10px] leading-relaxed text-red-600">
                              Error: {truncateText(task.error, 80)}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-[9px] text-neutral-400">
                          {timeAgo(task.updatedAt)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 pl-6">
                        <span className="rounded bg-neutral-100 px-1.5 py-0.5 text-[9px] font-medium text-neutral-600">
                          {task.type}
                        </span>
                        <span className="text-[9px] text-neutral-400">
                          {task.agent.model}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {completedTasks.length > 0 && (
              <div className="border-t border-neutral-100 px-2 pt-2 pb-1">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClearCompleted();
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear Completed Tasks
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
