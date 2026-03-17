"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Check,
  CheckCheck,
  Archive,
  Settings,
  X,
  MessageSquare,
  Bot,
  UserPlus,
  Edit3,
} from "lucide-react";
import {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  archiveAll,
  addNotification,
  onNotification,
  type Notification,
  type NotificationType,
} from "@/lib/notifications/store";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Map a DB notifications row → frontend Notification                  */
/* ------------------------------------------------------------------ */
function dbRowToNotification(row: Record<string, unknown>): Notification {
  const dbType = (row.type as string | null) ?? "message";
  const typeMap: Record<string, NotificationType> = {
    mention: "mention",
    task: "agent-completed-task",
    message: "mention",
    system: "mention",
  };
  const actorType = (row.actor_type as string) === "agent" ? "agent" : "user";
  return {
    id: row.id as string,
    type: typeMap[dbType] ?? "mention",
    message: (row.content as string) ?? "",
    read: (row.read as boolean) ?? false,
    archived: false,
    timestamp: (row.created_at as string) ?? new Date().toISOString(),
    link: (row.link as string | undefined) ?? undefined,
    actorName: (row.actor_name as string | undefined) ?? undefined,
    actorType,
    documentId: (row.document_id as string | undefined) ?? undefined,
  };
}

interface NotificationCenterProps {
  onNavigate?: (documentId: string) => void;
  onOpenSettings?: () => void;
  /** When true, renders the dropdown permanently open (for showcases/screenshots) */
  defaultOpen?: boolean;
}

const TYPE_ICONS: Record<NotificationType | string, React.ReactNode> = {
  mention: <span className="text-[10px] font-bold">@</span>,
  "agent-mentioned-you": <Bot className="h-3 w-3" />,
  "agent-completed-task": <Check className="h-3 w-3" />,
  comment: <MessageSquare className="h-3 w-3" />,
  share: <UserPlus className="h-3 w-3" />,
  "agent-suggestion": <Bot className="h-3 w-3" />,
  "doc-edit": <Edit3 className="h-3 w-3" />,
  "member-joined": <UserPlus className="h-3 w-3" />,
  "role-changed": <Edit3 className="h-3 w-3" />,
};

