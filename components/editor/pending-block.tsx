"use client";

import { motion } from "framer-motion";
import { Loader2, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { AgentTask } from "@/lib/agents/task-types";

interface PendingBlockProps {
  task: AgentTask;
  onCancel: (taskId: string) => void;
}

export function PendingBlock({ task, onCancel }: PendingBlockProps) {
  const getStatusText = (status: AgentTask["status"]) => {
    switch (status) {
      case "queued":
        return "Queued...";
      case "running":
        return "Processing...";
      case "completed":
        return "Complete";
      case "failed":
        return "Failed";
      case "cancelled":
        return "Cancelled";
      default:
        return "Unknown";
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case "queued":
        return <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-500" />;
      case "running":
        return <Sparkles className="h-3.5 w-3.5 animate-pulse text-purple-500" />;
      case "completed":
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />;
      case "failed":
        return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
      case "cancelled":
        return <AlertCircle className="h-3.5 w-3.5 text-neutral-400" />;
      default:
        return null;
    }
  };

  const getBorderColor = () => {
    switch (task.status) {
      case "queued":
        return "border-neutral-200";
      case "running":
        return "border-purple-200";
      case "completed":
        return "border-green-200";
      case "failed":
        return "border-red-200";
      case "cancelled":
        return "border-neutral-200";
      default:
        return "border-neutral-200";
    }
  };

  const getBackgroundColor = () => {
    switch (task.status) {
      case "queued":
        return "bg-neutral-50";
      case "running":
        return "bg-purple-50";
      case "completed":
        return "bg-green-50";
      case "failed":
        return "bg-red-50";
      case "cancelled":
        return "bg-neutral-50";
      default:
        return "bg-neutral-50";
    }
  };

  const isInProgress = task.status === "queued" || task.status === "running";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      className={`inline-flex items-center gap-2 rounded-md border ${getBorderColor()} ${getBackgroundColor()} px-3 py-1.5 shadow-sm`}
    >
      {getStatusIcon()}
      
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-neutral-700">
            {task.agent.model}
          </span>
          <span className="text-xs text-neutral-500">
            {getStatusText(task.status)}
          </span>
        </div>

        {task.status === "completed" && task.result && (
          <div className="max-w-md text-xs text-neutral-600">
            {task.result}
          </div>
        )}

        {task.status === "failed" && task.error && (
          <div className="max-w-md text-xs text-red-600">
            {task.error}
          </div>
        )}
      </div>

      {isInProgress && (
        <button
          onClick={() => onCancel(task.id)}
          className="ml-1 rounded-sm p-0.5 text-neutral-400 transition-colors hover:bg-neutral-200 hover:text-neutral-600"
          aria-label="Cancel task"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </motion.div>
  );
}
