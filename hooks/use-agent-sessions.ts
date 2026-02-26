"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getAgentSession,
  listSessionsByDocument,
  listSessionsByWorkspace,
  subscribeToDocumentSessions,
  subscribeToAgentSessions,
  toggleFollow,
} from "@/lib/supabase/sessions";
import type { AgentSession } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* useDocumentSessions — live agent presence for a document            */
/* ------------------------------------------------------------------ */

export function useDocumentSessions(documentId: string | null) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!documentId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listSessionsByDocument(documentId)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [documentId]);

  // Realtime subscription
  useEffect(() => {
    if (!documentId) return;

    const sub = subscribeToDocumentSessions(documentId, (session, eventType) => {
      if (eventType === "DELETE") {
        setSessions((prev) => prev.filter((s) => s.id !== session.id));
        return;
      }

      setSessions((prev) => {
        // If session expired, remove it
        if (new Date(session.expires_at) < new Date()) {
          return prev.filter((s) => s.id !== session.id);
        }

        const idx = prev.findIndex((s) => s.id === session.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = session;
          return next;
        }
        return [...prev, session];
      });
    });

    return () => sub.unsubscribe();
  }, [documentId]);

  const follow = useCallback(
    async (sessionId: string, userId: string) => {
      try {
        const updated = await toggleFollow(sessionId, userId);
        setSessions((prev) =>
          prev.map((s) => (s.id === updated.id ? updated : s)),
        );
      } catch {
        // silent fail
      }
    },
    [],
  );

  const activeSessions = sessions.filter(
    (s) => s.status !== "idle" && new Date(s.expires_at) > new Date(),
  );

  return { sessions, activeSessions, loading, follow };
}

/* ------------------------------------------------------------------ */
/* useWorkspaceSessions — live sessions across a workspace             */
/* ------------------------------------------------------------------ */

export function useWorkspaceSessions(workspaceId: string | null) {
  const [sessions, setSessions] = useState<AgentSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!workspaceId) {
      setSessions([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    listSessionsByWorkspace(workspaceId)
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return { sessions, loading };
}

/* ------------------------------------------------------------------ */
/* useAgentLocation — "where is @claw right now?"                      */
/* ------------------------------------------------------------------ */

export function useAgentLocation(agentId: string | null) {
  const [session, setSession] = useState<AgentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentId) {
      setSession(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    getAgentSession(agentId)
      .then(setSession)
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  }, [agentId]);

  // Realtime subscription: follows the agent across documents
  useEffect(() => {
    if (!agentId) return;

    const sub = subscribeToAgentSessions(agentId, (updated, eventType) => {
      if (eventType === "DELETE") {
        setSession((prev) =>
          prev?.id === updated.id ? null : prev,
        );
        return;
      }
      // Keep the most recently active session
      setSession(updated);
    });

    return () => sub.unsubscribe();
  }, [agentId]);

  return {
    session,
    loading,
    isActive: !!session && session.status !== "idle",
    documentId: session?.document_id ?? null,
    status: session?.status ?? "idle",
    currentSection: session?.current_section ?? null,
  };
}
