"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Edit3,
  LogIn,
  LogOut,
  Lightbulb,
  AlertCircle,
  CheckCircle2,
  AtSign,
  Filter,
} from "lucide-react";
import {
  agentActivity,
  type AgentActivityEntry,
  type AgentEventType,
} from "@/lib/activity/logger";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const EVENT_CONFIG: Record<
  AgentEventType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  "agent-joined": {
    icon: <LogIn className="h-3 w-3" />,
    color: "bg-emerald-100 text-emerald-600",
    label: "Joined",
  },
  "agent-left": {
    icon: <LogOut className="h-3 w-3" />,
    color: "bg-neutral-100 text-neutral-500",
    label: "Left",
  },
  "agent-edit": {
    icon: <Edit3 className="h-3 w-3" />,
    color: "bg-blue-100 text-blue-600",
    label: "Edit",
  },
  "agent-suggestion": {
    icon: <Lightbulb className="h-3 w-3" />,
    color: "bg-purple-100 text-purple-600",
    label: "Suggestion",
  },
  "agent-comment": {
    icon: <Bot className="h-3 w-3" />,
    color: "bg-amber-100 text-amber-600",
    label: "Comment",
  },
  "agent-error": {
    icon: <AlertCircle className="h-3 w-3" />,
    color: "bg-red-100 text-red-500",
    label: "Error",
  },
  "agent-task-complete": {
    icon: <CheckCircle2 className="h-3 w-3" />,
    color: "bg-emerald-100 text-emerald-600",
    label: "Complete",
  },
  "agent-mention-response": {
    icon: <AtSign className="h-3 w-3" />,
    color: "bg-purple-100 text-purple-600",
    label: "Response",
  },
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000,
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

interface AgentActivityFeedProps {
  /** Filter to specific document */
  documentId?: string;
  /** Filter to specific agent */
  agentId?: string;
  /** Max entries to show */
  limit?: number;
  /** Navigate to a document */
  onNavigate?: (documentId: string) => void;
}

export function AgentActivityFeed({
  documentId,
  agentId,
  limit = 50,
  onNavigate,
}: AgentActivityFeedProps) {
  const [entries, setEntries] = useState<AgentActivityEntry[]>([]);
  const [filterType, setFilterType] = useState<AgentEventType | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    function load() {
      let all: AgentActivityEntry[];
      if (documentId) {
        all = agentActivity.getByDocument(documentId);
      } else if (agentId) {
        all = agentActivity.getByAgent(agentId);
      } else {
        all = agentActivity.getAll();
      }
      setEntries(all.slice(0, limit));
    }

    load();

    // Subscribe to new events
    const unsub = agentActivity.onActivity(() => load());

    // Refresh every 10s
    const interval = setInterval(load, 10_000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [documentId, agentId, limit]);

  const filtered = useMemo(() => {
    if (filterType === "all") return entries;
    return entries.filter((e) => e.eventType === filterType);
  }, [entries, filterType]);

  const grouped = useMemo(() => {
    const groups: { label: string; entries: AgentActivityEntry[] }[] = [];
    const today = new Date().toDateString();
    const yesterday = new Date(Date.now() - 86_400_000).toDateString();

    let currentLabel = "";
    let currentGroup: AgentActivityEntry[] = [];

    filtered.forEach((entry) => {
      const d = new Date(entry.timestamp).toDateString();
      const label =
        d === today ? "Today" : d === yesterday ? "Yesterday" : d;

      if (label !== currentLabel) {
        if (currentGroup.length > 0) {
          groups.push({ label: currentLabel, entries: currentGroup });
        }
        currentLabel = label;
        currentGroup = [];
      }
      currentGroup.push(entry);
    });

    if (currentGroup.length > 0) {
      groups.push({ label: currentLabel, entries: currentGroup });
    }

    return groups;
  }, [filtered]);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-neutral-800">
          Agent Activity
        </h3>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition-colors ${
            showFilters || filterType !== "all"
              ? "bg-purple-50 text-purple-600"
              : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          }`}
        >
          <Filter className="h-3 w-3" />
          Filter
        </button>
      </div>

      {/* Filters */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-1 overflow-hidden"
          >
            <button
              onClick={() => setFilterType("all")}
              className={`rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                filterType === "all"
                  ? "bg-neutral-800 text-white"
                  : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
              }`}
            >
              All
            </button>
            {(Object.entries(EVENT_CONFIG) as [AgentEventType, (typeof EVENT_CONFIG)[AgentEventType]][]).map(
              ([type, config]) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors ${
                    filterType === type
                      ? "bg-neutral-800 text-white"
                      : `${config.color} hover:opacity-80`
                  }`}
                >
                  {config.icon}
                  {config.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Activity list */}
      {filtered.length === 0 ? (
        <div className="py-6 text-center">
          <Bot className="mx-auto mb-1.5 h-6 w-6 text-neutral-200" />
          <p className="text-xs text-neutral-400">No agent activity yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                {group.label}
              </p>
              <div className="space-y-1">
                {group.entries.map((entry) => {
                  const config = EVENT_CONFIG[entry.eventType];
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -4 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-neutral-50"
                    >
                      <div
                        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${config.color}`}
                      >
                        {config.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs text-neutral-700">
                          <span className="font-medium">
                            {entry.agentName}
                          </span>{" "}
                          {entry.message}
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-neutral-400">
                            {timeAgo(entry.timestamp)}
                          </span>
                          {entry.documentTitle && onNavigate && (
                            <button
                              onClick={() =>
                                onNavigate(entry.documentId!)
                              }
                              className="truncate text-[10px] text-purple-400 hover:text-purple-600"
                            >
                              {entry.documentTitle}
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
