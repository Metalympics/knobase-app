export type NotificationType =
  | "mention"
  | "comment"
  | "share"
  | "agent-suggestion"
  | "doc-edit"
  | "member-joined"
  | "role-changed";

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  read: boolean;
  archived: boolean;
  timestamp: string;
  link?: string;
  actorName?: string;
  documentId?: string;
}

const LS_KEY = "knobase-app:notifications";

function readAll(): Notification[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAll(notifs: Notification[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(notifs));
}

export function listNotifications(): Notification[] {
  return readAll()
    .filter((n) => !n.archived)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function getUnreadCount(): number {
  return readAll().filter((n) => !n.read && !n.archived).length;
}

export function addNotification(
  partial: Omit<Notification, "id" | "read" | "archived" | "timestamp">
): Notification {
  const notif: Notification = {
    ...partial,
    id: crypto.randomUUID(),
    read: false,
    archived: false,
    timestamp: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(notif);
  // Keep last 100
  writeAll(all.slice(0, 100));
  dispatchNotificationEvent(notif);
  return notif;
}

export function markAsRead(id: string): void {
  const all = readAll();
  const n = all.find((x) => x.id === id);
  if (n) {
    n.read = true;
    writeAll(all);
  }
}

export function markAllAsRead(): void {
  const all = readAll();
  all.forEach((n) => (n.read = true));
  writeAll(all);
}

export function archiveNotification(id: string): void {
  const all = readAll();
  const n = all.find((x) => x.id === id);
  if (n) {
    n.archived = true;
    writeAll(all);
  }
}

export function archiveAll(): void {
  const all = readAll();
  all.forEach((n) => (n.archived = true));
  writeAll(all);
}

export function deleteNotification(id: string): void {
  writeAll(readAll().filter((n) => n.id !== id));
}

type NotificationListener = (notif: Notification) => void;
const listeners = new Set<NotificationListener>();

export function onNotification(cb: NotificationListener): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function dispatchNotificationEvent(notif: Notification) {
  listeners.forEach((cb) => cb(notif));
}

export interface NotificationPreferences {
  mentions: boolean;
  comments: boolean;
  shares: boolean;
  agentSuggestions: boolean;
  docEdits: boolean;
}

const PREFS_KEY = "knobase-app:notification-prefs";

export function getNotificationPreferences(): NotificationPreferences {
  if (typeof window === "undefined")
    return {
      mentions: true,
      comments: true,
      shares: true,
      agentSuggestions: true,
      docEdits: false,
    };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    return raw
      ? JSON.parse(raw)
      : {
          mentions: true,
          comments: true,
          shares: true,
          agentSuggestions: true,
          docEdits: false,
        };
  } catch {
    return {
      mentions: true,
      comments: true,
      shares: true,
      agentSuggestions: true,
      docEdits: false,
    };
  }
}

export function setNotificationPreferences(
  prefs: NotificationPreferences
): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}
