// ── Simulated Agent & People System ──
// 4 AI agents with PNG avatars + 4 simulated people for the demo sandbox.
// Per-agent canned responses matched by keyword.

export interface SimulatedAgent {
  id: string;
  name: string;
  avatar: string; // PNG path in /public
  color: string;
  description: string;
  status: "online" | "thinking" | "typing" | "idle";
}

export interface SimulatedPerson {
  userId: string;
  displayName: string;
  color: string;
  role: string;
}

export const DEMO_AGENTS: SimulatedAgent[] = [
  {
    id: "openclaw",
    name: "OpenClaw",
    avatar: "/openclaw.png",
    color: "#E94560",
    description: "Full agent workspace integration",
    status: "online",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    avatar: "/chatgpt.png",
    color: "#10a37f",
    description: "Advanced reasoning and generation",
    status: "online",
  },
  {
    id: "claude",
    name: "Claude",
    avatar: "/claude.png",
    color: "#8B5CF6",
    description: "Long context analysis",
    status: "online",
  },
  {
    id: "cursor",
    name: "Cursor",
    avatar: "/cursor.png",
    color: "#2563EB",
    description: "Code-focused AI assistant",
    status: "online",
  },
];

export const DEMO_PEOPLE: SimulatedPerson[] = [
  { userId: "demo-chris", displayName: "Chris", color: "#3B82F6", role: "Product Lead" },
  { userId: "demo-sarah", displayName: "Sarah", color: "#10B981", role: "Engineer" },
  { userId: "demo-mike", displayName: "Mike", color: "#F59E0B", role: "Designer" },
  { userId: "demo-priya", displayName: "Priya", color: "#F43F5E", role: "Data Scientist" },
];

// ── Per-Agent Canned Responses ──

interface CannedResponse {
  keywords: string[];
  response: string;
}

const OPENCLAW_RESPONSES: CannedResponse[] = [
  {
    keywords: ["prioritize", "priority", "rank", "order", "impact"],
    response:
      "Based on user impact and engineering effort, here's the recommended priority:\n\n" +
      "1. **Real-time collaboration** — highest retention driver (78% of users cite context-switching)\n" +
      "2. **Agent marketplace** — revenue unlock + network effects\n" +
      "3. **API webhooks** — enables enterprise integrations\n" +
      "4. **SSO / enterprise auth** — table-stakes for enterprise sales\n" +
      "5. **Mobile app** — lower urgency, most users are desktop-first\n\n" +
      "Recommendation: Ship items 1-2 this quarter, 3-4 next quarter.",
  },
  {
    keywords: ["summarize", "summary", "tldr"],
    response:
      "**Executive Summary:**\n\n" +
      "The company delivered strong Q3 results with revenue up 32% YoY. " +
      "Key wins include the enterprise pilot program (12 signed accounts) and " +
      "the AI agent integration launch. Challenges remain in customer churn for " +
      "the SMB segment (up 4%) and hiring velocity for the platform team.\n\n" +
      "**Key metrics:** ARR $4.2M (+32%), NPS 62 (+8), DAU 12.4K (+18%)",
  },
  {
    keywords: ["help", "what can you do", "capabilities"],
    response:
      "I'm **OpenClaw**, your full-stack workspace agent. I can:\n\n" +
      "- Research and summarize documents\n" +
      "- Create tasks and track progress\n" +
      "- Draft content, outlines, and reports\n" +
      "- Coordinate with other agents\n\n" +
      "Just @mention me with what you need!",
  },
];

const CHATGPT_RESPONSES: CannedResponse[] = [
  {
    keywords: ["action items", "action", "tasks", "todo", "to-do"],
    response:
      "Here are the action items from this meeting:\n\n" +
      "1. **Chris** — Finalize dashboard layout and share Figma link by Wednesday\n" +
      "2. **Sarah** — Complete API integration and write migration tests\n" +
      "3. **Mike** — Update design system with new color tokens\n" +
      "4. **Priya** — Run A/B test analysis on onboarding flow and share results\n" +
      "5. **Team** — Review Q3 roadmap priorities in Friday standup\n\n" +
      "Deadline: All items due by end of sprint (Friday).",
  },
  {
    keywords: ["draft", "write", "create", "compose"],
    response:
      "Here's a draft to get started:\n\n" +
      "---\n\n" +
      "Knobase is where your team and AI work together — not in separate windows, " +
      "but side by side in the same document. @mention an AI agent to get instant " +
      "help with research, writing, analysis, or code. Every task is tracked, " +
      "every edit is transparent.\n\n" +
      "---\n\n" +
      "Feel free to edit and refine this!",
  },
  {
    keywords: ["summarize", "summary", "tldr"],
    response:
      "**Summary:**\n\n" +
      "This document covers several key areas. The main takeaways are:\n" +
      "1. Strong progress on core product features\n" +
      "2. User research validates the inline-AI approach\n" +
      "3. Key blockers are around external integrations\n\n" +
      "The team should focus on shipping the collaboration MVP before expanding the agent framework.",
  },
  {
    keywords: ["brainstorm", "ideas", "suggest"],
    response:
      "Here are some directions to consider:\n\n" +
      "1. **Agent memory** — Let agents remember context across sessions\n" +
      "2. **Smart templates** — Auto-fill documents based on agent analysis\n" +
      "3. **Workflow chains** — Agent A researches → Agent B writes → Agent C reviews\n" +
      "4. **Voice commands** — Dictate to agents via speech-to-text\n" +
      "5. **Weekly digest** — AI-generated summary of all workspace activity\n\n" +
      "Want me to expand on any of these?",
  },
];

