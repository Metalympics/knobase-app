"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  MessageSquare,
  UserPlus,
  Bot,
  Edit3,
  Filter,
  X,
} from "lucide-react";
import {
  listNotifications,
  type Notification,
  type NotificationType,
} from "@/lib/notifications/store";

interface ActivityFeedProps {
  workspaceId?: string;
  onClose?: () => void;
  onNavigate?: (documentId: string) => void;
}

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ReactNode; color: string; label: string }
> = {
  mention: {
    icon: <span className="text-[10px]">@</span>,
    color: "bg-blue-100 text-blue-600",
    label: "Mentions",
  },
  comment: {
    icon: <MessageSquare className="h-3 w-3" />,
    color: "bg-amber-100 text-amber-600",
    label: "Comments",
  },
  share: {
    icon: <UserPlus className="h-3 w-3" />,
    color: "bg-emerald-100 text-emerald-600",
    label: "Shares",
  },
  "agent-suggestion": {
    icon: <Bot className="h-3 w-3" />,
    color: "bg-purple-100 text-purple-600",
    label: "Agent",
  },
  "doc-edit": {
    icon: <Edit3 className="h-3 w-3" />,
    color: "bg-neutral-100 text-neutral-600",
    label: "Edits",
  },
  "member-joined": {
    icon: <UserPlus className="h-3 w-3" />,
    color: "bg-cyan-100 text-cyan-600",
    label: "Members",
  },
  "role-changed": {
    icon: <Edit3 className="h-3 w-3" />,
    color: "bg-rose-100 text-rose-600",
    label: "Roles",
  },
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function ActivityFeed({
  onClose,
  onNavigate,
}: ActivityFeedProps) {
  const [notifications, setNotifications] = useState<Notification[]>(listNotifications);
  const [filterType, setFilterType] = useState<NotificationType | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(listNotifications());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const filtered = useMemo(() => {
    if (filterType === "all") return notifications;
    return notifications.filter((n) => n.type === filterType);
  }, [notifications, filterType]);

  const grouped = useMemo(() => {
    const groups: Record<string, Notification[]> = {};
    filtered.forEach((n) => {
      const date = new Date(n.timestamp).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      if (!groups[date]) groups[date] = [];
      groups[date].push(n);
    });
    return groups;
  }, [filtered]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
        <h3 className="text-sm font-semibold text-neutral-900">Activity</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`rounded-md p-1.5 transition-colors ${
              showFilters || filterType !== "all"
                ? "bg-purple-50 text-purple-600"
                : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
            }`}
            aria-label="Filter activity"
          >
            <Filter className="h-3.5 w-3.5" />
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-neutral-100"
          >
            <div className="flex flex-wrap gap-1.5 px-4 py-3">
              <button
                onClick={() => setFilterType("all")}
                className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  filterType === "all"
                    ? "bg-neutral-900 text-white"
                    : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                }`}
              >
                All
              </button>
              {(Object.keys(TYPE_CONFIG) as NotificationType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    filterType === type
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {TYPE_CONFIG[type].label}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <FileText className="mb-2 h-8 w-8 text-neutral-200" />
            <p className="text-sm text-neutral-400">No activity yet</p>
            <p className="mt-0.5 text-xs text-neutral-300">
              Actions will appear here
            </p>
          </div>
        ) : (
          Object.entries(grouped).map(([date, items]) => (
            <div key={date}>
              <div className="sticky top-0 z-10 bg-white/90 px-4 py-2 backdrop-blur-sm">
                <span className="text-[11px] font-medium text-neutral-400">
                  {date}
                </span>
              </div>
              {items.map((notif, i) => {
                const config = TYPE_CONFIG[notif.type];
                return (
                  <motion.button
                    key={notif.id}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.03 }}
                    onClick={() =>
                      notif.documentId && onNavigate?.(notif.documentId)
                    }
                    className={`flex w-full items-start gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 ${
                      !notif.read ? "bg-purple-50/30" : ""
                    }`}
                  >
                    <div
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${config.color}`}
                    >
                      {config.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-neutral-700">
                        {notif.actorName && (
                          <span className="font-medium">
                            {notif.actorName}{" "}
                          </span>
                        )}
                        {notif.message}
                      </p>
                      <p className="mt-0.5 text-[10px] text-neutral-400">
                        {timeAgo(notif.timestamp)}
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
