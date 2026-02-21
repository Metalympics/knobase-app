import type { Agent, AgentSuggestion } from "./types";

export type { Agent };

const LS_PREFIX = "knobase-app:";
const AGENTS_KEY = `${LS_PREFIX}agents`;
const SUGGESTIONS_KEY = `${LS_PREFIX}agent-suggestions`;

const DEFAULT_AGENT: Agent = {
  id: "claw-default",
  name: "Assistant",
  avatar: "🐾",
  color: "#8B5CF6",
  status: "online",
  personality:
    "Helpful, concise, and collaborative. Explains reasoning behind every suggestion.",
  capabilities: ["read", "write", "suggest", "chat"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

function readAgents(): Agent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(AGENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeAgents(agents: Agent[]): void {
  localStorage.setItem(AGENTS_KEY, JSON.stringify(agents));
}

export function listAgents(): Agent[] {
  const agents = readAgents();
  if (agents.length === 0) {
    writeAgents([DEFAULT_AGENT]);
    return [DEFAULT_AGENT];
  }
  return agents;
}

export function getAgent(id: string): Agent | null {
  return readAgents().find((a) => a.id === id) ?? null;
}

export function getDefaultAgent(): Agent {
  const agents = listAgents();
  return agents[0];
}

export function createAgent(
  partial: Partial<Omit<Agent, "id" | "createdAt" | "updatedAt">>
): Agent {
  const now = new Date().toISOString();
  const agent: Agent = {
    id: crypto.randomUUID(),
    name: partial.name ?? "Agent",
    avatar: partial.avatar ?? "🤖",
    color: partial.color ?? "#8B5CF6",
    status: partial.status ?? "online",
    personality: partial.personality ?? DEFAULT_AGENT.personality,
    capabilities: partial.capabilities ?? ["read", "write", "suggest", "chat"],
    createdAt: now,
    updatedAt: now,
  };
  const agents = readAgents();
  agents.push(agent);
  writeAgents(agents);
  return agent;
}

export function updateAgent(
  id: string,
  patch: Partial<Pick<Agent, "name" | "avatar" | "color" | "status" | "personality">>
): Agent | null {
  const agents = readAgents();
  const idx = agents.findIndex((a) => a.id === id);
  if (idx === -1) return null;
  const agent = agents[idx];
  Object.assign(agent, patch, { updatedAt: new Date().toISOString() });
  writeAgents(agents);
  return agent;
}

export function deleteAgent(id: string): boolean {
  const agents = readAgents();
  const filtered = agents.filter((a) => a.id !== id);
  if (filtered.length === agents.length) return false;
  writeAgents(filtered);
  return true;
}

export function updateAgentName(id: string, name: string): Agent | null {
  return updateAgent(id, { name });
}

export function inviteAgent(
  name: string,
  options?: {
    avatar?: string;
    color?: string;
    personality?: string;
  }
): Agent {
  return createAgent({
    name,
    avatar: options?.avatar ?? "🤖",
    color: options?.color ?? "#8B5CF6",
    personality: options?.personality,
  });
}

// Suggestions store
function readSuggestions(): AgentSuggestion[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SUGGESTIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writeSuggestions(suggestions: AgentSuggestion[]): void {
  localStorage.setItem(SUGGESTIONS_KEY, JSON.stringify(suggestions));
}

export function addSuggestion(suggestion: AgentSuggestion): void {
  const all = readSuggestions();
  all.push(suggestion);
  writeSuggestions(all);
}

export function getSuggestionsForDocument(documentId: string): AgentSuggestion[] {
  return readSuggestions()
    .filter((s) => s.documentId === documentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateSuggestionStatus(
  id: string,
  status: "accepted" | "rejected"
): void {
  const all = readSuggestions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx !== -1) {
    all[idx].status = status;
    writeSuggestions(all);
  }
}
