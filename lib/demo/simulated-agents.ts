// ── Simulated Agent & People System ──
// 4 product AI agents + 5 video demo agents + 4 simulated people for the demo sandbox.
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
  avatar?: string;
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
  // ── Video launch demo agents ──
  {
    id: "strategy-lead",
    name: "Strategy Lead",
    avatar: "/strategy-lead.svg",
    color: "#7C3AED",
    description: "Go-to-market and growth strategy",
    status: "online",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    avatar: "/data-analyst.svg",
    color: "#2563EB",
    description: "Metrics, cohorts, and insights",
    status: "online",
  },
  {
    id: "designer",
    name: "Designer",
    avatar: "/designer.svg",
    color: "#EC4899",
    description: "Visual design and UX",
    status: "online",
  },
  {
    id: "compliance-officer",
    name: "Compliance Officer",
    avatar: "/compliance-officer.svg",
    color: "#1E3A5F",
    description: "Regulatory review and risk",
    status: "online",
  },
  {
    id: "seo-expert",
    name: "SEO Expert",
    avatar: "/seo-expert.svg",
    color: "#EA580C",
    description: "Search visibility and content strategy",
    status: "online",
  },
];

export const DEMO_PEOPLE: SimulatedPerson[] = [
  { userId: "demo-chris", displayName: "Chris", color: "#3B82F6", role: "Product Lead" },
  { userId: "demo-sarah", displayName: "Sarah", color: "#10B981", role: "Engineer", avatar: "/avatar-sarah.svg" },
  { userId: "demo-mike", displayName: "Mike", color: "#F59E0B", role: "Designer" },
  { userId: "demo-priya", displayName: "Priya", color: "#F43F5E", role: "Data Scientist" },
  { userId: "demo-alex", displayName: "Alex", color: "#3B82F6", role: "Marketing Lead", avatar: "/avatar-alex.svg" },
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

const STRATEGY_LEAD_RESPONSES: CannedResponse[] = [
  {
    keywords: ["q3 performance", "performance data", "analyze", "q4", "growth pillar", "growth strategy"],
    response:
      "**Q4 Growth Strategy — Three Pillars**\n\n" +
      "Based on Q3 performance data (ARR $4.2M, +32% YoY; churn up 4% in SMB), here are the three growth pillars I recommend for Q4:\n\n" +
      "---\n\n" +
      "**Pillar 1 — Enterprise Acceleration**\n" +
      "Enterprise is our highest-margin, lowest-churn segment. With 12 signed accounts and $0 churn, every enterprise deal compounds. " +
      "Target: Close 3 of the 4 late-stage pipeline accounts (Horizon Capital, BrightPath Health, Apex Research) by end of Q4. " +
      "This alone adds ~$880K ARR.\n\n" +
      "**Pillar 2 — SMB Churn Reduction**\n" +
      "SMB churn at 6.8% is eroding the base. Exit surveys point to two fixable problems: onboarding complexity and lack of templates. " +
      "Shipping 5 industry-specific templates and a guided 7-day activation flow could cut churn to 4% — saving ~$120K ARR.\n\n" +
      "**Pillar 3 — Agent Marketplace Launch**\n" +
      "The video agents feature is the biggest unaided awareness driver we have. " +
      "A marketplace with 20+ agent templates creates network effects: more agents → more use cases → more signups. " +
      "Target: Launch beta by Nov 15, 50 installs by year-end.\n\n" +
      "---\n\n" +
      "Want me to build out the OKR framework for each pillar?",
  },
  {
    keywords: ["competitor", "competition", "market", "positioning", "vs"],
    response:
      "**Competitive Landscape — Q4 2025**\n\n" +
      "Key competitors and our differentiation:\n\n" +
      "| Competitor | Their strength | Our advantage |\n" +
      "|---|---|---|\n" +
      "| Notion AI | Brand awareness, templates | Agent orchestration, not just copilot |\n" +
      "| Confluence AI | Enterprise footprint | Modern UX, faster to deploy |\n" +
      "| Coda | Flexible data blocks | Inline agent prompting is more natural |\n\n" +
      "**Core insight:** Nobody else has agents *inside* the document. We should lead with that in every pitch.",
  },
  {
    keywords: ["okr", "objective", "goal", "target", "metric"],
    response:
      "**Q4 OKRs — Recommended Framework**\n\n" +
      "**Objective:** Accelerate enterprise ARR and reduce SMB churn before year-end.\n\n" +
      "| Key Result | Target | Owner |\n" +
      "|---|---|---|\n" +
      "| Enterprise ARR | +$880K (3 closes) | Chris |\n" +
      "| SMB churn rate | ≤4.0% | Sarah |\n" +
      "| Agent marketplace beta | 50 installs | Mike |\n" +
      "| NPS | ≥65 | All |\n\n" +
      "These are aggressive but achievable given Q3 momentum.",
  },
];

const DATA_ANALYST_RESPONSES: CannedResponse[] = [
  {
    keywords: ["churn", "retention", "smb", "cohort", "attrition"],
    response:
      "**SMB Churn Deep Dive — Q3 2025**\n\n" +
      "I pulled the cohort data. Here's what's driving the 6.8% SMB churn:\n\n" +
      "**By account size:**\n" +
      "| Team size | Churn rate | Avg time to churn |\n" +
      "|---|---|---|\n" +
      "| 1–3 seats | 11.2% | 23 days |\n" +
      "| 4–9 seats | 5.8% | 41 days |\n" +
      "| 10+ seats | 1.9% | 68 days |\n\n" +
      "**Root cause:** Solo and micro-team accounts churn before they see value. " +
      "The median churned account had 0 agent mentions — they never tried the core feature.\n\n" +
      "**Recommendation:** Gate the first agent mention behind a mandatory 2-minute onboarding flow. " +
      "Our data shows that accounts with ≥1 agent mention in week 1 have 3.2× higher 90-day retention.\n\n" +
      "Want me to model the impact of a 7-day activation campaign on ARR?",
  },
  {
    keywords: ["pipeline", "forecast", "revenue", "arr", "mrr"],
    response:
      "**Q4 Revenue Forecast**\n\n" +
      "Based on current pipeline and historical close rates:\n\n" +
      "| Scenario | New ARR | End-of-Q4 ARR | Probability |\n" +
      "|---|---|---|---|\n" +
      "| Bear | $420K | $4.62M | 25% |\n" +
      "| Base | $760K | $4.96M | 50% |\n" +
      "| Bull | $1.07M | $5.27M | 25% |\n\n" +
      "**Expected value:** ~$4.97M ARR by Dec 31.\n\n" +
      "The base case assumes Horizon Capital closes (highest confidence) and one of the two mid-stage deals converts.",
  },
  {
    keywords: ["summarize", "summary", "tldr", "metrics", "kpi"],
    response:
      "**Metrics Summary — Q3 2025**\n\n" +
      "| KPI | Value | vs Q2 |\n" +
      "|---|---|---|\n" +
      "| ARR | $4.2M | +24% |\n" +
      "| New customers | 89 | +33% |\n" +
      "| Enterprise accounts | 12 | +140% |\n" +
      "| SMB churn | 6.8% | +0.4pp |\n" +
      "| NPS | 62 | +8 |\n" +
      "| DAU | 12,400 | +18% |\n\n" +
      "**Bottom line:** Strong growth at the top, churn pressure at the bottom. Fix SMB activation and Q4 is in strong shape.",
  },
];

const DESIGNER_RESPONSES: CannedResponse[] = [
  {
    keywords: ["onboarding", "flow", "ux", "user experience", "template", "design"],
    response:
      "**Onboarding Redesign — Visual Direction**\n\n" +
      "Based on the churn data (solo users leave before first agent mention), here's the redesign direction:\n\n" +
      "**Proposed 3-step activation flow:**\n\n" +
      "1. **Welcome screen** — One sentence: \"Knobase is a doc where AI agents work alongside you.\" " +
      "Single CTA: \"Try it now\" → drops user directly into a pre-filled demo doc.\n\n" +
      "2. **First mention prompt** — A glowing `@` hint appears in the doc margin. " +
      "Clicking it pre-types `@strategy-lead analyze this doc` — zero friction for the first agent interaction.\n\n" +
      "3. **Success state** — After the first agent response, a small confetti burst and a \"Save your work → Create account\" nudge.\n\n" +
      "**Visual system:** Keeping our current neutral palette but adding per-agent color accents on inline prompt boxes — this makes agents feel like characters, not tools.\n\n" +
      "I can put together a Figma prototype if that's helpful.",
  },
  {
    keywords: ["brand", "color", "palette", "logo", "visual", "style"],
    response:
      "**Brand Direction — Recommendations**\n\n" +
      "Current brand: clean, neutral, developer-adjacent. To appeal to a broader knowledge-worker audience:\n\n" +
      "- **Keep** the neutral whites and subtle grays for the canvas — this is professional\n" +
      "- **Amplify** agent colors as the brand personality — each agent's color becomes a brand asset\n" +
      "- **Add** one accent color for CTAs (recommend `#7C3AED` purple — premium but accessible)\n\n" +
      "The \"hive of agents\" visual is our most distinctive element. I'd lean into it on the marketing site.",
  },
  {
    keywords: ["summarize", "summary", "review", "critique", "feedback"],
    response:
      "**Design Review Notes**\n\n" +
      "Looking at the current UI, a few observations:\n\n" +
      "✅ **Strong:** Clean document canvas, good typographic hierarchy, agent color system\n" +
      "⚠️ **Needs work:** Sidebar feels dense at smaller viewports; agent queue cards could use more breathing room\n" +
      "❌ **Missing:** Empty state illustrations — blank documents feel cold and don't suggest what to do next\n\n" +
      "Priority fix: Empty state with a friendly `@` hint. This directly maps to the onboarding activation problem.",
  },
];

const COMPLIANCE_OFFICER_RESPONSES: CannedResponse[] = [
  {
    keywords: ["hipaa", "gdpr", "compliance", "regulation", "legal", "risk", "healthcare", "health"],
    response:
      "**Compliance Review — BrightPath Health Proposal**\n\n" +
      "I've reviewed the BrightPath Health scope against HIPAA requirements. Key findings:\n\n" +
      "**🔴 Must-fix before signing:**\n" +
      "1. The proposal allows PHI to pass through agent prompts. Under HIPAA, this requires a signed BAA (Business Associate Agreement). " +
      "Confirm your legal team has a BAA template ready before the deal closes.\n" +
      "2. Audit logs must be retained for 6 years per HIPAA §164.312. " +
      "Confirm your current log retention policy covers this window.\n\n" +
      "**🟡 Recommend addressing in implementation:**\n" +
      "3. Agent responses containing patient data should be auto-classified and access-controlled at the document level.\n" +
      "4. Add a data residency confirmation — BrightPath will likely ask where data is processed.\n\n" +
      "**🟢 Already covered:**\n" +
      "- Encryption in transit (TLS 1.3)\n" +
      "- Role-based access controls (workspace permissions model)\n\n" +
      "This deal is closeable — just needs the BAA and log retention confirmation.",
  },
  {
    keywords: ["review", "contract", "terms", "agreement", "legal"],
    response:
      "**Contract Review — Key Flags**\n\n" +
      "I've scanned the agreement. Items requiring attention:\n\n" +
      "1. **Liability cap** — Currently set to 3× subscription fees. " +
      "For enterprise deals, customers will push for unlimited liability on data breaches. Decide your floor now.\n\n" +
      "2. **SLA terms** — 99.5% uptime is stated, but there's no explicit definition of \"downtime.\" " +
      "Add a clear definition (consecutive minutes of unavailability for >X% of users).\n\n" +
      "3. **Data ownership** — Clause 7.2 is ambiguous about model training on customer content. " +
      "Recommend explicit language: \"Customer data is not used for model training.\"\n\n" +
      "These are standard negotiation points — nothing that should block the deal.",
  },
  {
    keywords: ["summarize", "summary", "audit", "risk assessment"],
    response:
      "**Risk Assessment Summary**\n\n" +
      "| Area | Risk level | Status |\n" +
      "|---|---|---|\n" +
      "| Data privacy (GDPR/HIPAA) | High | BAA needed for healthcare deals |\n" +
      "| Data residency | Medium | EU customers require explicit confirmation |\n" +
      "| IP ownership | Low | Standard SaaS terms in place |\n" +
      "| SOC 2 Type II | Medium | Audit scheduled for Q1 2026 |\n\n" +
      "Overall: low legal risk for standard SaaS deals. Healthcare and financial services require extra diligence.",
  },
];

const SEO_EXPERT_RESPONSES: CannedResponse[] = [
  {
    keywords: ["seo", "search", "keyword", "ranking", "organic", "content strategy", "traffic"],
    response:
      "**SEO Content Strategy — Q4 2025**\n\n" +
      "I've audited the current organic presence. Here's the Q4 plan:\n\n" +
      "**Top keyword opportunities (high volume, low competition):**\n" +
      "| Keyword | Monthly searches | Difficulty | Priority |\n" +
      "|---|---|---|---|\n" +
      "| \"ai document editor\" | 8,200 | 32/100 | 🔴 High |\n" +
      "| \"notion ai alternative\" | 5,400 | 41/100 | 🔴 High |\n" +
      "| \"ai agent workspace\" | 2,900 | 28/100 | 🟡 Medium |\n" +
      "| \"collaborative ai writing tool\" | 1,800 | 22/100 | 🟡 Medium |\n\n" +
      "**Q4 Content Calendar:**\n" +
      "1. \"The Complete Guide to AI Agent Orchestration\" — targets the top two keywords\n" +
      "2. \"Knobase vs Notion AI: What's Different\" — competitor comparison page\n" +
      "3. 4× customer case studies (Acme Corp, Zenith, Meridian Health, one more)\n\n" +
      "Estimated organic traffic uplift: +2,200 sessions/month within 90 days of publish.",
  },
  {
    keywords: ["positioning", "messaging", "tagline", "copy", "landing page"],
    response:
      "**Positioning Review — Search Intent Analysis**\n\n" +
      "Current tagline: \"The open-source AI workspace\"\n\n" +
      "**Problem:** Nobody searches for \"AI workspace.\" They search for what they *want to do*:\n" +
      "- \"collaborate with AI on documents\"\n" +
      "- \"AI that works in my notes\"\n" +
      "- \"get AI help while writing\"\n\n" +
      "**Recommendation:** Lead with the job-to-be-done on the landing page.\n\n" +
      "Proposed headline: **\"The doc where your AI teammates work alongside you.\"**\n\n" +
      "This maps to high-intent queries and differentiates from copilot-style tools that work *on top of* your work rather than *inside* it.\n\n" +
      "For the meta description, I'd suggest: \"Knobase lets you @mention AI agents inside your documents. They research, write, and analyze — right where the work happens.\"",
  },
  {
    keywords: ["summarize", "summary", "audit", "backlink", "domain authority"],
    response:
      "**SEO Audit Summary**\n\n" +
      "| Metric | Current | Target (Q4) |\n" +
      "|---|---|---|\n" +
      "| Domain authority | 18 | 25 |\n" +
      "| Organic sessions/mo | 3,200 | 6,000 |\n" +
      "| Indexed pages | 47 | 80 |\n" +
      "| Avg. position (top queries) | 28 | 12 |\n\n" +
      "**Quick wins:** Fix 14 broken internal links, add schema markup to the pricing page, " +
      "and submit updated sitemap. These can lift rankings within 30 days with no new content.",
  },
];

const AGENT_RESPONSES: Record<string, CannedResponse[]> = {
  openclaw: OPENCLAW_RESPONSES,
  chatgpt: CHATGPT_RESPONSES,
  claude: CLAUDE_RESPONSES,
  cursor: CURSOR_RESPONSES,
  "strategy-lead": STRATEGY_LEAD_RESPONSES,
  "data-analyst": DATA_ANALYST_RESPONSES,
  designer: DESIGNER_RESPONSES,
  "compliance-officer": COMPLIANCE_OFFICER_RESPONSES,
  "seo-expert": SEO_EXPERT_RESPONSES,
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
