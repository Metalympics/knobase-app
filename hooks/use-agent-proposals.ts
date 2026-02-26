"use client";

import { useState, useEffect, useCallback } from "react";
import {
  listProposalsByDocument,
  getPendingProposals,
  acceptProposal,
  rejectProposal,
  acceptWithModifications,
  acceptAllForTask,
  rejectAllForTask,
  subscribeToDocumentProposals,
} from "@/lib/supabase/proposals";
import type { AgentEditProposal, EditProposalStatus } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* useDocumentProposals — realtime edit proposals for a document       */
/* ------------------------------------------------------------------ */

export function useDocumentProposals(
  documentId: string | null,
  options?: { status?: EditProposalStatus[] },
) {
  const [proposals, setProposals] = useState<AgentEditProposal[]>([]);
  const [loading, setLoading] = useState(true);

  // Initial fetch
  useEffect(() => {
    if (!documentId) {
      setProposals([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const fetcher = options?.status?.includes("pending")
      ? getPendingProposals(documentId)
      : listProposalsByDocument(documentId, options);

    fetcher
      .then(setProposals)
      .catch(() => setProposals([]))
      .finally(() => setLoading(false));
  }, [documentId, options?.status?.join(",")]);

  // Realtime subscription
  useEffect(() => {
    if (!documentId) return;

    const sub = subscribeToDocumentProposals(documentId, (proposal, eventType) => {
      if (eventType === "DELETE") {
        setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
        return;
      }

      setProposals((prev) => {
        const idx = prev.findIndex((p) => p.id === proposal.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = proposal;
          return next;
        }
        return [proposal, ...prev];
      });
    });

    return () => sub.unsubscribe();
  }, [documentId]);

  const accept = useCallback(
    async (proposalId: string, userId: string) => {
      try {
        const updated = await acceptProposal(proposalId, userId);
        setProposals((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
        return updated;
      } catch (err) {
        console.error("Failed to accept proposal:", err);
        return null;
      }
    },
    [],
  );

  const reject = useCallback(
    async (proposalId: string, userId: string) => {
      try {
        const updated = await rejectProposal(proposalId, userId);
        setProposals((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
        return updated;
      } catch (err) {
        console.error("Failed to reject proposal:", err);
        return null;
      }
    },
    [],
  );

  const acceptWithChanges = useCallback(
    async (proposalId: string, userId: string, modifiedContent: Record<string, unknown>) => {
      try {
        const updated = await acceptWithModifications(proposalId, userId, modifiedContent);
        setProposals((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p)),
        );
        return updated;
      } catch (err) {
        console.error("Failed to accept with modifications:", err);
        return null;
      }
    },
    [],
  );

  const acceptAll = useCallback(
    async (taskId: string, userId: string) => {
      try {
        const updated = await acceptAllForTask(taskId, userId);
        setProposals((prev) =>
          prev.map((p) => {
            const match = updated.find((u) => u.id === p.id);
            return match ?? p;
          }),
        );
        return updated;
      } catch (err) {
        console.error("Failed to accept all:", err);
        return [];
      }
    },
    [],
  );

  const rejectAll = useCallback(
    async (taskId: string, userId: string) => {
      try {
        await rejectAllForTask(taskId, userId);
        setProposals((prev) =>
          prev.map((p) =>
            p.task_id === taskId && p.status === "pending"
              ? { ...p, status: "rejected" as const, decided_by: userId, decided_at: new Date().toISOString() }
              : p,
          ),
        );
      } catch (err) {
        console.error("Failed to reject all:", err);
      }
    },
    [],
  );

  const pending = proposals.filter((p) => p.status === "pending");
  const accepted = proposals.filter((p) => p.status === "accepted" || p.status === "modified");
  const rejected = proposals.filter((p) => p.status === "rejected");

  return {
    proposals,
    pending,
    accepted,
    rejected,
    loading,
    accept,
    reject,
    acceptWithChanges,
    acceptAll,
    rejectAll,
  };
}
