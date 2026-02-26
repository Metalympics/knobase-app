"use client";

// ── Demo State Management ──
// Persists demo document to localStorage for zero-friction onboarding.
// On signup, transfers demo content to a real account document.

import { createDocument, updateDocument } from "@/lib/documents/store";

const DEMO_STORAGE_KEY = "knobase:demo:document";
const DEMO_STARTED_KEY = "knobase:demo:started";

export interface DemoState {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// ── Persistence helpers ──

export function saveDemoState(state: DemoState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    DEMO_STORAGE_KEY,
    JSON.stringify({ ...state, updatedAt: new Date().toISOString() })
  );
}

export function loadDemoState(): DemoState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as DemoState) : null;
  } catch {
    return null;
  }
}

export function clearDemoState(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_STORAGE_KEY);
  localStorage.removeItem(DEMO_STARTED_KEY);
}

export function hasDemoState(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(DEMO_STORAGE_KEY) !== null;
}

// ── Demo session tracking ──

export function markDemoStarted(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_STARTED_KEY, new Date().toISOString());
}

export function getDemoStartedAt(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(DEMO_STARTED_KEY);
}

/** How many minutes since the user started the demo */
export function getDemoMinutesElapsed(): number {
  const started = getDemoStartedAt();
  if (!started) return 0;
  return (Date.now() - new Date(started).getTime()) / 60_000;
}

// ── Create / get demo doc ID ──

export function getOrCreateDemoDocId(): string {
  const existing = loadDemoState();
  if (existing) return existing.id;

  const id = `demo-${Date.now()}`;
  const now = new Date().toISOString();
  saveDemoState({
    id,
    title: "Untitled Document",
    content: "",
    createdAt: now,
    updatedAt: now,
  });
  markDemoStarted();
  return id;
}

// ── Transfer demo document to real account ──

export function transferDemoToLocalAccount(): string | null {
  const demo = loadDemoState();
  if (!demo) return null;

  // Create a real localStorage-backed document with the demo content
  const realDoc = createDocument(demo.title || "Untitled Document");
  if (demo.content) {
    updateDocument(realDoc.id, { content: demo.content });
  }

  // Clean up demo state
  clearDemoState();

  return realDoc.id;
}

// ── Pre-loaded demo content ──

export const DEMO_DOCUMENT_CONTENT = `# Welcome to Knobase

Try typing **@claw** anywhere below to see your AI teammate in action.

## What makes Knobase different?

Unlike chat-based AI tools, your AI agent writes **directly in your document** — like a real collaborator.

### Try it now

1. Click below this line
2. Type \`@claw\` and then a request like "write a summary of this page"
3. Watch the response appear inline, right where you need it

---

*Your work is saved automatically. Create a free account to keep it forever.*
`;
