"use client";

import Image from "next/image";

interface PresenceEntry {
  id: string;
  name: string;
  color: string;
  avatar?: string;
}

const MOCK_PRESENCE: PresenceEntry[] = [
  { id: "strategy-lead", name: "Strategy Lead", color: "#7C3AED", avatar: "/strategy-lead.svg" },
  { id: "data-analyst", name: "Data Analyst", color: "#2563EB", avatar: "/data-analyst.svg" },
  { id: "openclaw", name: "OpenClaw", color: "#E94560", avatar: "/openclaw.png" },
  { id: "demo-sarah", name: "Sarah", color: "#10B981", avatar: "/avatar-sarah.svg" },
  { id: "demo-alex", name: "Alex", color: "#3B82F6", avatar: "/avatar-alex.svg" },
  { id: "demo-chris", name: "Chris", color: "#3B82F6" },
];

interface PresenceBarCardProps {
  syncStatus?: "saved" | "saving" | "offline";
}

export function PresenceBarCard({ syncStatus = "saved" }: PresenceBarCardProps) {
  const statusConfig = {
    saved: { dot: "bg-emerald-500", label: "Saved", text: "text-emerald-600" },
    saving: { dot: "bg-blue-500 animate-pulse", label: "Saving...", text: "text-blue-600" },
    offline: { dot: "bg-red-500", label: "Offline", text: "text-red-600" },
  }[syncStatus];

  return (
    <div className="flex items-center gap-3 px-4 py-2 rounded-lg border border-neutral-200 bg-white w-fit">
      {/* Sync status */}
      <div className="flex items-center gap-1.5">
        <div className={`h-2 w-2 rounded-full ${statusConfig.dot}`} />
        <span className={`text-xs font-medium ${statusConfig.text}`}>{statusConfig.label}</span>
      </div>

      <div className="w-px h-4 bg-neutral-200" />

      {/* Avatar stack */}
      <div className="flex items-center -space-x-2">
        {MOCK_PRESENCE.map((entry) => (
          <div
            key={entry.id}
            title={entry.name}
            className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-white text-[10px] font-bold text-white"
            style={{ backgroundColor: entry.color }}
          >
            {entry.avatar ? (
              <Image
                src={entry.avatar}
                alt={entry.name}
                width={24}
                height={24}
                className="h-full w-full object-cover"
              />
            ) : (
              entry.name.charAt(0)
            )}
          </div>
        ))}
      </div>

      <span className="text-xs text-neutral-500">{MOCK_PRESENCE.length} online</span>
    </div>
  );
}
