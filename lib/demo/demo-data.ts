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
    id: "demo-harrow",
    title: "Alexander Chen — Living Profile",
    icon: "🎓",
    content: `# Alexander Chen — Living Student Profile

**Year Group:** Year 10  |  **House:** Churchill  |  **Form Tutor:** Ms. R. Hartley  |  **Head of House:** Mr. J. Davies

**SEN Status:** Mild SpLD (reading fluency / processing speed) — IEP active  |  **Boarding Status:** Full boarder

**Profile Last Updated:** 3 hours ago by @pastoral-care

> 💡 **This is a Living Profile.** The AI agents below are actively reading, analysing, and writing to this document in real time. Each agent specialises in a different aspect of Alexander's education — from maths remediation to pastoral well-being to university counselling.

\u00A0

\u00A0

\u00A0

---

## Student Overview

| Field | Detail |
|-------|--------|
| Date of Birth | 14 March 2011 |
| Nationality | British / Hong Kong SAR (dual) |
| Languages | English (native), Cantonese (fluent), Mandarin (intermediate) |
| Entry Year | Year 7 (September 2022) |
| Scholarship | Academic Exhibition |
| Duke of Edinburgh | Silver Award (in progress) |

**Parent / Guardian Contact:** Mr. & Mrs. David Chen — david.chen@email.com | +852 9XXX XXXX

---

## Academic Trajectory — Michaelmas Term 2025

### Current Subject Overview

| Subject | Teacher | Current Grade | Year 9 Final | Trend | Notes |
|---------|---------|---------------|-------------|-------|-------|
| Physics | Dr. A. Kapoor | A (81%) | A (79%) | ✅ Improving | Top quartile of cohort |
| Further Maths | Mr. L. Okonkwo | C+ (65%) | B+ (78%) | 🔻 Declining | See @math-tutor remediation below |
| English Literature | Ms. R. Hartley | B- (62%) | B (70%) | 🔻 Declining | Reading comprehension drop flagged |
| Computer Science | Dr. S. Patel | A* (88%) | A (83%) | ✅ Improving | Exceptional coursework project |
| Chemistry | Mrs. F. Bolton | B+ (74%) | B+ (73%) | ➡️ Stable | — |
| Geography | Mr. T. Reeves | B (71%) | B (72%) | ➡️ Stable | — |
| History | Ms. K. Chambers | B (69%) | B- (66%) | ✅ Improving | Strong essay structure development |
| Mandarin | Ms. Y. Liu | A- (77%) | B+ (75%) | ✅ Improving | Heritage speaker advantage |

### Grade Trajectory — Further Maths (Diagnostic Assessments)

| Assessment | Date | Score | Topic | Trend |
|-----------|------|-------|-------|-------|
| Diagnostic 4 | 12 Sep | 82% | Algebra & Functions | ✅ |
| Diagnostic 5 | 3 Oct | 76% | Trigonometric Identities | ✅ |
| Diagnostic 6 | 24 Oct | 71% | Introduction to Calculus | ⚠️ |
| Diagnostic 7 | 14 Nov | 65% | Differentiation & Chain Rule | 🔻 |

---

## Extracurricular & Leadership

| Activity | Role | Status | Achievements |
|----------|------|--------|-------------|
| VEX Robotics Club | **Team Captain** | Active | Led team to APAC Regional Semi-Finals (2025); designed autonomous line-follower |
| School Orchestra | Second Violin | Active | Performed at the annual Harrow Schools Music Festival |
| Duke of Edinburgh | Participant | Silver (in progress) | Completed Bronze (Year 9); expedition planning underway |
| Debating Society | Member | Active | Reached quarter-finals, Harrow Inter-House Debating Cup |
| Cricket | House team | Seasonal | Churchill House U15 squad |

### Teacher Comment — VEX Robotics (Dr. S. Patel, Nov 2025)

> Alexander has shown exceptional leadership this term. He restructured the team's workflow into subsystem groups (chassis, sensors, programming) and introduced weekly design reviews — a level of project management unusual for a Year 10 student. His technical write-up for the regional competition was the strongest I've seen in five years of supervising the club.

---

## Inclusive Education — Current Accommodations

**Identified Need:** Mild Specific Learning Difficulty (SpLD) — primarily affecting reading fluency and processing speed.

| Accommodation | Status | Last Reviewed |
|--------------|--------|---------------|
| +25% extra time on timed assessments | ✅ Active | Sep 2025 |
| Preferential seating (front-centre) | ✅ Active | Sep 2025 |
| Assistive technology (Read&Write) | ✅ Active | Sep 2025 |
| Audiobook access for set texts | ✅ Active | Nov 2025 |
| Visual organiser templates | 📋 Pending | Recommended by @inclusive-ed |

**Reading Age:** 13.8 years (target: 14.5 by March 2026)  |  **Processing Speed:** 42nd percentile  |  **Verbal Comprehension:** 78th percentile

---

## Active Agent Workflows

The following AI agents are actively monitoring and contributing to Alexander's Living Profile. Each agent reads and writes to this document as new data arrives. Their latest interactions appear at the top of this profile.

| Agent | Role | Current Status |
|-------|------|---------------|
| @pastoral-care | Weekly pulse checks and well-being monitoring | ⏳ Processing a cross-reference of attendance and boarding house data |
| @math-tutor | Maths diagnostics and personalised remediation | ✅ Generated a 3-week calculus remediation plan |
| @inclusive-ed | SEN support and differentiated learning | 📋 Queued — adjusting Year 10 English reading list |
| @uni-counselor | University pathway and subject selection guidance | ✅ Recommended Year 11 subject adjustments and shortlisted universities |

---

## Profile Timeline

| Date | Agent / Person | Event |
|------|---------------|-------|
| 14 Nov 2025 | @math-tutor | Diagnostic 7 score (65%) triggered automatic remediation plan generation |
| 12 Nov 2025 | @pastoral-care | Flagged cross-subject decline + boarding house withdrawal pattern |
| 10 Nov 2025 | Ms. Hartley | Requested @inclusive-ed to adjust English reading list |
| 8 Nov 2025 | @uni-counselor | Generated Year 11 subject selection recommendation |
| 3 Nov 2025 | Dr. Patel | Updated VEX Robotics teacher comment |
| 24 Oct 2025 | @math-tutor | Noted initial calculus score dip — monitoring status |
| Sep 2025 | SEN Dept. | Annual IEP review completed — accommodations renewed |
| Sep 2025 | System | Michaelmas Term 2025 academic data sync from iSAMS |

---

*This is a Living Profile — it evolves continuously from Year 7 intake through to graduation. Every agent interaction, grade update, and pastoral note is permanently recorded, creating a 12-year longitudinal record of Alexander's intellectual and personal journey.*

`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-harrow-academics",
    title: "Full Academic History",
    icon: "📚",
    parentId: "demo-harrow",
    content: `# Alexander Chen — Full Academic History

## Year 9 Final Results (2024–2025)

| Subject | Final Grade | Exam % | Teacher Comment |
|---------|------------|--------|----------------|
| Physics | A (79%) | 81% | "Alexander demonstrates excellent practical skills and strong conceptual understanding." |
| Maths | B+ (78%) | 76% | "Very capable. Needs to show more working in exam conditions." |
| English Literature | B (70%) | 68% | "Thoughtful analysis but reading fluency remains a barrier in timed conditions." |
| Computer Science | A (83%) | 85% | "Outstanding. Year 9 project was the best in cohort — a self-navigating robot." |
| Chemistry | B+ (73%) | 71% | "Solid grasp of theory. Lab technique is excellent." |
| Geography | B (72%) | 70% | "Good fieldwork skills. Written responses could be more structured." |
| History | B- (66%) | 64% | "Improving steadily. Essay structure has developed well this year." |
| Mandarin | B+ (75%) | 78% | "Heritage speaker advantage evident. Written characters need practice." |

## Year 8 Summary (2023–2024)

Overall position: 48th / 160 (top 30%). Commended for excellence in Science and Computing. Awarded the Year 8 STEM Prize.

## Year 7 Summary (2022–2023)

Overall position: 62nd / 158. Adjustment period noted (first term boarding). Strong improvement in Lent and Summer terms. Identified for SpLD screening in Michaelmas term — formal diagnosis confirmed February 2023.
`,
    createdAt: now,
    updatedAt: now,
  },

  {
    id: "demo-harrow-extracurricular",
    title: "Extracurricular Portfolio",
    icon: "🏆",
    parentId: "demo-harrow",
    content: `# Alexander Chen — Extracurricular Portfolio

## VEX Robotics Club

**Role:** Team Captain (elected Sep 2025)  |  **Supervisor:** Dr. S. Patel

### Competition Record

| Event | Date | Result | Alexander's Role |
|-------|------|--------|-----------------|
| Harrow Inter-House Robotics | Mar 2024 | 🥇 1st (Churchill) | Lead programmer |
| APAC VEX Qualifier (Hong Kong) | Jun 2024 | 🥈 2nd | Driver & programmer |
| UK VEX Regional — South East | Nov 2025 | Semi-finalist | Team Captain, systems integrator |

### Current Project: Autonomous Navigation Robot

Alexander is leading the design of a robot that uses LIDAR sensors and a custom pathfinding algorithm (A*) for autonomous warehouse navigation. The project integrates his interests in Physics (sensor physics), Computer Science (algorithm design), and Maths (coordinate geometry).

---

## Duke of Edinburgh Award

| Level | Status | Completed |
|-------|--------|-----------|
| Bronze | ✅ Complete | June 2024 |
| Silver | 🔄 In Progress | Expected March 2026 |

**Silver components:**
- Volunteering: Coding mentor at local primary school (12 weeks)
- Physical: Cricket training and house matches
- Skill: Learning Mandarin calligraphy
- Expedition: Peak District — route planning in progress

---

## Music — School Orchestra

**Instrument:** Violin (Grade 6, ABRSM)  |  **Section:** Second Violin

Performances: Annual Harrow Schools Music Festival (Dec 2024, Dec 2025), Churchill House Concert (termly)

---

## Debating Society

Quarter-finalist in the Harrow Inter-House Debating Cup (Michaelmas 2025). Motion: "This house believes AI will do more harm than good in education." Alexander spoke for the proposition.
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
