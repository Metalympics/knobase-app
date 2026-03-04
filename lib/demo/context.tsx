"use client";

// ── Demo Context ──
// Provides in-memory demo state that wraps /demo routes.
// No DB writes. Resets on page refresh. Pre-loaded demo documents.
// Simulates agent interactions with canned responses and task lifecycle.

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
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
  DEMO_AGENTS,
  DEMO_PEOPLE,
  type SimulatedAgent,
  type SimulatedPerson,
} from "./simulated-agents";

// ── Types ──

export type SimulatedTaskStatus = "queued" | "processing" | "completed" | "failed";

export interface SimulatedTask {
  id: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  prompt: string;
  status: SimulatedTaskStatus;
  response?: string;
  documentId: string;
  createdAt: Date;
}

export interface PresenceEntry {
  id: string;
  name: string;
  type: "person" | "agent";
  color: string;
  avatar?: string;
  documentId: string;
  documentTitle: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type JSONContent = Record<string, any>;

interface DemoContextValue {
  isDemo: true;
  workspace: DemoWorkspace;
  documents: DemoDocument[];
  currentDocument: DemoDocument | null;
  simulatedAgents: SimulatedAgent[];
  simulatedPeople: SimulatedPerson[];

  setCurrentDocumentId: (id: string) => void;
  createDocument: (parentId?: string) => string;
  updateDocumentContent: (docId: string, content: string) => void;

  /** Store the editor JSON snapshot for a document (preserves custom nodes) */
  saveEditorJson: (docId: string, json: JSONContent) => void;
  /** Get the stored JSON snapshot, if any */
  getEditorJson: (docId: string) => JSONContent | null;

  triggerAgentResponse: (
    agentId: string,
    mention: string,
    documentId?: string,
  ) => Promise<{ agent: SimulatedAgent; response: string }>;
  agentTyping: SimulatedAgent | null;

  /** Navigate to a task's document and scroll to its anchor node */
  navigateToTask: (task: SimulatedTask) => void;
  /** Pending scroll target after navigation */
  pendingScrollTaskId: string | null;
  clearPendingScroll: () => void;

  simulatedTasks: SimulatedTask[];
  presence: PresenceEntry[];

  /** Returns ancestor chain from root to the given doc (inclusive) */
  getAncestorChain: (docId: string) => DemoDocument[];

