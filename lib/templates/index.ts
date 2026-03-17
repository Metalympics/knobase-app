/**
 * Onboarding Templates
 * Seeded into every new workspace on creation.
 * Content is plain markdown — rendered by the TipTap editor from content_md.
 */

export interface PageTemplate {
  title: string;
  icon: string;
  content_md: string;
  position: number;
}

export const ONBOARDING_TEMPLATES: PageTemplate[] = [
  {
    title: "Getting Started",
    icon: "👋",
    position: 0,
    content_md: `# Getting Started with Knobase

Welcome to your workspace. Knobase is where you and your AI agents collaborate in the same document — no switching tabs, no copy-pasting.

---

## 1. Agent Mentions

Type \`@\` anywhere in a document to summon an AI agent inline. The agent reads your document context and writes its response right where you are.

**Try it now** — place your cursor on the line below and type \`@\` to see a list of available agents:

\u00A0

\u00A0

\u00A0

The agent's response will appear right here in the document.

---

## 2. Agent Queue

Every \`@mention\` creates a tracked task. Watch it move through **Queued → Processing → Complete** in real time.

Open the **Agent Queue** panel in the sidebar (the clock icon) to see all your active and completed tasks. Try mentioning an agent above and watch the queue update live.

---

## 3. Sub-pages

Every document can have child pages nested beneath it — great for breaking down a topic, adding supporting research, or keeping drafts organised.

Hover over any document in the sidebar and click **+** to add a sub-page.

---

## 4. What's next?

Your second document — **Meeting Notes** — is a ready-to-use template. Open it to see an example of how to combine structured content with inline agent prompts.

Delete these pages whenever you're ready and build something of your own.
`,
  },
  {
    title: "Meeting Notes",
    icon: "📝",
    position: 1,
    content_md: `# Meeting Notes

**Date:** &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;  |  **Attendees:**   |  **Facilitator:** 

---

## Summary

> 💡 After the meeting, type \`@openclaw summarize this meeting\` below to auto-generate a recap from your notes.

\u00A0

\u00A0

---

## Agenda

1. 
2. 
3. 

---

## Notes

**Topic 1**
- 

**Topic 2**
- 

**Topic 3**
- 

---

## Decisions Made

- 

---

## Action Items

> 💡 Type \`@openclaw draft action items from this meeting\` below to extract tasks automatically.

\u00A0

\u00A0

---

## Next Meeting

**Date:**   |  **Location / Link:** 
`,
  },
];
