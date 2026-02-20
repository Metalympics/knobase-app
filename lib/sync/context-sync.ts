import { openClawBridge } from "./openclaw-bridge";
import { listDocuments, getDocument } from "@/lib/documents/store";
import { listAgents } from "@/lib/agents/store";
import { getSuggestionsForDocument } from "@/lib/agents/store";
import type { Document } from "@/lib/documents/types";

interface SyncState {
  lastSyncedDocId: string | null;
  lastSyncedContent: string | null;
  syncTimer: ReturnType<typeof setTimeout> | null;
  isActive: boolean;
}

const state: SyncState = {
  lastSyncedDocId: null,
  lastSyncedContent: null,
  syncTimer: null,
  isActive: false,
};

const DEBOUNCE_MS = 2000;

export function startContextSync() {
  state.isActive = true;
  syncWorkspaceStructure();
}

export function stopContextSync() {
  state.isActive = false;
  if (state.syncTimer) {
    clearTimeout(state.syncTimer);
    state.syncTimer = null;
  }
}

export function syncCurrentDocument(documentId: string, content: string, title: string) {
  if (!state.isActive || !openClawBridge.isConnected) return;

  if (state.lastSyncedDocId === documentId && state.lastSyncedContent === content) {
    return;
  }

  if (state.syncTimer) {
    clearTimeout(state.syncTimer);
  }

  state.syncTimer = setTimeout(() => {
    state.lastSyncedDocId = documentId;
    state.lastSyncedContent = content;
    openClawBridge.sendDocumentUpdate(documentId, title, content);
  }, DEBOUNCE_MS);
}

export function syncWorkspaceStructure() {
  if (!state.isActive || !openClawBridge.isConnected) return;

  const docs = listDocuments();
  const agents = listAgents();

  openClawBridge.sendContextSync({
    type: "workspace_structure",
    documents: docs.map((d) => ({
      id: d.id,
      title: d.title,
      updatedAt: d.updatedAt,
    })),
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      status: a.status,
      capabilities: a.capabilities,
    })),
    timestamp: new Date().toISOString(),
  });
}

export function syncAgentSuggestions(documentId: string) {
  if (!state.isActive || !openClawBridge.isConnected) return;

  const suggestions = getSuggestionsForDocument(documentId);
  const pending = suggestions.filter((s) => s.status === "pending");

  if (pending.length === 0) return;

  openClawBridge.sendContextSync({
    type: "agent_suggestions",
    documentId,
    suggestions: pending.map((s) => ({
      id: s.id,
      agentId: s.agentId,
      reasoning: s.reasoning,
      status: s.status,
      createdAt: s.createdAt,
    })),
    timestamp: new Date().toISOString(),
  });
}

export function getFullDocumentContext(documentId: string): Record<string, unknown> | null {
  const doc = getDocument(documentId);
  if (!doc) return null;

  const suggestions = getSuggestionsForDocument(documentId);
  const allDocs = listDocuments();
  const agents = listAgents();

  return {
    currentDocument: {
      id: doc.id,
      title: doc.title,
      content: doc.content,
      updatedAt: doc.updatedAt,
    },
    pendingSuggestions: suggestions
      .filter((s) => s.status === "pending")
      .map((s) => ({
        id: s.id,
        reasoning: s.reasoning,
        model: s.model,
      })),
    workspaceDocuments: allDocs.map((d) => ({
      id: d.id,
      title: d.title,
    })),
    availableAgents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      capabilities: a.capabilities,
    })),
  };
}

export function pushFullContextToOpenClaw(documentId: string) {
  if (!openClawBridge.isConnected) return;

  const context = getFullDocumentContext(documentId);
  if (!context) return;

  openClawBridge.sendContextSync({
    type: "full_context",
    ...context,
    timestamp: new Date().toISOString(),
  });
}
