"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { Awareness } from "y-protocols/awareness";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type AgentCursorStatus = "idle" | "reading" | "editing" | "responding" | "thinking";

export interface AgentAwarenessState {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cursor?: { anchor: number; head: number };
  viewport?: { from: number; to: number };
  status: AgentCursorStatus;
  /** Timestamp when state was last updated */
  lastActive: number;
}

export interface AgentPresence extends AgentAwarenessState {
  /** Screen coordinates, computed client-side from document positions */
  screenPosition?: { top: number; left: number };
}

/* ------------------------------------------------------------------ */
/* Provider helpers                                                    */
/* ------------------------------------------------------------------ */

const AGENT_FIELD = "agent" as const;
const AGENTS_FIELD = "agents" as const;

/**
 * Set local agent awareness state on the Yjs awareness instance.
 * Used by the client that initiated the agent action to proxy the
 * agent's cursor position into the collaboration channel.
 */
export function setAgentAwareness(
  awareness: Awareness,
  agent: AgentAwarenessState,
) {
  const existing = awareness.getLocalState()?.[AGENTS_FIELD] as
    | Record<string, AgentAwarenessState>
    | undefined;
  awareness.setLocalStateField(AGENTS_FIELD, {
    ...(existing ?? {}),
    [agent.id]: { ...agent, lastActive: Date.now() },
  });
}

/**
 * Update just the cursor position for an active agent.
 */
export function updateAgentCursor(
  awareness: Awareness,
  agentId: string,
  cursor: { anchor: number; head: number },
) {
  const existing = awareness.getLocalState()?.[AGENTS_FIELD] as
    | Record<string, AgentAwarenessState>
    | undefined;
  if (!existing?.[agentId]) return;
  awareness.setLocalStateField(AGENTS_FIELD, {
    ...existing,
    [agentId]: {
      ...existing[agentId],
      cursor,
      lastActive: Date.now(),
    },
  });
}

/**
 * Update agent status (e.g., reading → editing → responding).
 */
export function updateAgentStatus(
  awareness: Awareness,
  agentId: string,
  status: AgentCursorStatus,
) {
  const existing = awareness.getLocalState()?.[AGENTS_FIELD] as
    | Record<string, AgentAwarenessState>
    | undefined;
  if (!existing?.[agentId]) return;
  awareness.setLocalStateField(AGENTS_FIELD, {
    ...existing,
    [agentId]: {
      ...existing[agentId],
      status,
      lastActive: Date.now(),
    },
  });
}

/**
 * Remove an agent from the awareness state.
 */
export function removeAgentAwareness(
  awareness: Awareness,
  agentId: string,
) {
  const existing = awareness.getLocalState()?.[AGENTS_FIELD] as
    | Record<string, AgentAwarenessState>
    | undefined;
  if (!existing) return;
  const { [agentId]: _, ...rest } = existing;
  awareness.setLocalStateField(AGENTS_FIELD, rest);
}

/* ------------------------------------------------------------------ */
/* Read helpers                                                        */
/* ------------------------------------------------------------------ */

/**
 * Collect all active agent awareness states from all connected clients.
 * Deduplicates by agent ID (keeps the most recently active).
 */
export function getAgentStates(awareness: Awareness): AgentPresence[] {
  const map = new Map<string, AgentAwarenessState>();

  awareness.getStates().forEach((state) => {
    // Support both single-agent "agent" field and multi-agent "agents" field
    if (state[AGENT_FIELD]) {
      const a = state[AGENT_FIELD] as AgentAwarenessState;
      const existing = map.get(a.id);
      if (!existing || a.lastActive > (existing.lastActive ?? 0)) {
        map.set(a.id, a);
      }
    }
    if (state[AGENTS_FIELD]) {
      const agents = state[AGENTS_FIELD] as Record<string, AgentAwarenessState>;
      Object.values(agents).forEach((a) => {
        const existing = map.get(a.id);
        if (!existing || a.lastActive > (existing.lastActive ?? 0)) {
          map.set(a.id, a);
        }
      });
    }
  });

  // Filter out stale agents (inactive >30s)
  const now = Date.now();
  const STALE_THRESHOLD = 30_000;

  return Array.from(map.values()).filter(
    (a) => now - a.lastActive < STALE_THRESHOLD,
  );
}

/* ------------------------------------------------------------------ */
/* React hook                                                          */
/* ------------------------------------------------------------------ */

/**
 * Hook that subscribes to agent awareness state changes.
 * Returns a live array of agents currently active in the document.
 */
export function useAgentAwareness(
  awareness: Awareness | null,
): AgentPresence[] {
  const [agents, setAgents] = useState<AgentPresence[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!awareness) {
      setAgents([]);
      return;
    }

    function update() {
      setAgents(getAgentStates(awareness!));
    }

    update();
    awareness.on("change", update);

    // Also poll to detect stale agents
    intervalRef.current = setInterval(update, 5000);

    return () => {
      awareness.off("change", update);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [awareness]);

  return agents;
}

/**
 * Hook for controlling an agent's cursor from a React component.
 * Returns functions to set/update/remove agent awareness.
 */
export function useAgentCursorControl(awareness: Awareness | null) {
  const setAgent = useCallback(
    (agent: AgentAwarenessState) => {
      if (!awareness) return;
      setAgentAwareness(awareness, agent);
    },
    [awareness],
  );

  const setCursor = useCallback(
    (agentId: string, cursor: { anchor: number; head: number }) => {
      if (!awareness) return;
      updateAgentCursor(awareness, agentId, cursor);
    },
    [awareness],
  );

  const setStatus = useCallback(
    (agentId: string, status: AgentCursorStatus) => {
      if (!awareness) return;
      updateAgentStatus(awareness, agentId, status);
    },
    [awareness],
  );

  const removeAgent = useCallback(
    (agentId: string) => {
      if (!awareness) return;
      removeAgentAwareness(awareness, agentId);
    },
    [awareness],
  );

  return { setAgent, setCursor, setStatus, removeAgent };
}
