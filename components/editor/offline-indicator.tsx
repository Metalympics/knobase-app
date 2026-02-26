"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Cloud,
  CloudOff,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { useSyncStatus } from "@/hooks/use-sync";
import { getSyncEngine } from "@/lib/sync/sync-engine";
import { getPendingOpsCount, getStorageEstimate } from "@/lib/offline/db";

/* ------------------------------------------------------------------ */
/* Offline Indicator                                                   */
/* ------------------------------------------------------------------ */

export function OfflineIndicator() {
  const { status, isOnline, pendingCount } = useSyncStatus();
  const [pendingOps, setPendingOps] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [storage, setStorage] = useState({ usedMB: 0, totalMB: 0, percent: 0 });

  // Poll pending ops count
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    const update = async () => {
      try {
        const count = await getPendingOpsCount();
        setPendingOps(count);
      } catch { /* */ }
    };
    update();
    interval = setInterval(update, 5_000);
    return () => clearInterval(interval);
  }, []);

  // Get storage estimate when expanded
  useEffect(() => {
    if (!expanded) return;
    getStorageEstimate().then((est) => {
      setStorage({
        usedMB: Math.round(est.usedBytes / 1_048_576),
        totalMB: Math.round(est.totalBytes / 1_048_576),
        percent: Math.round(est.percentUsed * 10) / 10,
      });
    }).catch(() => {});
  }, [expanded]);

  const handleForceSync = useCallback(async () => {
    try {
      await getSyncEngine().forceFlush();
    } catch {
      /* best-effort */
    }
  }, []);

  const totalPending = pendingOps + pendingCount;

  const icon = getStatusIcon(status, isOnline);
  const label = getStatusLabel(status, isOnline, totalPending);
  const color = getStatusColor(status, isOnline);

  return (
    <div className="relative">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors hover:bg-neutral-100 dark:hover:bg-neutral-800 ${color}`}
        title="Sync status"
      >
        {icon}
        <span>{label}</span>
        {totalPending > 0 && (
          <span className="ml-0.5 rounded-full bg-neutral-200 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums dark:bg-neutral-700">
            {totalPending}
          </span>
        )}
      </button>

      {expanded && (
        <div className="absolute right-0 top-full z-50 mt-1 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          <div className="space-y-3">
            {/* Connection status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Connection</span>
              <span className={`text-xs font-medium ${isOnline ? "text-emerald-600" : "text-red-500"}`}>
                {isOnline ? "Online" : "Offline"}
              </span>
            </div>

            {/* Sync status */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Sync</span>
              <span className={`text-xs font-medium ${color}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </span>
            </div>

            {/* Pending operations */}
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-500">Pending ops</span>
              <span className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                {totalPending}
              </span>
            </div>

            {/* Storage usage */}
            <div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-xs text-neutral-500">
                  <HardDrive className="h-3 w-3" />
                  Storage
                </span>
                <span className="text-xs text-neutral-500">
                  {storage.usedMB}MB / {storage.totalMB > 0 ? `${storage.totalMB}MB` : "∞"}
                </span>
              </div>
              {storage.totalMB > 0 && (
                <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(storage.percent, 100)}%` }}
                  />
                </div>
              )}
            </div>

            {/* Force sync button */}
            <button
              onClick={handleForceSync}
              disabled={!isOnline || status === "syncing"}
              className="flex w-full items-center justify-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 transition-colors hover:bg-neutral-50 disabled:opacity-40 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
            >
              <RefreshCw className={`h-3 w-3 ${status === "syncing" ? "animate-spin" : ""}`} />
              Force Sync
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function getStatusIcon(status: string, isOnline: boolean) {
  if (!isOnline || status === "offline") {
    return <CloudOff className="h-3.5 w-3.5" />;
  }
  if (status === "syncing") {
    return <Loader2 className="h-3.5 w-3.5 animate-spin" />;
  }
  if (status === "error") {
    return <AlertTriangle className="h-3.5 w-3.5" />;
  }
  if (status === "synced") {
    return <CheckCircle2 className="h-3.5 w-3.5" />;
  }
  return <Cloud className="h-3.5 w-3.5" />;
}

function getStatusLabel(status: string, isOnline: boolean, pending: number): string {
  if (!isOnline || status === "offline") return "Offline";
  if (status === "syncing") return "Syncing";
  if (status === "dirty") return "Saving";
  if (status === "error") return "Error";
  if (status === "synced") return "Saved";
  if (pending > 0) return "Pending";
  return "Saved";
}

function getStatusColor(status: string, isOnline: boolean): string {
  if (!isOnline || status === "offline") return "text-red-500";
  if (status === "syncing" || status === "dirty") return "text-amber-500";
  if (status === "error") return "text-orange-500";
  return "text-emerald-600";
}
