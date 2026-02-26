"use client";

import { useEffect, useRef } from "react";
import type { SupabaseProvider } from "@/lib/yjs/supabase-provider";
import {
  openClawBridge,
  type OpenClawAwarenessPayload,
} from "@/lib/sync/openclaw-bridge";
import { agentActivity } from "@/lib/activity/logger";

/**
 * Hook that connects the OpenClaw bridge's awareness messages to the
 * Yjs awareness protocol, so agent cursor positions received from
 * OpenClaw are reflected in the collaborative editing session.
 *
 * Usage: call once in the editor page component when provider is ready.
 *
 * ```tsx
 * useOpenClawAwarenessRelay(provider, documentId);
 * ```
 */
export function useOpenClawAwarenessRelay(
  provider: SupabaseProvider | null,
  documentId: string,
) {
  const activeAgents = useRef(new Set<string>());

  useEffect(() => {
    if (!provider) return;

    const unsubAwareness = openClawBridge.onAwareness(
      (payload: OpenClawAwarenessPayload) => {
        // Set the agent's awareness state on our provider so it
        // propagates to all connected peers via Yjs awareness protocol.
        provider.setAgentState({
          id: payload.agentId,
          name: payload.name,
          avatar: payload.avatar,
          color: payload.color,
          cursor: payload.cursor,
          status: payload.status,
        });

        // Track agent joins
        if (!activeAgents.current.has(payload.agentId)) {
          activeAgents.current.add(payload.agentId);
          agentActivity.logJoin(
            payload.agentId,
            payload.name,
            documentId,
          );
        }
      },
    );

    // When the bridge disconnects, remove all agent cursors
    const unsubStatus = openClawBridge.onStatusChange((status) => {
      if (status === "disconnected") {
        activeAgents.current.forEach((agentId) => {
          provider.removeAgentState(agentId);
          agentActivity.logLeave(agentId, agentId, documentId);
        });
        activeAgents.current.clear();
      }
    });

    return () => {
      unsubAwareness();
      unsubStatus();
      // Clean up agent states
      activeAgents.current.forEach((agentId) => {
        provider.removeAgentState(agentId);
      });
      activeAgents.current.clear();
    };
  }, [provider, documentId]);
}

/**
 * Hook that pipes agent cursor updates from the SSE stream response
 * into the Yjs awareness. Called by the stream handler when it receives
 * cursor events from the /api/agent/stream endpoint.
 */
export function useStreamCursorRelay(
  provider: SupabaseProvider | null,
  agentId: string,
  agentName: string,
  agentAvatar: string,
  agentColor: string,
) {
  const providerRef = useRef(provider);
  providerRef.current = provider;

  const updateCursor = (
    cursor: { anchor: number; head: number },
    status: "idle" | "reading" | "editing" | "responding" | "thinking" = "editing",
  ) => {
    if (!providerRef.current) return;
    providerRef.current.setAgentState({
      id: agentId,
      name: agentName,
      avatar: agentAvatar,
      color: agentColor,
      cursor,
      status,
    });
  };

  const updateStatus = (
    status: "idle" | "reading" | "editing" | "responding" | "thinking",
  ) => {
    if (!providerRef.current) return;
    providerRef.current.setAgentState({
      id: agentId,
      name: agentName,
      avatar: agentAvatar,
      color: agentColor,
      status,
    });
  };

  const remove = () => {
    if (!providerRef.current) return;
    providerRef.current.removeAgentState(agentId);
  };

  return { updateCursor, updateStatus, remove };
}
