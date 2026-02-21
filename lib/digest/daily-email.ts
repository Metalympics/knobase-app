import { listDocuments } from "@/lib/documents/store";
import {
  listNotifications,
  type Notification,
} from "@/lib/notifications/store";

export interface DailyDigest {
  date: string;
  newDocuments: number;
  editedDocuments: number;
  topComments: Notification[];
  agentInsights: Notification[];
  activeMembers: string[];
  summary: string;
}

export function generateDailyDigest(): DailyDigest {
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const notifications = listNotifications();
  const docs = listDocuments();

  const recentNotifs = notifications.filter(
    (n) => new Date(n.timestamp) > oneDayAgo,
  );

  const newDocs = docs.filter((d) => new Date(d.createdAt) > oneDayAgo).length;

  const editedDocs = docs.filter(
    (d) =>
      new Date(d.updatedAt) > oneDayAgo && new Date(d.createdAt) <= oneDayAgo,
  ).length;

  const topComments = recentNotifs
    .filter((n) => n.type === "comment")
    .slice(0, 5);

  const agentInsights = recentNotifs
    .filter((n) => n.type === "agent-suggestion")
    .slice(0, 3);

  const activeMembers = [
    ...new Set(
      recentNotifs
        .map((n) => n.actorName)
        .filter((name): name is string => !!name),
    ),
  ];

  const parts: string[] = [];
  if (newDocs > 0)
    parts.push(`${newDocs} new document${newDocs > 1 ? "s" : ""} created`);
  if (editedDocs > 0)
    parts.push(`${editedDocs} document${editedDocs > 1 ? "s" : ""} updated`);
  if (topComments.length > 0)
    parts.push(
      `${topComments.length} comment${topComments.length > 1 ? "s" : ""}`,
    );
  if (agentInsights.length > 0)
    parts.push(
      `${agentInsights.length} agent insight${agentInsights.length > 1 ? "s" : ""}`,
    );

  return {
    date: now.toISOString(),
    newDocuments: newDocs,
    editedDocuments: editedDocs,
    topComments,
    agentInsights,
    activeMembers,
    summary:
      parts.length > 0 ? parts.join(", ") : "No activity in the last 24 hours",
  };
}

const DIGEST_KEY = "knobase-app:last-digest";

export function getLastDigest(): DailyDigest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DIGEST_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveDigest(digest: DailyDigest): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DIGEST_KEY, JSON.stringify(digest));
}

export function shouldGenerateDigest(): boolean {
  const last = getLastDigest();
  if (!last) return true;
  const lastDate = new Date(last.date);
  const now = new Date();
  return now.getTime() - lastDate.getTime() > 24 * 60 * 60 * 1000;
}
