"use client";

// ── Demo Context ──
// Provides in-memory demo state that wraps /demo routes.
// No DB writes. Resets on page refresh. Pre-loaded demo documents.
// Simulates agent interactions with canned responses.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  DEMO_DOCUMENTS,
  type DemoDocument,
  type DemoWorkspace,
  DEMO_WORKSPACE,
} from "./demo-data";
import {
  matchSimulatedResponse,
  type SimulatedAgent,
  DEMO_AGENTS,
} from "./simulated-agents";

// ── Types ──

interface DemoContextValue {
  isDemo: true;
  workspace: DemoWorkspace;
  documents: DemoDocument[];
  currentDocument: DemoDocument | null;
  simulatedAgents: SimulatedAgent[];

  // Navigation
  setCurrentDocumentId: (id: string) => void;

  // Editing (in-memory only)
  updateDocumentContent: (docId: string, content: string) => void;

  // Agent simulation
  triggerAgentResponse: (
    mention: string
  ) => Promise<{ agent: SimulatedAgent; response: string }>;
  agentTyping: SimulatedAgent | null;

  // CTA tracking
  editCount: number;
  mentionCount: number;
  incrementEdits: () => void;
  incrementMentions: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

// ── Provider ──

export function DemoProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DemoDocument[]>(
    () => DEMO_DOCUMENTS
  );
  const [currentDocId, setCurrentDocId] = useState<string>(
    DEMO_DOCUMENTS[0]?.id ?? ""
  );
  const [agentTyping, setAgentTyping] = useState<SimulatedAgent | null>(null);
  const [editCount, setEditCount] = useState(0);
  const [mentionCount, setMentionCount] = useState(0);

  const currentDocument =
    documents.find((d) => d.id === currentDocId) ?? null;

  const setCurrentDocumentId = useCallback((id: string) => {
    setCurrentDocId(id);
  }, []);

  const updateDocumentContent = useCallback(
    (docId: string, content: string) => {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === docId
            ? { ...d, content, updatedAt: new Date().toISOString() }
            : d
        )
      );
    },
    []
  );

  const incrementEdits = useCallback(() => {
    setEditCount((c) => c + 1);
  }, []);

  const incrementMentions = useCallback(() => {
    setMentionCount((c) => c + 1);
  }, []);

  const triggerAgentResponse = useCallback(
    async (
      mention: string
    ): Promise<{ agent: SimulatedAgent; response: string }> => {
      const agent = DEMO_AGENTS[0]; // Claw is the default demo agent
      setAgentTyping(agent);

      // Simulate thinking delay (1.5–3s)
      const delay = 1500 + Math.random() * 1500;
      await new Promise((r) => setTimeout(r, delay));

      const response = matchSimulatedResponse(mention);

      setAgentTyping(null);
      return { agent, response };
    },
    []
  );

  const value: DemoContextValue = {
    isDemo: true,
    workspace: DEMO_WORKSPACE,
    documents,
    currentDocument,
    simulatedAgents: DEMO_AGENTS,
    setCurrentDocumentId,
    updateDocumentContent,
    triggerAgentResponse,
    agentTyping,
    editCount,
    mentionCount,
    incrementEdits,
    incrementMentions,
  };

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>;
}

// ── Hook ──

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext);
  if (!ctx) {
    throw new Error("useDemo must be used within a <DemoProvider>");
  }
  return ctx;
}

/**
 * Safe check — returns null if not inside DemoProvider (e.g. real app).
 */
export function useDemoSafe(): DemoContextValue | null {
  return useContext(DemoContext) ?? null;
}
