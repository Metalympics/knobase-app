"use client";

import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import type { ConnectionStatus } from "@/lib/yjs/supabase-provider";
import type { SyncStatus } from "@/lib/sync/sync-engine";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import type { Agent } from "@/lib/agents/types";

interface AwarenessUser {
  id: string;
  name: string;
  color: string;
}

interface PresenceBarProps {
  awareness: Awareness | null;
  status: ConnectionStatus;
  isSynced: boolean;
  currentUserId?: string;
  agent?: Agent | null;
  /** Offline-first sync engine status */
  syncStatus?: SyncStatus;
  /** Number of pending offline operations */
  pendingCount?: number;
}

export function PresenceBar({ awareness, status, isSynced, agent, syncStatus, pendingCount }: PresenceBarProps) {
  const [users, setUsers] = useState<AwarenessUser[]>([]);

  useEffect(() => {
    if (!awareness) return;

    function updateUsers() {
      const states = awareness!.getStates();
      const active: AwarenessUser[] = [];
      states.forEach((state, clientId) => {
        if (clientId === awareness!.clientID) return;
        if (state.user) active.push(state.user as AwarenessUser);
      });
      setUsers(active);
    }

    updateUsers();
    awareness.on("change", updateUsers);
    return () => { awareness.off("change", updateUsers); };
  }, [awareness]);

  const totalOnline = users.length + (agent ? 1 : 0);

  return (
    <div className="flex items-center gap-3">
      <SyncIndicator status={status} isSynced={isSynced} syncStatus={syncStatus} pendingCount={pendingCount} />
      <div className="flex items-center -space-x-2">
        {agent && (
          <AgentAvatar
            name={agent.name}
            avatar={agent.avatar}
            color={agent.color}
            status={agent.status}
            size="sm"
          />
        )}
        {users.map((u) => (
          <UserAvatar key={u.id} user={u} />
        ))}
      </div>
      {totalOnline > 0 && (
        <span className="text-xs text-neutral-400">
          {totalOnline} collaborator{totalOnline !== 1 ? "s" : ""}
        </span>
      )}
    </div>
  );
}

function UserAvatar({ user }: { user: AwarenessUser }) {
  return (
    <div
      className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[10px] font-bold text-white"
      style={{ backgroundColor: user.color }}
      title={user.name}
    >
      {user.name.charAt(0).toUpperCase()}
    </div>
  );
}

function SyncIndicator({
  status,
  isSynced,
  syncStatus,
  pendingCount,
}: {
  status: ConnectionStatus;
  isSynced: boolean;
  syncStatus?: SyncStatus;
  pendingCount?: number;
}) {
  // Offline-first status takes priority when available
  if (syncStatus === "offline" || status === "disconnected") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-red-400" />
        <span className="text-xs font-medium text-red-500">
          Offline{pendingCount ? ` (${pendingCount})` : ""}
        </span>
      </div>
    );
  }

  if (syncStatus === "syncing" || status === "connecting" || !isSynced) {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
        <span className="text-xs font-medium text-amber-500">Syncing...</span>
      </div>
    );
  }

  if (syncStatus === "dirty") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-blue-400" />
        <span className="text-xs font-medium text-blue-500">Saving...</span>
      </div>
    );
  }

  if (syncStatus === "error") {
    return (
      <div className="flex items-center gap-1.5">
        <div className="h-2 w-2 rounded-full bg-orange-400" />
        <span className="text-xs font-medium text-orange-500">Sync error</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full bg-emerald-400" />
      <span className="text-xs font-medium text-emerald-600">Saved</span>
    </div>
  );
}