const CLAUDE_RESPONSES: CannedResponse[] = [
  {
    keywords: ["analyze", "analysis", "efficacy", "safety", "clinical", "trial", "data"],
    response:
      "**Clinical Data Analysis — Study AZ-4821:**\n\n" +
      "**Efficacy:** Etonavir demonstrated statistically significant improvements across all endpoints. " +
      "The primary endpoint (ΔFEV₁ +0.14L vs placebo, p<0.001) exceeds the MCID of 0.10L for COPD trials. " +
      "The SGRQ improvement of −5.1 points also surpasses the 4-point MCID threshold, indicating clinically " +
      "meaningful quality-of-life benefit.\n\n" +
      "**Safety:** The overall AE profile is acceptable. Serious AEs were numerically *lower* in the treatment " +
      "arm (7.4% vs 9.0%). The elevated ALT signal (2.6% vs 1.3%) warrants monitoring — recommend hepatic " +
      "panel at Weeks 4, 12, and 24 in Phase III.\n\n" +
      "**Key concern:** The 2:1 randomization limits safety power. Phase III should use 1:1 with a larger " +
      "sample to better characterize the hepatotoxicity signal.\n\n" +
      "**Recommendation:** Proceed to Phase III with hepatic monitoring protocol.",
  },
  {
    keywords: ["summarize", "summary", "tldr"],
    response:
      "**Analytical Summary:**\n\n" +
      "I've reviewed the full document. Key findings:\n\n" +
      "- The data supports positive outcomes across primary and secondary measures\n" +
      "- Statistical significance is strong (p<0.001 on primary endpoint)\n" +
      "- Safety profile is manageable but requires further monitoring\n" +
      "- Subgroup analyses show consistent benefit across demographics\n\n" +
      "The evidence supports moving forward with expanded studies.",
  },
  {
    keywords: ["explain", "interpret", "break down", "what does"],
    response:
      "Let me break this down:\n\n" +
      "The document presents complex information that can be understood in layers:\n\n" +
      "**At a high level:** The core message is about measurable improvements with acceptable trade-offs.\n\n" +
      "**The numbers:** The statistical results (confidence intervals, p-values) all point in the same " +
      "direction — the effect is real, not due to chance.\n\n" +
      "**What to watch:** There are minor signals in the safety data that need tracking but don't change " +
      "the overall positive picture.\n\n" +
      "Would you like me to dive deeper into any specific section?",
  },
];

const CURSOR_RESPONSES: CannedResponse[] = [
  {
    keywords: ["code", "implement", "function", "api", "endpoint", "build"],
    response:
      "Here's a starter implementation:\n\n" +
      "```typescript\n" +
      "export async function analyzeDocument(docId: string) {\n" +
      "  const doc = await getDocument(docId);\n" +
      "  const analysis = await agent.analyze(doc.content);\n" +
      "  \n" +
      "  return {\n" +
      "    summary: analysis.summary,\n" +
      "    keyTopics: analysis.topics,\n" +
      "    sentiment: analysis.sentiment,\n" +
      "    actionItems: analysis.extractedTasks,\n" +
      "  };\n" +
      "}\n" +
      "```\n\n" +
      "This hooks into the existing agent framework. Want me to add error handling?",
  },
  {
    keywords: ["review", "fix", "bug", "debug", "refactor"],
    response:
      "I've reviewed the code. Here are my suggestions:\n\n" +
      "1. **Error handling** — Add try/catch around the async calls\n" +
      "2. **Type safety** — The return type should be explicitly defined\n" +
      "3. **Performance** — Consider memoizing the analysis results\n" +
      "4. **Testing** — Add unit tests for edge cases (empty doc, large doc)\n\n" +
      "The overall structure is clean. These are incremental improvements.",
  },
  {
    keywords: ["summarize", "summary", "tldr"],
    response:
      "**Technical Summary:**\n\n" +
      "The codebase follows a clean architecture pattern:\n" +
      "- API layer → Service layer → Data layer\n" +
      "- Good separation of concerns\n" +
      "- TypeScript types are well-defined\n\n" +
      "Areas for improvement: test coverage (currently ~60%), error boundaries in the UI layer.",
  },
];

const AGENT_RESPONSES: Record<string, CannedResponse[]> = {
  openclaw: OPENCLAW_RESPONSES,
  chatgpt: CHATGPT_RESPONSES,
  claude: CLAUDE_RESPONSES,
  cursor: CURSOR_RESPONSES,
};

const FALLBACK_RESPONSE =
  "I'm working on that now. In a full Knobase workspace, I'd connect to your AI provider " +
  "for a detailed response.\n\n" +
  "For this demo, try asking me to:\n" +
  "- **Summarize** a document\n" +
  "- **Analyze** data or content\n" +
  "- **Draft** new content\n" +
  "- **Prioritize** a list of items\n\n" +
  "*Create a free account to unlock full AI capabilities!*";

/**
 * Match a user mention to a canned response, scoped to the specific agent.
 * Falls back to a generic response if no keyword match.
 */
export function matchSimulatedResponse(agentId: string, mention: string): string {
  const lower = mention.toLowerCase();
  const agentResponses = AGENT_RESPONSES[agentId];

  if (agentResponses) {
    for (const entry of agentResponses) {
      if (entry.keywords.some((kw) => lower.includes(kw))) {
        return entry.response;
      }
    }
  }

  // Try all agents as fallback
  for (const responses of Object.values(AGENT_RESPONSES)) {
    for (const entry of responses) {
      if (entry.keywords.some((kw) => lower.includes(kw))) {
        return entry.response;
      }
    }
  }

  return FALLBACK_RESPONSE;
}
