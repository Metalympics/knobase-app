"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, Clock, Cpu } from "lucide-react";
import type { ReasoningTrace } from "@/lib/agents/types";

interface ReasoningTooltipProps {
  trace: ReasoningTrace;
  children: React.ReactNode;
}

export function ReasoningTooltip({ trace, children }: ReasoningTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group relative inline"
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <span className="border-b border-dashed border-purple-300 transition-colors group-hover:border-purple-500">
        {children}
      </span>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full left-0 z-50 mb-2 w-72 rounded-lg border border-purple-100 bg-white p-3 shadow-lg"
          >
            <div className="mb-2 flex items-center gap-1.5">
              <Brain className="h-3.5 w-3.5 text-purple-500" />
              <span className="text-xs font-semibold text-purple-600">
                {trace.agentName}&apos;s Reasoning
              </span>
            </div>

            <p className="mb-3 text-xs leading-relaxed text-neutral-600">
              {trace.reasoning}
            </p>

            <div className="flex items-center gap-3 border-t border-neutral-100 pt-2">
              <div className="flex items-center gap-1">
                <Cpu className="h-3 w-3 text-neutral-400" />
                <span className="text-[10px] text-neutral-400">{trace.model}</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-neutral-400" />
                <span className="text-[10px] text-neutral-400">
                  {formatTimestamp(trace.timestamp)}
                </span>
              </div>
              {trace.confidence != null && (
                <div className="ml-auto">
                  <span className="rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-600">
                    {Math.round(trace.confidence * 100)}% confident
                  </span>
                </div>
              )}
            </div>

            <div className="absolute -bottom-1 left-4 h-2 w-2 rotate-45 border-b border-r border-purple-100 bg-white" />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTimestamp(ts: string): string {
  try {
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMin = Math.floor(diffMs / 60000);

    if (diffMin < 1) return "just now";
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    return date.toLocaleDateString();
  } catch {
    return ts;
  }
}

interface ReasoningBadgeProps {
  trace: ReasoningTrace;
  /** When true, renders in the expanded state by default (for showcases/screenshots) */
  defaultExpanded?: boolean;
}

export function ReasoningBadge({ trace, defaultExpanded = false }: ReasoningBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className="my-1">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="inline-flex items-center gap-1.5 rounded-full border border-purple-100 bg-purple-50/50 px-2.5 py-1 text-[11px] font-medium text-purple-600 transition-colors hover:bg-purple-50"
      >
        <Brain className="h-3 w-3" />
        {trace.agentName} • {trace.model}
        <span className="text-purple-400">{isExpanded ? "▲" : "▼"}</span>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1.5 rounded-md border border-purple-100 bg-purple-50/30 px-3 py-2">
              <p className="text-xs leading-relaxed text-neutral-600">
                {trace.reasoning}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[10px] text-neutral-400">
                <span>{formatTimestamp(trace.timestamp)}</span>
                {trace.confidence != null && (
                  <span>• {Math.round(trace.confidence * 100)}% confident</span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
