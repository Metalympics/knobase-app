// ── Demo Data ──
// Pre-populated workspace and documents for the demo sandbox.
// All data lives in-memory — no DB writes.

export interface DemoDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface DemoWorkspace {
  id: string;
  name: string;
  subdomain: string;
}

export const DEMO_WORKSPACE: DemoWorkspace = {
  id: "demo-space",
  name: "Demo: Product Team",
  subdomain: "demo",
};

const now = new Date().toISOString();

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: "demo-doc-1",
    title: "🚀 Q1 Product Roadmap",
    content: `# 🚀 Q1 Product Roadmap

## Overview

This quarter we're focused on three high-impact areas: **real-time collaboration**, **AI agent integrations**, and **marketplace launch**.

## Priorities

### 1. Real-Time Collaboration
- Multi-cursor editing (Y.js)
- Presence indicators
- Comment threads on document blocks
- @mentions for teammates and AI agents

### 2. AI Agent Integration
- Agent-in-the-editor: AI writes directly in your document
- Task queue: assign work, track progress, review suggestions
- Persona system: customize agent tone & behavior
- MCP protocol support for external agent connections

### 3. Marketplace Launch
- Browse and install knowledge packs
- Creator tools for publishing templates
- Stripe-based payments

---

## Timeline

| Milestone | Target | Status |
|-----------|--------|--------|
| Collaboration MVP | Jan 15 | ✅ Done |
| Agent task queue | Feb 1 | ✅ Done |
| Marketplace beta | Feb 28 | 🔄 In progress |
| Public launch | Mar 15 | 📋 Planned |

---

*Try typing **@claw** below and ask it to help prioritize these items!*

`,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-doc-2",
    title: "📊 User Research Analysis",
    content: `# 📊 User Research Analysis

## Summary

We interviewed 24 knowledge workers across 8 companies. Here are the key findings.

## Top Pain Points

1. **Context switching** — 78% of users switch between 5+ tools daily
2. **Lost knowledge** — Documents get buried in Notion/Google Docs/Slack
3. **AI is isolated** — ChatGPT/Claude conversations are disconnected from actual work
4. **No single source of truth** — Teams duplicate information across platforms

## What Users Want

> "I want an AI that works *in* my document, not in a separate chat window."
> — Product Manager, Series B startup

> "If I could @mention an AI and have it research something right where I'm writing, that would be incredible."
> - Engineering Lead, Fortune 500

## Opportunity Sizing

- TAM: $12B (knowledge management software)
- SAM: $3.2B (AI-augmented writing tools)
- SOM: $180M (collaborative AI knowledge bases)

## Recommendations

1. **Double down on in-document AI** — this is our key differentiator
2. **Focus on teams, not solo users** — collaboration drives retention
3. **Build integrations** — users won't abandon existing tools overnight

---

*Type **@claw summarize this** to see the AI in action!*

`,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-doc-3",
    title: "📝 Meeting Notes — Feb 28",
    content: `# 📝 Meeting Notes — Feb 28

**Attendees:** Sarah, Mike, @claw

## Agenda

1. Sprint review
2. Marketplace launch blocklist
3. Customer feedback triage

## Sprint Review

### Completed
- ✅ Agent cursor overlay
- ✅ Task queue panel
- ✅ Inline suggestion accept/reject
- ✅ Workspace invite system

### In Progress
- 🔄 Marketplace Stripe integration
- 🔄 Knowledge pack import/export
- 🔄 Mobile responsive editor

### Blocked
- ⛔ OpenClaw webhook reliability (waiting on external fix)

## Action Items

- [ ] Sarah: Finalize marketplace pricing tiers
- [ ] Mike: Write migration for knowledge pack reviews table
- [ ] @claw: Draft release notes for v0.4.0

## Notes

- Consider soft-launching marketplace to 50 beta users before full rollout
- Need to add rate limiting to agent API endpoints
- Customer "Acme Corp" requesting SSO — add to Q2 roadmap

---

*Ask **@claw** to help draft the release notes!*

`,
    createdAt: now,
    updatedAt: now,
  },
];
