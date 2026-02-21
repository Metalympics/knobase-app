"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Loader2, X, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import type { AgentTask } from "@/lib/agents/task-types";
import { useState } from "react";

interface PendingBlockProps {
  task: AgentTask;
  onCancel: (taskId: string) => void;
}

export function PendingBlock({ task, onCancel }: PendingBlockProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showFullCommand, setShowFullCommand] = useState(false);

  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.slice(0, maxLength) + "...";
  };

  const getStatusText = (status: AgentTask["status"]) => {
    switch (status) {
      case "queued":
        return "Queued";
      case "running":
        return "Loading...";
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

  // Arbitrary color assignment - agents are collaborators like humans
  // Just colors to distinguish concurrent tasks, no provider branding
  const getAvatarGradient = () => {
    const gradients = [
      "from-indigo-400 to-purple-500",
      "from-blue-400 to-cyan-500",
      "from-emerald-400 to-lime-500",
      "from-yellow-400 to-amber-500",
      "from-rose-400 to-pink-500",
      "from-violet-400 to-fuchsia-500",
      "from-cyan-400 to-indigo-500",
      "from-lime-400 to-emerald-500",
    ];
    // Use task ID to consistently assign same color to same task
    const index = task.id.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  const getAvatarInitials = () => {
    // Generic initials - agents are collaborators, not branded by provider
    return "A";
  };

  const isInProgress = task.status === "queued" || task.status === "running";
  const isCompleted = task.status === "completed";
  const isFailed = task.status === "failed";

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, height: 0 }}
      animate={{ opacity: 1, y: 0, height: "auto" }}
      exit={{ opacity: 0, scale: 0.95, height: 0 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative inline-block w-full my-2"
    >
      <div
        className={`
          relative flex items-center gap-3 rounded-lg border px-4 py-3
          transition-all duration-200
          ${isInProgress ? "bg-blue-50/50 border-blue-200/60 hover:bg-blue-50/80" : ""}
          ${isCompleted ? "bg-green-50/40 border-green-200/60" : ""}
          ${isFailed ? "bg-red-50/40 border-red-200/60" : ""}
          ${!isInProgress && !isCompleted && !isFailed ? "bg-neutral-50/50 border-neutral-200/60" : ""}
          hover:shadow-sm
        `}
      >
        {/* Agent Avatar */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="flex-shrink-0"
        >
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            bg-gradient-to-br ${getAvatarGradient()}
            shadow-sm
          `}>
            <span className="text-white text-xs font-semibold">
              {getAvatarInitials()}
            </span>
          </div>
        </motion.div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-neutral-900">
              Agent
            </span>
            <span className="text-neutral-300">•</span>
            <div className="flex items-center gap-1.5">
              {isInProgress && task.status === "queued" && (
                <motion.div
                  className="flex items-center gap-1 text-xs text-neutral-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                  </span>
                  <span>{getStatusText(task.status)}</span>
                </motion.div>
              )}
              {isInProgress && task.status === "running" && (
                <motion.div
                  className="flex items-center gap-1.5 text-xs text-neutral-600"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                >
                  <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                  <span className="animate-pulse">{getStatusText(task.status)}</span>
                </motion.div>
              )}
              {isCompleted && (
                <div className="flex items-center gap-1 text-xs text-green-700">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{getStatusText(task.status)}</span>
                </div>
              )}
              {isFailed && (
                <div className="flex items-center gap-1 text-xs text-red-700">
                  <AlertCircle className="h-3 w-3" />
                  <span>{getStatusText(task.status)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Command Text */}
          <div className="relative">
            <motion.p
              className="text-sm text-neutral-700 leading-relaxed"
              animate={{ opacity: isHovered ? 0.8 : 1 }}
            >
              {showFullCommand || isHovered ? task.prompt : truncateText(task.prompt, 60)}
            </motion.p>

            {/* Tooltip on hover for long commands */}
            <AnimatePresence>
              {isHovered && task.prompt.length > 60 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  className="absolute top-full left-0 mt-2 p-2 bg-neutral-900 text-white text-xs rounded-md shadow-lg max-w-md z-10"
                >
                  {task.prompt}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress Bar */}
          {isInProgress && (
            <motion.div
              initial={{ opacity: 0, scaleX: 0 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.2 }}
              className="mt-2 h-1 bg-neutral-200 rounded-full overflow-hidden"
            >
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                initial={{ x: "-100%" }}
                animate={{ x: "100%" }}
                transition={{
                  repeat: Infinity,
                  duration: 1.5,
                  ease: "easeInOut",
                }}
                style={{ width: "40%" }}
              />
            </motion.div>
          )}

          {/* Error Message */}
          {isFailed && task.error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-2 text-xs text-red-600 bg-red-50 px-2 py-1 rounded border border-red-200"
            >
              {task.error}
            </motion.div>
          )}
        </div>

        {/* Cancel Button */}
        {isInProgress && (
          <motion.button
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: isHovered ? 1 : 0.6, scale: 1 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => onCancel(task.id)}
            className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center
                     bg-white border border-neutral-200 text-neutral-500
                     hover:bg-red-50 hover:border-red-300 hover:text-red-600
                     transition-all duration-200 shadow-sm"
            aria-label="Cancel task"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </div>
    </motion.div>
  );
}
