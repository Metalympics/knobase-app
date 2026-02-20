"use client";

import { motion } from "framer-motion";
import { Wifi, WifiOff, Loader } from "lucide-react";
import type { OpenClawConnectionStatus } from "@/lib/sync/openclaw-bridge";

interface StatusBadgeProps {
  status: OpenClawConnectionStatus;
  compact?: boolean;
}

const statusConfig: Record<
  OpenClawConnectionStatus,
  { color: string; bg: string; border: string; label: string; dotColor: string }
> = {
  connected: {
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    label: "OpenClaw Connected",
    dotColor: "bg-emerald-400",
  },
  connecting: {
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    label: "Connecting...",
    dotColor: "bg-amber-400",
  },
  disconnected: {
    color: "text-neutral-500",
    bg: "bg-neutral-50",
    border: "border-neutral-200",
    label: "OpenClaw Offline",
    dotColor: "bg-neutral-300",
  },
};

export function OpenClawStatusBadge({ status, compact }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  const Icon = status === "connected" ? Wifi : status === "connecting" ? Loader : WifiOff;

  if (compact) {
    return (
      <div
        className={`flex items-center gap-1.5 rounded-full px-2 py-0.5 ${cfg.bg} ${cfg.border} border`}
        title={cfg.label}
      >
        <motion.div
          className={`h-1.5 w-1.5 rounded-full ${cfg.dotColor}`}
          animate={
            status === "connecting"
              ? { scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }
              : {}
          }
          transition={
            status === "connecting"
              ? { duration: 1.2, repeat: Infinity }
              : {}
          }
        />
        <span className={`text-[10px] font-medium ${cfg.color}`}>
          {status === "connected" ? "Synced" : status === "connecting" ? "Syncing" : "Offline"}
        </span>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex items-center gap-2 rounded-lg border ${cfg.border} ${cfg.bg} px-3 py-1.5`}
    >
      <Icon className={`h-3.5 w-3.5 ${cfg.color} ${status === "connecting" ? "animate-spin" : ""}`} />
      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
    </motion.div>
  );
}
