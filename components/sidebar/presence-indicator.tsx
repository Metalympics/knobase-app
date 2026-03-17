"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";

export interface PresenceUser {
  id: string;
  name?: string;
  presence_status: PresenceStatus;
  last_seen_at: string | null;
  type: "human" | "agent";
}

interface PresenceIndicatorProps {
  user: PresenceUser;
  showDetails?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const HUMAN_AWAY_THRESHOLD_MS = 5 * 60_000;
const AGENT_OFFLINE_THRESHOLD_MS = 2 * 60_000;

function deriveStatus(user: PresenceUser): PresenceStatus {
  if (user.presence_status === "online") return "online";
  if (user.presence_status === "away") return "away";

  if (user.type === "human" && user.last_seen_at) {
    const elapsed = Date.now() - new Date(user.last_seen_at).getTime();
    if (elapsed < HUMAN_AWAY_THRESHOLD_MS) return "away";
  }

  if (user.type === "agent" && user.last_seen_at) {
    const elapsed = Date.now() - new Date(user.last_seen_at).getTime();
    if (elapsed < AGENT_OFFLINE_THRESHOLD_MS) return "online";
  }

  return "offline";
}

function statusLabel(status: PresenceStatus, userType: "human" | "agent"): string {
  if (status === "online") return "Online";
  if (status === "away") return "Away";
  return userType === "agent" ? "Inactive" : "Offline";
}

function timeSince(dateStr: string | null): string | null {
  if (!dateStr) return null;
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SIZE_CLASSES = {
  sm: "h-2 w-2",
  md: "h-2.5 w-2.5",
  lg: "h-3 w-3",
} as const;

export function PresenceIndicator({
  user,
  showDetails = false,
  className,
  size = "md",
}: PresenceIndicatorProps) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const status = useMemo(() => deriveStatus(user), [user]);

  const dotColor =
    status === "online"
      ? "bg-green-500"
      : status === "away"
        ? "bg-yellow-400"
        : user.type === "agent"
          ? "bg-red-500"
          : "bg-neutral-300";

  const ringColor =
    status === "online"
      ? "ring-green-500/20"
      : status === "away"
        ? "ring-yellow-400/20"
        : user.type === "agent"
          ? "ring-red-500/20"
          : "ring-neutral-300/20";

  const label = statusLabel(status, user.type);
  const lastSeen = timeSince(user.last_seen_at);

  return (
    <span
      className={cn("relative inline-flex items-center", className)}
      onMouseEnter={() => showDetails && setTooltipVisible(true)}
      onMouseLeave={() => setTooltipVisible(false)}
    >
      <span
        className={cn(
          "inline-block rounded-full ring-2",
          SIZE_CLASSES[size],
          dotColor,
          ringColor,
          status === "online" && "animate-pulse",
        )}
        aria-label={`${user.name ?? user.type} is ${label.toLowerCase()}`}
      />

      {showDetails && tooltipVisible && (
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-neutral-900 px-2.5 py-1.5 text-[11px] leading-tight text-white shadow-lg">
          <span className="flex flex-col gap-0.5">
            <span className="font-medium">
              {user.name ?? (user.type === "agent" ? "Agent" : "User")}
            </span>
            <span className="text-neutral-400">
              {label}
              {status !== "online" && lastSeen && (
                <> &middot; Last seen {lastSeen}</>
              )}
            </span>
          </span>
          <span className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-neutral-900" />
        </span>
      )}
    </span>
  );
}
