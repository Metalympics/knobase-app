// ── Demo Data ──
// Pre-populated workspace and documents for the demo sandbox.
// All data lives in-memory — no DB writes.
// Each document doubles as a feature showcase with embedded CTAs.

export interface DemoDocument {
  id: string;
  title: string;
  icon: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  parentId?: string;
}

export interface DemoWorkspace {
  id: string;
  name: string;
  subdomain: string;
}

export const DEMO_WORKSPACE: DemoWorkspace = {
  id: "demo-space",
  name: "Demo Workspace",
  subdomain: "demo",
};

const now = new Date().toISOString();

export const DEMO_DOCUMENTS: DemoDocument[] = [
  {
    id: "demo-welcome",
    title: "Welcome to Knobase",
    icon: "👋",
    content: `# Welcome to Knobase

Your AI-powered knowledge workspace — where humans and AI agents collaborate in the same document.

---

## 1. AGENT MENTIONS™
*"Your AI teammate, one @ away"*

Mention any AI agent inline — right where you're writing. No switching tabs, no copy-paste. The agent reads your document and responds in place.

**Available agents in this demo:**
- **OpenClaw** — Full workspace agent (tasks, research, drafts)
- **ChatGPT** — Reasoning and generation
- **Claude** — Deep analysis and long-context
- **Cursor** — Code-focused assistance

👇 **Try it now** — type \`@\` on the empty line below and pick an agent:

\u00A0

\u00A0

\u00A0

\u00A0

\u00A0

\u00A0

*Your response will appear right here in the document.*

---

## 2. LIVE PRESENCE™
*"See your agent think"*

When you @mention an agent, watch the sidebar — you'll see the task appear in the **Agent Queue** and transition through statuses in real-time:

**Queued** → **Processing** → **Completed**

Try mentioning an agent above and watch the queue update live.

---

## 3. AGENT QUEUE™
*"Never lose a task"*

Every @mention creates a tracked task. Open the **Agent Queue** in the sidebar to see all active and completed tasks. Try mentioning multiple agents to see them queue up!

---

## 4. FILE UPLOADS
*"Drag, drop, done"*

Paste or drag an image directly into this editor to see instant file embedding. In demo mode, files are ephemeral — sign up to save them permanently.

Try it: drag any image from your desktop onto this editor.

---

## 5. TEMPLATES
*"Start with structure"*

Browse pre-built document templates at [knobase.com/templates](https://knobase.com/templates) — research briefs, product specs, meeting notes, and more. Import them with one click.

---

## Ready to build your knowledge base?

**Create a free account** to save your work, connect real AI agents, and collaborate with your team.

`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-report",
    title: "Q3 Company Report",
    icon: "📊",
    content: `# Q3 2025 Company Report

## Executive Summary

> 💡 **This section is empty on purpose.** Try typing \`@openclaw summarize this report\` below to have an AI agent fill it in for you.

---

## Revenue

| Quarter | ARR       | Growth | New Customers |
|---------|-----------|--------|---------------|
| Q1 2025 | $2.8M     | —      | 48            |
| Q2 2025 | $3.4M     | +21%   | 67            |
| Q3 2025 | $4.2M     | +24%   | 89            |

Total revenue for Q3 was $1.4M, representing 32% year-over-year growth. Enterprise segment grew 48% while SMB grew 18%.

## Key Metrics

- **Daily Active Users:** 12,400 (+18% QoQ)
- **Net Promoter Score:** 62 (+8 from Q2)
- **Customer Churn:** 4.2% (up from 3.8% — driven by SMB segment)
- **Average Contract Value:** $14,200 (+12% QoQ)
- **Time to Value:** 3.2 days (down from 5.1 days)

## Enterprise Pilot Program

12 enterprise accounts signed in Q3, including:
- Acme Corp (500 seats)
- Zenith Technologies (200 seats)
- Meridian Health (350 seats)

Pipeline for Q4: 28 accounts in late-stage negotiation, representing ~$2.1M in potential ARR.

## Product Highlights

- Shipped agent-in-editor (v0.3.0)
- Launched task queue and inline suggestions (v0.4.0)
- Beta: real-time collaboration with Y.js
- Beta: workspace invite system

## Challenges

1. **SMB churn** increased 4% — exit surveys cite "too complex for small teams"
2. **Hiring velocity** below target — 3 of 6 platform roles still open
3. **OpenClaw webhook reliability** — 2 outages in Q3, resolved in v0.4.1

## Outlook

Q4 priorities: marketplace launch, enterprise SSO, and reducing SMB churn through a simplified onboarding flow.

`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-clinical",
    title: "Clinical Trial — AZ-4821",
    icon: "🧬",
    content: `# Clinical Trial Report — Study AZ-4821

## Phase II Randomized Controlled Trial: Etonavir vs. Placebo

**Sponsor:** Zenith Biomedical  |  **Protocol:** AZ-4821-PH2  |  **Date:** 2025-12-15

---

## Analysis

> 💡 **Need a quick read on this trial?** Try typing \`@claude analyze the efficacy and safety data in this clinical trial\` below.

---

## Study Design

- **Population:** Adults aged 35–70 with moderate-to-severe COPD (GOLD stage II–III)
- **Randomization:** 2:1 (Etonavir 200mg BID : Placebo), double-blind
- **Duration:** 24 weeks, with 4-week follow-up
- **Primary endpoint:** Change in FEV₁ (L) from baseline at Week 24
- **Secondary endpoints:** SGRQ total score, exacerbation rate, 6MWD

---

## Efficacy Results

| Endpoint                  | Etonavir (n=312) | Placebo (n=156) | Δ (95% CI)           | p-value  |
|---------------------------|------------------|-----------------|----------------------|----------|
| ΔFEV₁ (L) at Wk 24       | +0.18            | +0.04           | 0.14 (0.08–0.20)    | <0.001   |
| SGRQ total score change   | −8.2             | −3.1            | −5.1 (−7.4 to −2.8) | <0.001   |
| Annualized exacerbation   | 0.72             | 1.14            | RR 0.63 (0.48–0.83) | 0.001    |
| 6MWD change (m)           | +38              | +12             | 26 (14–38)           | <0.001   |

## Safety Summary

| Event                     | Etonavir n (%)   | Placebo n (%)   |
|---------------------------|------------------|-----------------|
| Any AE                    | 187 (59.9%)      | 84 (53.8%)      |
| Serious AE                | 23 (7.4%)        | 14 (9.0%)       |
| Headache                  | 42 (13.5%)       | 18 (11.5%)      |
| Nausea                    | 31 (9.9%)        | 12 (7.7%)       |
| Elevated ALT (>3× ULN)   | 8 (2.6%)         | 2 (1.3%)        |
| Discontinuation due to AE | 14 (4.5%)        | 7 (4.5%)        |

---

## Interpretation

> 💡 **This report is dense.** Try typing \`@claude analyze the efficacy and safety data in this clinical trial\` below to get an AI-powered interpretation.

---

## Subgroup Analyses

### By GOLD Stage

| Subgroup   | ΔFEV₁ (Etonavir) | ΔFEV₁ (Placebo) | Treatment Effect |
|------------|-------------------|-----------------|-----------------|
| Stage II   | +0.21             | +0.05           | +0.16           |
| Stage III  | +0.14             | +0.03           | +0.11           |

### By Age

| Subgroup   | ΔFEV₁ (Etonavir) | ΔFEV₁ (Placebo) | Treatment Effect |
|------------|-------------------|-----------------|-----------------|
| 35–54      | +0.20             | +0.05           | +0.15           |
| 55–70      | +0.16             | +0.03           | +0.13           |

### By Smoking Status

| Subgroup         | ΔFEV₁ (Etonavir) | ΔFEV₁ (Placebo) | Treatment Effect |
|------------------|-------------------|-----------------|-----------------|
| Current smoker   | +0.15             | +0.04           | +0.11           |
| Former smoker    | +0.20             | +0.04           | +0.16           |

## Pharmacokinetic Data

- **Cmax:** 842 ng/mL (CV 28%)
- **AUC₀₋₁₂:** 4,210 ng·h/mL (CV 32%)
- **Trough (C₁₂):** 186 ng/mL (CV 35%)
- **t½:** 8.4 hours
- **Exposure-response:** Positive correlation between AUC and ΔFEV₁ (r=0.42, p<0.001)

No clinically relevant food effect. No dose adjustment needed for mild-to-moderate renal impairment.

`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-meeting",
    title: "Weekly Meeting Notes",
    icon: "📝",
    content: `# Team Standup — Mar 3, 2026

**Attendees:** Chris, Sarah, Mike, Priya

---

## Summary

> 💡 **Catch up fast.** Try typing \`@chatgpt summarize this meeting\` below to generate a quick recap.

---

## Updates

**Chris (Product Lead)**
- Finished the new dashboard layout — Figma link shared in #design
- Met with Acme Corp for enterprise feedback session
- Reviewing Q4 OKRs draft

**Sarah (Engineer)**
- API integration is 80% complete — webhook handlers done
- Found and fixed a race condition in the Y.js sync layer
- Pair programming with new hire on Monday

**Mike (Designer)**
- Design system v2 tokens are finalized
- Mobile responsive mockups ready for review
- Working on marketplace card components

**Priya (Data Scientist)**
- A/B test on onboarding flow shows 23% improvement in activation
- Built churn prediction model — accuracy at 84%
- Dashboard data pipeline migration to ClickHouse in progress

---

## Discussion

- Should we soft-launch the marketplace to 50 beta users before full rollout?
- Enterprise SSO: build vs. buy? Sarah recommends Auth0, Chris wants to evaluate WorkOS.
- Customer "Meridian Health" requesting HIPAA compliance — add to Q1 roadmap.

---

## Action Items

> 💡 **Need action items?** Try typing \`@chatgpt draft action items from this meeting\` below:

---

## Next Meeting

Thursday, Mar 6 at 10:00 AM — Sprint planning for v0.5.0

`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-roadmap",
    title: "Product Roadmap",
    icon: "🗺️",
    content: `# 2026 Product Roadmap

## Vision

Make Knobase the default workspace where knowledge workers and AI agents collaborate seamlessly.

---

## Proposed Features

1. **Real-time collaboration** — Multi-cursor editing, presence indicators, comment threads
2. **Agent marketplace** — Browse, install, and share agent configurations
3. **Mobile app** — iOS and Android with offline sync
4. **SSO / enterprise auth** — SAML 2.0, SCIM provisioning, audit logs
5. **API webhooks** — Event-driven integrations for CI/CD, Slack, Jira
6. **Voice commands** — Speech-to-text agent invocation
7. **Knowledge graph** — Visual map of document relationships and agent insights
8. **Version control** — Git-like branching for document drafts
9. **Workflow automation** — Chain multiple agents: research → draft → review → publish
10. **Analytics dashboard** — Agent usage, document engagement, team productivity metrics

---

## Priority Ranking

> 💡 **Which features matter most?** Try typing \`@openclaw prioritize these features by user impact\` below:

---

## Timeline (Draft)

| Quarter | Focus Area                    | Status      |
|---------|-------------------------------|-------------|
| Q1 2026 | Collaboration + Agent v2      | 🔄 Current  |
| Q2 2026 | Enterprise + Marketplace      | 📋 Planned  |
| Q3 2026 | Mobile + Integrations         | 📋 Planned  |
| Q4 2026 | Analytics + Workflow          | 💭 Ideation |

---

## Open Questions

- How do we price the marketplace? Revenue share vs. flat fee?
- Should mobile be native or PWA?
- What's the minimum viable enterprise feature set for SOC 2?

*This roadmap is a living document. Update it as priorities shift.*

`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-report-revenue",
    title: "Revenue Breakdown",
    icon: "💰",
    parentId: "demo-report",
    content: `# Revenue Breakdown — Q3 2025

## By Segment

| Segment     | ARR      | Growth | % of Total |
|-------------|----------|--------|------------|
| Enterprise  | $2.5M    | +48%   | 60%        |
| Mid-Market  | $1.1M    | +22%   | 26%        |
| SMB         | $0.6M    | +8%    | 14%        |

## By Region

| Region       | ARR      | Growth |
|--------------|----------|--------|
| North America| $2.9M    | +28%   |
| Europe       | $0.8M    | +18%   |
| APAC         | $0.5M    | +32%   |

## Key Deals

- **Acme Corp** — $420K ACV, 500 seats, signed Aug 15
- **Zenith Technologies** — $180K ACV, 200 seats, signed Sep 2
- **Meridian Health** — $290K ACV, 350 seats, signed Sep 18
`,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-report-metrics",
    title: "Key Metrics Deep Dive",
    icon: "📈",
    parentId: "demo-report",
    content: `# Key Metrics Deep Dive — Q3 2025

## User Engagement

- **DAU:** 12,400 (+18% QoQ)
- **WAU:** 28,600 (+15% QoQ)
- **MAU:** 45,200 (+12% QoQ)
- **DAU/MAU ratio:** 27.4% (healthy engagement)

## Retention

| Cohort    | Month 1 | Month 3 | Month 6 |
|-----------|---------|---------|---------|
| Jan 2025  | 82%     | 68%     | 54%     |
| Apr 2025  | 85%     | 72%     | —       |
| Jul 2025  | 88%     | —       | —       |

## NPS Breakdown

- **Promoters (9-10):** 48%
- **Passives (7-8):** 34%
- **Detractors (0-6):** 18%
- **NPS Score:** 62 (+8 from Q2)
`,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-roadmap-q1",
    title: "Q1 2026 Sprint Plan",
    icon: "🏃",
    parentId: "demo-roadmap",
    content: `# Q1 2026 Sprint Plan

## Sprint Goals

1. **Real-time collaboration** — Ship multi-cursor editing with Y.js
2. **Agent v2** — Inline agent mentions with prompt input
3. **Workspace invites** — Email-based invite system with roles

## Week-by-Week

| Week | Focus | Owner |
|------|-------|-------|
| W1-2 | Y.js integration + conflict resolution | Sarah |
| W3-4 | Agent mention UI + task queue | Chris |
| W5-6 | Invite system + permissions | Mike |
| W7-8 | QA, bug fixes, performance | All |

## Success Criteria

- [ ] 95% sync reliability in collab sessions
- [ ] Agent response time < 3s for simple tasks
- [ ] Invite acceptance rate > 70%
`,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-gtm",
    title: "Q4 Go-To-Market Strategy",
    icon: "🎯",
    content: `# Q4 Go-To-Market Strategy

**Owner:** Chris Lee  |  **Quarter:** Q4 2025  |  **Status:** 🟡 In Progress

Knobase is entering its most critical quarter. With $4.2M ARR at the end of Q3 and a growing enterprise pipeline, Q4 is our moment to accelerate. This document outlines the strategic pillars, go-to-market plays, and execution plan to close the year strong.

---

## Executive Summary

> 💡 **This section is empty on purpose.** Try typing \`@strategy-lead analyze our Q3 performance data and outline three main growth pillars for Q4\` below to have the Strategy Lead agent fill it in.

\u00A0

\u00A0

\u00A0

---

## Q3 Performance Snapshot

| Metric              | Q3 2025   | Q2 2025   | Change    |
|---------------------|-----------|-----------|-----------|
| ARR                 | $4.2M     | $3.4M     | +24% QoQ  |
| New Customers       | 89        | 67        | +33%      |
| Enterprise Accounts | 12        | 5         | +140%     |
| Churn Rate (SMB)    | 4.2%      | 3.8%      | +0.4pp    |
| NPS                 | 62        | 54        | +8        |
| DAU                 | 12,400    | 10,500    | +18%      |

### Q3 Churn Breakdown

| Segment     | Churn Rate | Primary Reason             | Accounts Lost |
|-------------|------------|----------------------------|---------------|
| SMB (<10)   | 6.8%       | "Too complex for our team" | 31            |
| Mid-Market  | 2.1%       | Competitor pricing         | 8             |
| Enterprise  | 0%         | —                          | 0             |

**Key insight:** SMB churn is the primary risk. Exit surveys cite onboarding complexity and lack of templates as top reasons. Enterprise retention is perfect — this is where we double down.

---

## Growth Pillars

> 💡 **This section will be populated by @strategy-lead.** Mention the agent above to see the three growth pillars for Q4 appear here.

---

## Target Accounts — Q4 Pipeline

| Company           | Segment    | Potential ACV | Stage          | Owner  |
|-------------------|------------|---------------|----------------|--------|
| Horizon Capital   | Enterprise | $380K         | Late-stage     | Chris  |
| Apex Research     | Enterprise | $210K         | Demo scheduled | Sarah  |
| BrightPath Health | Enterprise | $290K         | Proposal sent  | Chris  |
| Nimbus Tech (x3)  | Mid-Market | $45K each     | Trial          | Mike   |

Total pipeline: ~$1.07M potential new ARR in Q4.

---

## Positioning

**Current tagline:** "The open-source AI workspace"

**Proposed Q4 messaging:** "Your AI teammates, not just your AI tools."

This shift positions Knobase against Notion AI and Confluence AI — both of which offer *AI assistants* — by emphasizing *agent orchestration*: multiple AI agents collaborating with humans in the same document.

---

## Open Items

- [ ] @data-analyst — pull exact churn cohort data for the SMB segment
- [ ] @compliance-officer — review the BrightPath Health proposal for HIPAA requirements
- [ ] @seo-expert — optimize the public-facing positioning page for search
- [ ] Sarah — finalize the Apex Research demo script by Oct 10
`,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "demo-join",
    title: "Join Knobase",
    icon: "🚀",
    content: `# You've seen what Knobase can do.

---

## What you just experienced:

- ✅ **Agent Mentions** — @mention AI agents right in your document
- ✅ **Live Presence** — Watch agents think and respond in real-time
- ✅ **Agent Queue** — Every task tracked from queued to completed
- ✅ **File Uploads** — Drag, drop, and embed files instantly
- ✅ **Rich Documents** — Tables, headings, code blocks, and more

---

## What's waiting for you:

- 🔗 **Connect your own AI** — OpenAI, Anthropic, Google, or any MCP-compatible provider
- 👥 **Real-time collaboration** — Invite teammates, see their cursors, co-edit live
- 🏪 **Agent Templates** — Browse and install pre-built agent configurations
- 📁 **Persistent storage** — Your files and documents, saved and synced
- 🔒 **Enterprise ready** — SSO, audit logs, and workspace permissions

---

## Create your free account

No credit card required. Free forever for personal use.

*Click "Get started free" in the sidebar to create your account.*

`,
    createdAt: now,
    updatedAt: now,
  },
];
