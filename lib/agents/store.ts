import type { Agent, AgentPersona, AgentSuggestion } from "./types";

export type { Agent };

const LS_PREFIX = "knobase-app:";
const AGENTS_KEY = `${LS_PREFIX}agents`;
const SUGGESTIONS_KEY = `${LS_PREFIX}agent-suggestions`;
const PERSONAS_KEY = `${LS_PREFIX}agent-personas`;
const DOC_PERSONAS_KEY = `${LS_PREFIX}doc-persona-map`;
const DOC_AGENTS_KEY = `${LS_PREFIX}doc-agents-map`;
const ACTIVE_DOC_AGENT_KEY = `${LS_PREFIX}active-doc-agent`;

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
  if (typeof window === "undefined") return;
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
  partial: Partial<Omit<Agent, "id" | "createdAt" | "updatedAt">>,
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
  patch: Partial<
    Pick<Agent, "name" | "avatar" | "color" | "status" | "personality">
  >,
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
  },
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

export function getSuggestionsForDocument(
  documentId: string,
): AgentSuggestion[] {
  return readSuggestions()
    .filter((s) => s.documentId === documentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateSuggestionStatus(
  id: string,
  status: "accepted" | "rejected",
): void {
  const all = readSuggestions();
  const idx = all.findIndex((s) => s.id === id);
  if (idx !== -1) {
    all[idx].status = status;
    writeSuggestions(all);
  }
}

// ----------------------------------------------------------------
// Persona store
// ----------------------------------------------------------------

function readPersonas(): AgentPersona[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PERSONAS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function writePersonas(personas: AgentPersona[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(PERSONAS_KEY, JSON.stringify(personas));
}

export function listPersonas(): AgentPersona[] {
  return readPersonas();
}

export function getPersona(id: string): AgentPersona | null {
  return readPersonas().find((p) => p.id === id) ?? null;
}

export function getDefaultPersona(): AgentPersona | null {
  return readPersonas().find((p) => p.isDefault) ?? null;
}

export function createPersona(
  partial: Omit<AgentPersona, "id" | "createdAt" | "updatedAt">,
): AgentPersona {
  const now = new Date().toISOString();
  const persona: AgentPersona = {
    ...partial,
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
  };
  const personas = readPersonas();
  // If setting as default, unset others
  if (persona.isDefault) {
    personas.forEach((p) => (p.isDefault = false));
  }
  personas.push(persona);
  writePersonas(personas);
  return persona;
}

export function updatePersona(
  id: string,
  patch: Partial<Omit<AgentPersona, "id" | "createdAt">>,
): AgentPersona | null {
  const personas = readPersonas();
  const idx = personas.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  // If setting as default, unset others
  if (patch.isDefault) {
    personas.forEach((p) => (p.isDefault = false));
  }
  Object.assign(personas[idx], patch, { updatedAt: new Date().toISOString() });
  writePersonas(personas);
  return personas[idx];
}

export function deletePersona(id: string): boolean {
  const personas = readPersonas();
  const filtered = personas.filter((p) => p.id !== id);
  if (filtered.length === personas.length) return false;
  writePersonas(filtered);
  return true;
}

export function setDefaultPersona(id: string): void {
  const personas = readPersonas();
  personas.forEach((p) => (p.isDefault = p.id === id));
  writePersonas(personas);
}

export function exportPersonas(): string {
  return JSON.stringify(readPersonas(), null, 2);
}

export function importPersonas(json: string): number {
  try {
    const imported = JSON.parse(json) as AgentPersona[];
    if (!Array.isArray(imported)) return 0;
    const existing = readPersonas();
    const existingIds = new Set(existing.map((p) => p.id));
    let count = 0;
    for (const p of imported) {
      if (!p.id || !p.name) continue;
      if (existingIds.has(p.id)) {
        // Update existing
        const idx = existing.findIndex((e) => e.id === p.id);
        if (idx !== -1) existing[idx] = { ...existing[idx], ...p, updatedAt: new Date().toISOString() };
      } else {
        existing.push(p);
      }
      count++;
    }
    writePersonas(existing);
    return count;
  } catch {
    return 0;
  }
}

// Per-document persona overrides
function readDocPersonaMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DOC_PERSONAS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function getDocumentPersona(documentId: string): AgentPersona | null {
  const map = readDocPersonaMap();
  const personaId = map[documentId];
  if (!personaId) return null;
  return getPersona(personaId);
}

export function setDocumentPersona(documentId: string, personaId: string): void {
  const map = readDocPersonaMap();
  map[documentId] = personaId;
  if (typeof window !== "undefined") {
    localStorage.setItem(DOC_PERSONAS_KEY, JSON.stringify(map));
  }
}

export function clearDocumentPersona(documentId: string): void {
  const map = readDocPersonaMap();
  delete map[documentId];
  if (typeof window !== "undefined") {
    localStorage.setItem(DOC_PERSONAS_KEY, JSON.stringify(map));
  }
}

// ----------------------------------------------------------------
// Multi-agent document assignments
// ----------------------------------------------------------------

/** Map of documentId → agentId[] */
function readDocAgentsMap(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(DOC_AGENTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeDocAgentsMap(map: Record<string, string[]>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DOC_AGENTS_KEY, JSON.stringify(map));
}

/** Get all agents assigned to a document */
export function getDocumentAgents(documentId: string): Agent[] {
  const map = readDocAgentsMap();
  const agentIds = map[documentId] ?? [];
  const agents = listAgents();
  return agentIds
    .map((id) => agents.find((a) => a.id === id))
    .filter((a): a is Agent => a !== undefined);
}

/** Assign an agent to a document */
export function assignAgentToDocument(documentId: string, agentId: string): void {
  const map = readDocAgentsMap();
  const agentIds = map[documentId] ?? [];
  if (!agentIds.includes(agentId)) {
    agentIds.push(agentId);
    map[documentId] = agentIds;
    writeDocAgentsMap(map);
  }
}

/** Remove an agent from a document */
export function removeAgentFromDocument(documentId: string, agentId: string): void {
  const map = readDocAgentsMap();
  const agentIds = map[documentId] ?? [];
  map[documentId] = agentIds.filter((id) => id !== agentId);
  writeDocAgentsMap(map);
}

/** Map of documentId → currently active agentId */
function readActiveDocAgent(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ACTIVE_DOC_AGENT_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

/** Get the currently active agent for a document */
export function getActiveDocumentAgent(documentId: string): Agent | null {
  const map = readActiveDocAgent();
  const agentId = map[documentId];
  if (!agentId) {
    // Fall back to first assigned agent, or default agent
    const assigned = getDocumentAgents(documentId);
    return assigned[0] ?? getDefaultAgent();
  }
  return getAgent(agentId) ?? getDefaultAgent();
}

/** Set the active agent for a document */
export function setActiveDocumentAgent(documentId: string, agentId: string): void {
  const map = readActiveDocAgent();
  map[documentId] = agentId;
  if (typeof window !== "undefined") {
    localStorage.setItem(ACTIVE_DOC_AGENT_KEY, JSON.stringify(map));
  }
}