function timeAgo(timestamp: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(timestamp).getTime()) / 1000
  );
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function NotificationCenter({
  onNavigate,
  onOpenSettings,
  defaultOpen = false,
}: NotificationCenterProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [notifications, setNotifications] = useState<Notification[]>(listNotifications);
  const [unreadCount, setUnreadCount] = useState(getUnreadCount);
  const [toast, setToast] = useState<Notification | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const refresh = useCallback(() => {
    setNotifications(listNotifications());
    setUnreadCount(getUnreadCount());
  }, []);

  // In-memory listener (localStorage-based notifications from the same session)
  useEffect(() => {
    const unsub = onNotification((notif) => {
      refresh();
      setToast(notif);
      setTimeout(() => setToast(null), 4000);
    });
    return unsub;
  }, [refresh]);

  // Supabase Realtime subscription — picks up DB-persisted notifications
  // created by the trg_create_notification_on_mention trigger (cross-device,
  // cross-session mentions from other users and agents).
  useEffect(() => {
    const supabase = createClient();
    let userId: string | null = null;

    async function setup() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      userId = user.id;

      // Resolve the users.id (public profile) from auth_id
      const { data: profile } = await supabase
        .from("users")
        .select("id")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!profile?.id) return;
      const profileId = profile.id;

      // 1. Backfill: load existing unread notifications from DB that are not
      //    already in localStorage (identified by matching DB id).
      const { data: existing } = await supabase
        .from("notifications")
        .select("id, type, content, read, created_at, link, actor_name, actor_type, document_id")
        .eq("user_id", profileId)
        .eq("read", false)
        .order("created_at", { ascending: false })
        .limit(20);

      if (existing?.length) {
        const stored = listNotifications();
        const storedIds = new Set(stored.map((n) => n.id));
        for (const row of existing) {
          if (!storedIds.has(row.id as string)) {
            // Silently add to localStorage without showing a toast (already existed)
            addNotification(dbRowToNotification(row as Record<string, unknown>));
          }
        }
        refresh();
      }

      // 2. Real-time: subscribe to new notification rows for this user
      const channel = supabase
        .channel(`notifications:${profileId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "notifications",
            filter: `user_id=eq.${profileId}`,
          },
          (payload) => {
            const notif = dbRowToNotification(payload.new as Record<string, unknown>);
            addNotification(notif);
            // Toast is shown by the in-memory onNotification listener above
          },
        )
        .subscribe();

      return channel;
    }

    let channelCleanup: ReturnType<typeof supabase.channel> | null = null;
    setup().then((ch) => {
      if (ch) channelCleanup = ch;
    });

    return () => {
      if (channelCleanup) supabase.removeChannel(channelCleanup);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleMarkRead = useCallback(
    (id: string) => {
      markAsRead(id);
      refresh();
    },
    [refresh]
  );

  const handleMarkAllRead = useCallback(() => {
    markAllAsRead();
    refresh();
  }, [refresh]);

  const handleArchive = useCallback(
    (id: string) => {
      archiveNotification(id);
      refresh();
    },
    [refresh]
  );

  const handleArchiveAll = useCallback(() => {
    archiveAll();
    refresh();
  }, [refresh]);

  return (
    <>
      <div ref={ref} className="relative">
        <button
          onClick={() => {
            setOpen(!open);
            if (!open) refresh();
          }}
          className="relative cursor-pointer rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-purple-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.97 }}
              transition={{ duration: 0.12 }}
              className="absolute right-0 top-full z-50 mt-1 w-80 rounded-xl border border-neutral-200 bg-white shadow-xl"
            >
              <div className="flex items-center justify-between border-b border-neutral-100 px-4 py-3">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Notifications
                </h3>
                <div className="flex items-center gap-1">
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                      title="Mark all as read"
                      aria-label="Mark all as read"
                    >
                      <CheckCheck className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={handleArchiveAll}
                    className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    title="Archive all"
                    aria-label="Archive all"
                  >
                    <Archive className="h-3.5 w-3.5" />
                  </button>
                  {onOpenSettings && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        onOpenSettings();
                      }}
                      className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                      title="Notification settings"
                      aria-label="Notification settings"
                    >
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell className="mx-auto mb-2 h-6 w-6 text-neutral-200" />
                    <p className="text-xs text-neutral-400">
                      No notifications
                    </p>
                  </div>
                ) : (
                  notifications.slice(0, 20).map((notif) => {
                    const isAgent = notif.actorType === "agent";
                    return (
                      <div
                        key={notif.id}
                        className={`group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 ${
                          !notif.read ? "bg-purple-50/40" : ""
                        }`}
                      >
                        <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
                          isAgent
                            ? "bg-purple-100 text-purple-600"
                            : "bg-neutral-100 text-neutral-500"
                        }`}>
                          {TYPE_ICONS[notif.type] || TYPE_ICONS["mention"]}
                        </div>
                        <button
                          onClick={() => {
                            handleMarkRead(notif.id);
                            if (notif.documentId) {
                              onNavigate?.(notif.documentId);
                              setOpen(false);
                            }
                          }}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="text-xs leading-relaxed text-neutral-700">
                            {notif.actorName && (
                              <span className={`font-medium ${isAgent ? "text-purple-700" : ""}`}>
                                {isAgent && "🤖 "}
                                {notif.actorName}{" "}
                              </span>
                            )}
                            {notif.message}
                          </p>
                          <p className="mt-0.5 text-[10px] text-neutral-400">
                            {timeAgo(notif.timestamp)}
                          </p>
                        </button>
                        <div className="flex shrink-0 gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          {!notif.read && (
                            <button
                              onClick={() => handleMarkRead(notif.id)}
                              className="rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
                              title="Mark as read"
                              aria-label="Mark as read"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          <button
                            onClick={() => handleArchive(notif.id)}
                            className="rounded p-1 text-neutral-300 hover:bg-neutral-100 hover:text-neutral-500"
                            title="Archive"
                            aria-label="Archive"
                          >
                            <Archive className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toast notification */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20, x: 20 }}
            animate={{ opacity: 1, y: 0, x: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className={`fixed bottom-4 right-4 z-[60] flex items-start gap-3 rounded-xl border p-4 shadow-lg ${
              toast.actorType === "agent"
                ? "border-purple-200 bg-purple-50"
                : "border-neutral-200 bg-white"
            }`}
          >
            <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
              toast.actorType === "agent"
                ? "bg-purple-200 text-purple-700"
                : "bg-purple-100 text-purple-600"
            }`}>
              {TYPE_ICONS[toast.type] || TYPE_ICONS["mention"]}
            </div>
            <div className="min-w-0 max-w-xs">
              <p className="text-xs text-neutral-700">
                {toast.actorName && (
                  <span className={`font-medium ${toast.actorType === "agent" ? "text-purple-700" : ""}`}>
                    {toast.actorType === "agent" && "🤖 "}
                    {toast.actorName}{" "}
                  </span>
                )}
                {toast.message}
              </p>
            </div>
            <button
              onClick={() => setToast(null)}
              className="shrink-0 rounded p-0.5 text-neutral-400 hover:text-neutral-600"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