  editCount: number;
  mentionCount: number;
  incrementEdits: () => void;
  incrementMentions: () => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

// ── Provider ──

export const SEED_TASKS: SimulatedTask[] = [
  {
    id: "seed-task-1",
    agentId: "openclaw",
    agentName: "OpenClaw",
    agentAvatar: "/openclaw.png",
    agentColor: "#E94560",
    prompt: "Summarize Q3 company report",
    status: "completed",
    response: `Q3 2025 was a strong quarter with $4.2M ARR (+24% QoQ), driven by 89 new customers and a 48% surge in the enterprise segment. Key wins include Acme Corp (500 seats), Zenith Technologies, and Meridian Health. DAU grew 18% to 12,400 and NPS climbed to 62.

Product shipped agent-in-editor (v0.3.0) and task queue (v0.4.0), with real-time collab and invites in beta.

Risks: SMB churn rose to 4.2% ("too complex"), 3 of 6 platform roles remain open, and OpenClaw had 2 webhook outages. Q4 focus: marketplace launch, enterprise SSO, and simplified SMB onboarding.`,
    documentId: "demo-report",
    createdAt: new Date(Date.now() - 25 * 60_000),
  },
  {
    id: "seed-task-2",
    agentId: "claude",
    agentName: "Claude",
    agentAvatar: "/claude.png",
    agentColor: "#8B5CF6",
    prompt: "Analyze clinical trial safety data",
    status: "processing",
    documentId: "demo-clinical",
    createdAt: new Date(Date.now() - 3 * 60_000),
  },
  {
    id: "seed-task-3",
    agentId: "chatgpt",
    agentName: "ChatGPT",
    agentAvatar: "/chatgpt.png",
    agentColor: "#10a37f",
    prompt: "Draft action items from standup",
    status: "queued",
    documentId: "demo-meeting",
    createdAt: new Date(Date.now() - 1 * 60_000),
  },
  {
    id: "seed-task-4",
    agentId: "strategy-lead",
    agentName: "Strategy Lead",
    agentAvatar: "/strategy-lead.svg",
    agentColor: "#7C3AED",
    prompt: "Competitor Analysis",
    status: "completed",
    response: `**Competitor Analysis — Q4 2025**

**Direct competitors:**

| Competitor | ARR (est.) | Key strength | Key weakness |
|---|---|---|---|
| Notion AI | $400M+ | Brand & ecosystem | AI is a feature, not the core |
| Confluence AI | $1B+ | Enterprise footprint | Legacy UX, slow innovation |
| Coda | $100M est. | Flexible data model | Steep learning curve |

**Our position:** Knobase is the only product where AI agents are first-class collaborators, not add-on copilots. The inline @mention workflow has no direct equivalent.

**Biggest threat:** Notion launching agent-to-agent orchestration. Timeline: likely 12–18 months based on their current product roadmap signals.

**Recommendation:** Accelerate the agent marketplace before Notion copies the pattern. First-mover advantage in agent templates is the defensible moat.`,
    documentId: "demo-gtm",
    createdAt: new Date(Date.now() - 45 * 60_000),
  },
  {
    id: "seed-task-5",
    agentId: "strategy-lead",
    agentName: "Strategy Lead",
    agentAvatar: "/strategy-lead.svg",
    agentColor: "#7C3AED",
    prompt: "Analyze our Q3 performance data and outline three main growth pillars for Q4",
    status: "completed",
    response: `**Q4 Growth Pillars — Strategic Analysis**

Based on Q3 performance data ($4.2M ARR, +24% QoQ, 12 enterprise accounts, 4.2% SMB churn), here are the three growth pillars for Q4:

**1. Double down on Enterprise**
Enterprise is our strongest segment: 0% churn, $380K ACV average, and Horizon Capital + BrightPath Health in late-stage pipeline. Q4 goal: close 3 new enterprise accounts worth ≥$800K combined ACV. Lever: dedicated enterprise onboarding, SSO, and HIPAA compliance track.

**2. Fix SMB onboarding to arrest 4.2% churn**
Exit surveys show "too complex" as the top reason for SMB churn (31 accounts lost in Q3). Q4 intervention: launch 5 pre-built agent templates, reduce time-to-first-agent-mention to <5 minutes, and introduce a guided setup flow. Target: bring SMB churn from 4.2% → 2.8% by Dec 31.

**3. Launch the agent marketplace**
No competitor has agent orchestration templates. Shipping a public marketplace in Q4 creates a network effect moat before Notion can copy the pattern. Target: 20 community-submitted agent templates at launch, 3 featured partner integrations (Salesforce, Notion import, Slack).`,
    documentId: "demo-gtm",
    createdAt: new Date(Date.now() - 60 * 60_000),
  },
  {
    id: "seed-task-6",
    agentId: "data-analyst",
    agentName: "Data Analyst",
    agentAvatar: "/data-analyst.svg",
    agentColor: "#2563EB",
    prompt: "Pull exact churn cohort data for the SMB segment and model the revenue impact",
    status: "completed",
    response: `**SMB Churn Cohort Analysis — Q3 2025**

| Cohort | Accounts at Start | Churned | Churn Rate | Avg MRR Lost | Revenue Impact |
|---|---|---|---|---|---|
| Jan 2025 | 148 | 11 | 7.4% | $290 | $3,190/mo |
| Apr 2025 | 163 | 10 | 6.1% | $310 | $3,100/mo |
| Jul 2025 | 171 | 10 | 5.8% | $325 | $3,250/mo |
| **Q3 Total** | **482** | **31** | **6.4% avg** | — | **$9,540/mo** |

**Revenue impact model:**
- Current SMB ARR at risk (annualised 6.4% churn): ~$114,480/year
- If churn is reduced to 2.8% (Strategy Lead target): saves ~$43,800/year
- Net revenue retained with fix: +$43.8K ARR — equivalent to ~3 new mid-market seats

**Primary exit reason (exit survey, n=24 responses):**
- "Too complex / steep learning curve" — 58%
- "Missing integrations" — 21%
- "Switched to Notion AI" — 13%
- Other — 8%

**Recommendation:** Onboarding simplification has the highest ROI. A 1-week sprint on guided setup + agent templates could recover the equivalent of 3 enterprise deals.`,
    documentId: "demo-gtm",
    createdAt: new Date(Date.now() - 50 * 60_000),
  },
  {
    id: "seed-task-7",
    agentId: "designer",
    agentName: "Designer",
    agentAvatar: "/designer.svg",
    agentColor: "#EC4899",
    prompt: "Format the churn data table with professional styling for the executive deck",
    status: "processing",
    documentId: "demo-gtm",
    createdAt: new Date(Date.now() - 5 * 60_000),
  },
  {
    id: "seed-task-8",
    agentId: "compliance-officer",
    agentName: "Compliance Officer",
    agentAvatar: "/compliance-officer.svg",
    agentColor: "#1E3A5F",
    prompt: "Review the BrightPath Health proposal for HIPAA requirements before we send it",
    status: "completed",
    response: `**Compliance Review — BrightPath Health Proposal**

Reviewed against HIPAA Security Rule (45 CFR Part 164) and HITECH Act requirements. Three findings require resolution before the proposal is sent:

**🔴 Finding 1 — BAA not referenced**
The proposal does not mention a Business Associate Agreement. BrightPath Health is a covered entity; Knobase will process PHI on their behalf. A signed BAA is a legal prerequisite. Action: Add BAA language to Section 4 of the proposal and attach the standard BAA template as Exhibit A.

**🟡 Finding 2 — Data residency is ambiguous**
BrightPath's procurement team will ask where PHI is stored. The proposal says "US-based infrastructure" but does not specify the cloud region or sub-processor list. Action: Add a data residency clause specifying AWS us-east-1 and list Supabase and OpenAI as sub-processors with their DPA links.

**🟢 Finding 3 — Encryption at rest mentioned but not at transit**
Section 3 states data is "encrypted at rest (AES-256)" but omits in-transit encryption (TLS 1.2+). Minor but auditors will flag it. Action: Add one sentence confirming TLS 1.2+ for all data in transit.

**Overall assessment:** Proposal is approvable with the three revisions above. Estimated fix time: 2 hours. Recommend completing before the Oct 15 send deadline.`,
    documentId: "demo-gtm",
    createdAt: new Date(Date.now() - 30 * 60_000),
  },
  {
    id: "seed-task-9",
    agentId: "seo-expert",
    agentName: "SEO Expert",
    agentAvatar: "/seo-expert.svg",
    agentColor: "#EA580C",
    prompt: "Optimize the accepted draft positioning for search",
    status: "completed",
    response: `**SEO Optimization — Positioning & Public Page**

**Proposed H1 headline:**
"The doc where your AI teammates work alongside you."

**Proposed meta description (155 chars):**
"Knobase lets you @mention AI agents inside your documents. They research, write, and analyze — right where the work happens. Free to start."

**Top keyword opportunities (Ahrefs data):**

| Keyword | Monthly searches | KD | Current rank |
|---|---|---|---|
| ai document editor | 8,200 | 34 | Not ranking |
| notion ai alternative | 5,400 | 52 | Not ranking |
| ai workspace tool | 3,100 | 28 | Not ranking |
| agent orchestration platform | 1,800 | 19 | Not ranking |
| collaborative ai writing tool | 1,200 | 22 | Not ranking |

**Quick wins (implement before launch):**
1. Add "ai document editor" to the page title tag and H1
2. Create a /compare/notion-ai page targeting "notion ai alternative" — high intent, attainable KD
3. Add FAQ schema to the homepage with questions like "What is agent orchestration?"
4. Internal link from the blog to the positioning page using keyword-rich anchor text`,
    documentId: "demo-gtm",
    createdAt: new Date(Date.now() - 15 * 60_000),
  },
];

function buildPresence(docs: DemoDocument[]): PresenceEntry[] {
  const docMap = new Map(docs.map((d) => [d.id, d.title]));
  return [
    { id: "demo-chris", name: "Chris", type: "person", color: "#3B82F6", documentId: "demo-roadmap", documentTitle: docMap.get("demo-roadmap") ?? "" },
    { id: "demo-sarah", name: "Sarah", type: "person", color: "#10B981", avatar: "/avatar-sarah.svg", documentId: "demo-gtm", documentTitle: docMap.get("demo-gtm") ?? "" },
    { id: "demo-mike", name: "Mike", type: "person", color: "#F59E0B", documentId: "demo-welcome", documentTitle: docMap.get("demo-welcome") ?? "" },
    { id: "demo-priya", name: "Priya", type: "person", color: "#F43F5E", documentId: "demo-clinical", documentTitle: docMap.get("demo-clinical") ?? "" },
    { id: "demo-alex", name: "Alex", type: "person", color: "#3B82F6", avatar: "/avatar-alex.svg", documentId: "demo-gtm", documentTitle: docMap.get("demo-gtm") ?? "" },
    { id: "openclaw", name: "OpenClaw", type: "agent", color: "#E94560", avatar: "/openclaw.png", documentId: "demo-report", documentTitle: docMap.get("demo-report") ?? "" },
    { id: "chatgpt", name: "ChatGPT", type: "agent", color: "#10a37f", avatar: "/chatgpt.png", documentId: "demo-meeting", documentTitle: docMap.get("demo-meeting") ?? "" },
    { id: "claude", name: "Claude", type: "agent", color: "#8B5CF6", avatar: "/claude.png", documentId: "demo-clinical", documentTitle: docMap.get("demo-clinical") ?? "" },
    { id: "cursor", name: "Cursor", type: "agent", color: "#2563EB", avatar: "/cursor.png", documentId: "demo-roadmap", documentTitle: docMap.get("demo-roadmap") ?? "" },
    { id: "strategy-lead", name: "Strategy Lead", type: "agent", color: "#7C3AED", avatar: "/strategy-lead.svg", documentId: "demo-gtm", documentTitle: docMap.get("demo-gtm") ?? "" },
    { id: "data-analyst", name: "Data Analyst", type: "agent", color: "#2563EB", avatar: "/data-analyst.svg", documentId: "demo-gtm", documentTitle: docMap.get("demo-gtm") ?? "" },
  ];
}

export function DemoProvider({ children }: { children: ReactNode }) {
  const [documents, setDocuments] = useState<DemoDocument[]>(
    () => DEMO_DOCUMENTS
  );
  const [currentDocId, setCurrentDocId] = useState<string>(
    DEMO_DOCUMENTS[0]?.id ?? ""
  );
  const [agentTyping, setAgentTyping] = useState<SimulatedAgent | null>(null);
  const [simulatedTasks, setSimulatedTasks] = useState<SimulatedTask[]>(() => SEED_TASKS);
  const [editCount, setEditCount] = useState(0);
  const [mentionCount, setMentionCount] = useState(0);
  const [pendingScrollTaskId, setPendingScrollTaskId] = useState<string | null>(null);
  const taskIdCounter = useRef(3);
  const docIdCounter = useRef(0);
  const editorJsonCache = useRef<Map<string, JSONContent>>(new Map());

  const presence = buildPresence(documents);

  const saveEditorJson = useCallback((docId: string, json: JSONContent) => {
    editorJsonCache.current.set(docId, json);
  }, []);

  const getEditorJson = useCallback((docId: string): JSONContent | null => {
    return editorJsonCache.current.get(docId) ?? null;
  }, []);

  const currentDocument =
    documents.find((d) => d.id === currentDocId) ?? null;

  const setCurrentDocumentId = useCallback((id: string) => {
    setCurrentDocId(id);
  }, []);

  const createDocument = useCallback((parentId?: string): string => {
    docIdCounter.current += 1;
    const id = `demo-new-${docIdCounter.current}`;
    const now = new Date().toISOString();
    const newDoc: DemoDocument = {
      id,
      title: "Untitled",
      icon: "📄",
      content: "",
      createdAt: now,
      updatedAt: now,
      ...(parentId ? { parentId } : {}),
    };
    setDocuments((prev) => [...prev, newDoc]);
    setCurrentDocId(id);
    return id;
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

  const navigateToTask = useCallback((task: SimulatedTask) => {
    setCurrentDocId(task.documentId);
    setPendingScrollTaskId(task.id);
  }, []);

  const clearPendingScroll = useCallback(() => {
    setPendingScrollTaskId(null);
  }, []);

  const getAncestorChain = useCallback((docId: string): DemoDocument[] => {
    const chain: DemoDocument[] = [];
    let current = documents.find((d) => d.id === docId);
    while (current) {
      chain.unshift(current);
      current = current.parentId
        ? documents.find((d) => d.id === current!.parentId)
        : undefined;
    }
    return chain;
  }, [documents]);

  const triggerAgentResponse = useCallback(
    async (
      agentId: string,
      mention: string,
      documentId?: string,
    ): Promise<{ agent: SimulatedAgent; response: string }> => {
      const agent = DEMO_AGENTS.find((a) => a.id === agentId) ?? DEMO_AGENTS[0];
      setAgentTyping(agent);

      taskIdCounter.current += 1;
      const taskId = `demo-task-${taskIdCounter.current}`;

      const newTask: SimulatedTask = {
        id: taskId,
        agentId: agent.id,
        agentName: agent.name,
        agentAvatar: agent.avatar,
        agentColor: agent.color,
        prompt: mention.length > 80 ? mention.slice(0, 80) + "…" : mention,
        status: "queued",
        documentId: documentId ?? currentDocId,
        createdAt: new Date(),
      };

      setSimulatedTasks((prev) => [newTask, ...prev]);

      // Stay in "queued" — the only completed case is the pre-seeded seed-task-1.
      await new Promise((r) => setTimeout(r, 600));
      setAgentTyping(null);

      const response = matchSimulatedResponse(agentId, mention);
      return { agent, response };
    },
    [currentDocId]
  );

  const value: DemoContextValue = {
    isDemo: true,
    workspace: DEMO_WORKSPACE,
    documents,
    currentDocument,
    simulatedAgents: DEMO_AGENTS,
    simulatedPeople: DEMO_PEOPLE,
    setCurrentDocumentId,
    createDocument,
    updateDocumentContent,
    saveEditorJson,
    getEditorJson,
    triggerAgentResponse,
    agentTyping,
    navigateToTask,
    pendingScrollTaskId,
    clearPendingScroll,
    getAncestorChain,
    simulatedTasks,
    presence,
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
