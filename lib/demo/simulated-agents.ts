// ── Simulated Agent System ──
// Canned responses for the demo sandbox.
// No real AI — just pre-written text matched by keyword.

export interface SimulatedAgent {
  id: string;
  name: string;
  avatar: string;
  color: string;
  status: "online" | "thinking" | "typing" | "idle";
}

export const DEMO_AGENTS: SimulatedAgent[] = [
  {
    id: "claw-demo",
    name: "Claw",
    avatar: "🐾",
    color: "#6366f1",
    status: "online",
  },
];

// ── Response Matching ──

interface CannedResponse {
  keywords: string[];
  response: string;
}

const CANNED_RESPONSES: CannedResponse[] = [
  {
    keywords: ["summarize", "summary", "tldr", "tl;dr"],
    response:
      "Here's a quick summary:\n\n" +
      "**Key Points:**\n" +
      "1. Real-time collaboration is the top priority this quarter\n" +
      "2. AI agent integration enables in-document writing assistance\n" +
      "3. Marketplace launch is on track for mid-March\n\n" +
      "The team is focused on shipping features that differentiate Knobase from traditional knowledge management tools — particularly the ability for AI agents to edit documents directly rather than through a chat interface.",
  },
  {
    keywords: ["prioritize", "priority", "rank", "order", "important"],
    response:
      "Based on the roadmap and user research, here's my suggested priority order:\n\n" +
      "1. **Agent in-document editing** — This is the #1 differentiator users are asking for\n" +
      "2. **Real-time collaboration** — Drives team adoption and retention\n" +
      "3. **@mention workflow** — Low friction way to invoke AI assistance\n" +
      "4. **Marketplace launch** — Revenue opportunity, but can be phased\n\n" +
      "Rationale: User research shows 78% cite context-switching as their top pain point. In-document AI directly solves this.",
  },
  {
    keywords: ["release notes", "changelog", "release", "v0.4"],
    response:
      "## Release Notes — v0.4.0\n\n" +
      "### ✨ New Features\n" +
      "- **Agent cursor overlay** — See where AI agents are reading and writing in real-time\n" +
      "- **Task queue panel** — Assign, track, and review AI work from the sidebar\n" +
      "- **Inline suggestions** — Accept, reject, or modify AI edits with one click\n" +
      "- **Workspace invites** — Share your knowledge base with teammates\n\n" +
      "### 🔧 Improvements\n" +
      "- Faster document loading (40% improvement)\n" +
      "- Better markdown export formatting\n" +
      "- Improved mobile layout for the editor\n\n" +
      "### 🐛 Bug Fixes\n" +
      "- Fixed cursor jump on agent edits\n" +
      "- Resolved Y.js sync conflicts on slow connections\n" +
      "- Fixed mention dropdown positioning at page bottom",
  },
  {
    keywords: ["help", "what can you do", "capabilities", "features"],
    response:
      "I'm **Claw**, your AI teammate! Here's what I can help with:\n\n" +
      "- 📝 **Write content** — drafts, summaries, outlines\n" +
      "- 🔍 **Research** — analyze documents and extract insights\n" +
      "- ✅ **Organize** — prioritize tasks, create action items\n" +
      "- 💡 **Brainstorm** — generate ideas and alternatives\n\n" +
      "Just type `@claw` followed by what you need, and I'll write my response right here in the document.\n\n" +
      "*This is a demo — in a real workspace, I connect to your AI provider via MCP for much more powerful capabilities.*",
  },
  {
    keywords: ["brainstorm", "ideas", "suggest", "think"],
    response:
      "Here are some ideas to explore:\n\n" +
      "1. **Template marketplace** — Let users share document templates with pre-configured agent personas\n" +
      "2. **Agent workflows** — Chain multiple agent actions (research → draft → review)\n" +
      "3. **Smart digest** — Daily/weekly AI-generated summaries of workspace activity\n" +
      "4. **Version diffing** — Show what the agent changed with inline diffs\n" +
      "5. **Voice-to-document** — Dictate notes, let the agent structure them\n\n" +
      "Want me to expand on any of these?",
  },
  {
    keywords: ["write", "draft", "create", "compose"],
    response:
      "Here's a draft to get you started:\n\n" +
      "---\n\n" +
      "Knobase is a collaborative knowledge management platform where AI agents work alongside humans — not in a separate chat window, but directly in the document.\n\n" +
      "**Why it matters:**\n" +
      "Traditional AI tools create a disconnect between where you think and where AI responds. Knobase eliminates that gap by letting AI agents read, write, and edit in the same workspace as your team.\n\n" +
      "**How it works:**\n" +
      "1. Create a document\n" +
      "2. Type `@claw` and describe what you need\n" +
      "3. Your AI teammate writes directly in the document\n" +
      "4. Review, accept, or modify the suggestions\n\n" +
      "---\n\n" +
      "Feel free to edit this however you'd like!",
  },
];

const FALLBACK_RESPONSE =
  "I'm analyzing the document now. In a full Knobase workspace, I'd connect to your AI provider via MCP to give you a detailed response.\n\n" +
  "For this demo, try asking me to:\n" +
  "- **Summarize** this document\n" +
  "- **Prioritize** the items listed\n" +
  "- **Draft** release notes\n" +
  "- **Brainstorm** new ideas\n\n" +
  "*Create a free account to unlock full AI capabilities!*";

/**
 * Match a user mention to a canned response based on keywords.
 */
export function matchSimulatedResponse(mention: string): string {
  const lower = mention.toLowerCase();

  for (const entry of CANNED_RESPONSES) {
    if (entry.keywords.some((kw) => lower.includes(kw))) {
      return entry.response;
    }
  }

  return FALLBACK_RESPONSE;
}
