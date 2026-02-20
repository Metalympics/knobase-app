"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Users,
  MessageSquare,
  Bot,
  TrendingUp,
  Clock,
} from "lucide-react";
import { listDocuments } from "@/lib/documents/store";
import { getWorkspace } from "@/lib/workspaces/store";
import { listNotifications } from "@/lib/notifications/store";
import { listTags } from "@/lib/tags/store";
import { listCollections } from "@/lib/collections/store";
import type { DocumentMeta } from "@/lib/documents/types";

interface WorkspaceAnalyticsProps {
  workspaceId: string;
}

function timeAgo(date: string): string {
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function WorkspaceAnalytics({
  workspaceId,
}: WorkspaceAnalyticsProps) {
  const [docs] = useState<DocumentMeta[]>(listDocuments);
  const [now] = useState(() => Date.now());

  const ws = getWorkspace(workspaceId);
  const notifications = useMemo(() => listNotifications(), []);
  const tags = useMemo(() => listTags(), []);
  const collections = useMemo(() => listCollections(), []);

  const stats = useMemo(() => {
    const oneWeek = 7 * 24 * 60 * 60 * 1000;
    const oneMonth = 30 * 24 * 60 * 60 * 1000;

    const recentDocs = docs.filter(
      (d) => now - new Date(d.createdAt).getTime() < oneWeek
    );
    const monthDocs = docs.filter(
      (d) => now - new Date(d.createdAt).getTime() < oneMonth
    );

    const agentNotifs = notifications.filter(
      (n) => n.type === "agent-suggestion"
    );
    const commentNotifs = notifications.filter((n) => n.type === "comment");

    return {
      totalDocs: docs.length,
      docsThisWeek: recentDocs.length,
      docsThisMonth: monthDocs.length,
      totalMembers: ws?.members.length ?? 1,
      totalComments: commentNotifs.length,
      agentSuggestions: agentNotifs.length,
      totalTags: tags.length,
      totalCollections: collections.length,
    };
  }, [docs, ws, notifications, tags, collections, now]);

  const popularDocs = useMemo(() => {
    return [...docs]
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 5);
  }, [docs]);

  const activeMembers = useMemo(() => {
    if (!ws) return [];
    return [...ws.members]
      .sort((a, b) => b.joinedAt.localeCompare(a.joinedAt))
      .slice(0, 5);
  }, [ws]);

  // Document creation histogram (last 7 days)
  const histogram = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now - i * 24 * 60 * 60 * 1000);
      const dayStr = date.toISOString().split("T")[0];
      const label = date.toLocaleDateString(undefined, { weekday: "short" });
      const count = docs.filter(
        (d) => d.createdAt.split("T")[0] === dayStr
      ).length;
      days.push({ label, count });
    }
    return days;
  }, [docs, now]);

  const maxCount = Math.max(...histogram.map((d) => d.count), 1);

  const STAT_CARDS = [
    {
      label: "Documents",
      value: stats.totalDocs,
      sub: `${stats.docsThisWeek} this week`,
      icon: <FileText className="h-4 w-4" />,
      color: "text-blue-500 bg-blue-50",
    },
    {
      label: "Members",
      value: stats.totalMembers,
      sub: `${stats.totalMembers} active`,
      icon: <Users className="h-4 w-4" />,
      color: "text-emerald-500 bg-emerald-50",
    },
    {
      label: "Comments",
      value: stats.totalComments,
      sub: "all time",
      icon: <MessageSquare className="h-4 w-4" />,
      color: "text-amber-500 bg-amber-50",
    },
    {
      label: "Agent Insights",
      value: stats.agentSuggestions,
      sub: "suggestions",
      icon: <Bot className="h-4 w-4" />,
      color: "text-purple-500 bg-purple-50",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {STAT_CARDS.map((card) => (
          <div
            key={card.label}
            className="rounded-lg border border-neutral-200 bg-white p-4"
          >
            <div className="flex items-center gap-2">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-lg ${card.color}`}
              >
                {card.icon}
              </div>
              <div>
                <p className="text-2xl font-bold text-neutral-900">
                  {card.value}
                </p>
                <p className="text-xs text-neutral-400">{card.label}</p>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-neutral-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Activity chart */}
      <div className="rounded-lg border border-neutral-200 bg-white p-4">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-neutral-400" />
          <h3 className="text-sm font-medium text-neutral-800">
            Documents Created (Last 7 Days)
          </h3>
        </div>
        <div className="flex items-end gap-2">
          {histogram.map((day) => (
            <div key={day.label} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-[10px] font-medium text-neutral-500">
                {day.count}
              </span>
              <div
                className="w-full rounded-t bg-purple-400 transition-all"
                style={{
                  height: `${Math.max((day.count / maxCount) * 80, 4)}px`,
                }}
              />
              <span className="text-[10px] text-neutral-400">
                {day.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Popular docs */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-800">
            Recently Active Documents
          </h3>
        </div>
        <div className="divide-y divide-neutral-50">
          {popularDocs.map((doc, i) => (
            <div key={doc.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="w-5 text-center text-xs font-medium text-neutral-300">
                {i + 1}
              </span>
              <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
              <span className="flex-1 truncate text-sm text-neutral-700">
                {doc.title || "Untitled"}
              </span>
              <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                <Clock className="h-2.5 w-2.5" />
                {timeAgo(doc.updatedAt)}
              </span>
            </div>
          ))}
          {popularDocs.length === 0 && (
            <p className="px-4 py-6 text-center text-xs text-neutral-400">
              No documents yet
            </p>
          )}
        </div>
      </div>

      {/* Active members */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <h3 className="text-sm font-medium text-neutral-800">
            Most Active Contributors
          </h3>
        </div>
        <div className="divide-y divide-neutral-50">
          {activeMembers.map((member, i) => (
            <div
              key={member.userId}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="w-5 text-center text-xs font-medium text-neutral-300">
                {i + 1}
              </span>
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600">
                {member.displayName.charAt(0).toUpperCase()}
              </div>
              <span className="flex-1 truncate text-sm text-neutral-700">
                {member.displayName}
              </span>
              <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium text-neutral-500">
                {member.role}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Additional stats */}
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-bold text-neutral-900">
            {stats.totalTags}
          </p>
          <p className="text-xs text-neutral-400">Tags created</p>
        </div>
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <p className="text-2xl font-bold text-neutral-900">
            {stats.totalCollections}
          </p>
          <p className="text-xs text-neutral-400">Collections</p>
        </div>
      </div>
    </div>
  );
}
