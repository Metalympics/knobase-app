"use client";

import { useState, useEffect } from "react";
import { Wifi, WifiOff, RefreshCw, Bot, Loader2 } from "lucide-react";
import {
  openClawBridge,
  type OpenClawConnectionStatus,
} from "@/lib/sync/openclaw-bridge";
import { getOpenClawConfig } from "@/lib/agents/stream-handler";

/* ------------------------------------------------------------------ */
/* Connection status indicator for the editor toolbar                 */
/* ------------------------------------------------------------------ */

export function OpenClawStatus() {
  const [status, setStatus] = useState<OpenClawConnectionStatus>("disconnected");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const cfg = getOpenClawConfig();
    setConfigured(!!cfg.endpoint);

    // Read initial status
    setStatus(openClawBridge.connectionStatus);

    const unsub = openClawBridge.onStatusChange((s) => {
      setStatus(s);
    });

    return unsub;
  }, []);

  if (!configured) return null; // Don't show anything when no endpoint is set

  return (
    <div className="flex items-center gap-1.5">
      <StatusDot status={status} />
      <StatusLabel status={status} />
      {status === "disconnected" && (
        <button
          onClick={() => openClawBridge.connect()}
          className="ml-0.5 rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          title="Reconnect to OpenClaw"
        >
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function StatusDot({ status }: { status: OpenClawConnectionStatus }) {
  const base = "h-2 w-2 rounded-full";

  switch (status) {
    case "connected":
      return <div className={`${base} bg-violet-400`} />;
    case "connecting":
      return <div className={`${base} animate-pulse bg-amber-400`} />;
    case "disconnected":
      return <div className={`${base} bg-neutral-300`} />;
    default:
      return <div className={`${base} bg-neutral-300`} />;
  }
}

function StatusLabel({ status }: { status: OpenClawConnectionStatus }) {
  switch (status) {
    case "connected":
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-violet-600">
          <Bot className="h-3 w-3" />
          OpenClaw
        </span>
      );
    case "connecting":
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-amber-500">
          <Loader2 className="h-3 w-3 animate-spin" />
          Connecting…
        </span>
      );
    case "disconnected":
      return (
        <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-400">
          <WifiOff className="h-3 w-3" />
          OpenClaw
        </span>
      );
    default:
      return null;
  }
}

/* ------------------------------------------------------------------ */
/* Compact version for tight layouts                                   */
/* ------------------------------------------------------------------ */

export function OpenClawStatusCompact() {
  const [status, setStatus] = useState<OpenClawConnectionStatus>("disconnected");
  const [configured, setConfigured] = useState(false);

  useEffect(() => {
    const cfg = getOpenClawConfig();
    setConfigured(!!cfg.endpoint);
    setStatus(openClawBridge.connectionStatus);

    const unsub = openClawBridge.onStatusChange((s) => {
      setStatus(s);
    });
    return unsub;
  }, []);

  if (!configured) return null;

  const colors: Record<OpenClawConnectionStatus, string> = {
    connected: "bg-violet-400 border-violet-500",
    connecting: "bg-amber-400 border-amber-500 animate-pulse",
    disconnected: "bg-neutral-300 border-neutral-400",
  };

  const titles: Record<OpenClawConnectionStatus, string> = {
    connected: "OpenClaw connected",
    connecting: "Connecting to OpenClaw…",
    disconnected: "OpenClaw disconnected — click to reconnect",
  };

  return (
    <button
      onClick={() => {
        if (status === "disconnected") {
          openClawBridge.connect();
        }
      }}
      className={`h-2.5 w-2.5 rounded-full border ${colors[status]}`}
      title={titles[status]}
    />
  );
}
