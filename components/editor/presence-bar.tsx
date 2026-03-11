"use client";

import { useEffect, useState } from "react";
import type { Awareness } from "y-protocols/awareness";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import type { Agent } from "@/lib/agents/types";

interface AwarenessUser {
  id: string;
  name: string;
  color: string;
}

interface PresenceBarProps {
  awareness: Awareness | null;
  currentUserId?: string;
  agent?: Agent | null;
}

export function PresenceBar({ awareness, agent }: PresenceBarProps) {
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

  if (totalOnline === 0) return null;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-1.5">
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
      <span className="text-xs text-neutral-500">
        {totalOnline} online
      </span>
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
