import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".knobase-data");

function ensureDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function filePath(collection: string): string {
  ensureDir();
  return join(DATA_DIR, `${collection}.json`);
}

export function readCollection<T>(collection: string): T[] {
  const path = filePath(collection);
  if (!existsSync(path)) return [];
  try {
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return [];
  }
}

export function writeCollection<T>(collection: string, data: T[]): void {
  writeFileSync(filePath(collection), JSON.stringify(data, null, 2));
}

// --- Documents ---

export interface ServerDocument {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  parentId?: string;
  wordCount?: number;
  author?: string;
}

export function listServerDocuments(): ServerDocument[] {
  return readCollection<ServerDocument>("documents").sort(
    (a, b) => b.updatedAt.localeCompare(a.updatedAt)
  );
}

export function getServerDocument(id: string): ServerDocument | null {
  return readCollection<ServerDocument>("documents").find((d) => d.id === id) ?? null;
}

export function createServerDocument(doc: Omit<ServerDocument, "id" | "createdAt" | "updatedAt">): ServerDocument {
  const now = new Date().toISOString();
  const newDoc: ServerDocument = {
    id: crypto.randomUUID(),
    createdAt: now,
    updatedAt: now,
    ...doc,
  };
  const docs = readCollection<ServerDocument>("documents");
  docs.push(newDoc);
  writeCollection("documents", docs);
  return newDoc;
}

export function updateServerDocument(
  id: string,
  patch: Partial<Pick<ServerDocument, "title" | "content" | "tags">>
): ServerDocument | null {
  const docs = readCollection<ServerDocument>("documents");
  const idx = docs.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  Object.assign(docs[idx], patch, { updatedAt: new Date().toISOString() });
  if (patch.content !== undefined) {
    docs[idx].wordCount = patch.content.split(/\s+/).filter(Boolean).length;
  }
  writeCollection("documents", docs);
  return docs[idx];
}

export function deleteServerDocument(id: string): boolean {
  const docs = readCollection<ServerDocument>("documents");
  const filtered = docs.filter((d) => d.id !== id);
  if (filtered.length === docs.length) return false;
  writeCollection("documents", filtered);
  return true;
}

// --- Collections ---

export interface ServerCollection {
  id: string;
  name: string;
  description: string;
  documentIds: string[];
  icon: string;
  color: string;
  parentId?: string;
  order: number;
  createdAt: string;
}

export function listServerCollections(): ServerCollection[] {
  return readCollection<ServerCollection>("collections").sort((a, b) => a.order - b.order);
}

export function createServerCollection(
  col: Omit<ServerCollection, "id" | "createdAt" | "order">
): ServerCollection {
  const all = readCollection<ServerCollection>("collections");
  const newCol: ServerCollection = {
    id: crypto.randomUUID(),
    order: all.length,
    createdAt: new Date().toISOString(),
    ...col,
  };
  all.push(newCol);
  writeCollection("collections", all);
  return newCol;
}

// --- Agents ---

export interface ServerAgent {
  id: string;
  name: string;
  avatar: string;
  color: string;
  status: string;
  personality: string;
  capabilities: string[];
  createdAt: string;
  updatedAt: string;
}

const DEFAULT_AGENT: ServerAgent = {
  id: "claw-default",
  name: "Claw",
  avatar: "🐾",
  color: "#8B5CF6",
  status: "online",
  personality: "Helpful, concise, and collaborative. Explains reasoning behind every suggestion.",
  capabilities: ["read", "write", "suggest", "chat"],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function listServerAgents(): ServerAgent[] {
  const agents = readCollection<ServerAgent>("agents");
  if (agents.length === 0) {
    writeCollection("agents", [DEFAULT_AGENT]);
    return [DEFAULT_AGENT];
  }
  return agents;
}

// --- API Keys (server-side) ---

export interface ServerApiKey {
  id: string;
  name: string;
  key: string;
  tier: "free" | "pro" | "enterprise";
  createdAt: string;
  lastUsedAt?: string;
}

export function getServerApiKeys(): ServerApiKey[] {
  return readCollection<ServerApiKey>("api-keys");
}

export function saveServerApiKeys(keys: ServerApiKey[]): void {
  writeCollection("api-keys", keys);
}

export function findApiKeyByToken(token: string): ServerApiKey | null {
  return getServerApiKeys().find((k) => k.key === token) ?? null;
}

export function createServerApiKey(name: string, tier: ServerApiKey["tier"] = "free"): ServerApiKey {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const key: ServerApiKey = {
    id: crypto.randomUUID(),
    name,
    key: "kb_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(""),
    tier,
    createdAt: new Date().toISOString(),
  };
  const all = getServerApiKeys();
  all.push(key);
  saveServerApiKeys(all);
  return key;
}

// --- Webhooks ---

export interface ServerWebhook {
  id: string;
  url: string;
  events: string[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

export function listServerWebhooks(): ServerWebhook[] {
  return readCollection<ServerWebhook>("webhooks");
}

export function getServerWebhook(id: string): ServerWebhook | null {
  return listServerWebhooks().find((w) => w.id === id) ?? null;
}

export function createServerWebhook(
  wh: Omit<ServerWebhook, "id" | "createdAt" | "failureCount">
): ServerWebhook {
  const all = listServerWebhooks();
  const webhook: ServerWebhook = {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    failureCount: 0,
    ...wh,
  };
  all.push(webhook);
  writeCollection("webhooks", all);
  return webhook;
}

export function updateServerWebhook(
  id: string,
  patch: Partial<Pick<ServerWebhook, "url" | "events" | "secret" | "active">>
): ServerWebhook | null {
  const all = listServerWebhooks();
  const idx = all.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  Object.assign(all[idx], patch);
  writeCollection("webhooks", all);
  return all[idx];
}

export function deleteServerWebhook(id: string): boolean {
  const all = listServerWebhooks();
  const filtered = all.filter((w) => w.id !== id);
  if (filtered.length === all.length) return false;
  writeCollection("webhooks", filtered);
  return true;
}

// --- Webhook delivery logs ---

export interface WebhookDeliveryLog {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  statusCode?: number;
  response?: string;
  success: boolean;
  attemptCount: number;
  timestamp: string;
}

export function getWebhookDeliveryLogs(webhookId: string): WebhookDeliveryLog[] {
  return readCollection<WebhookDeliveryLog>("webhook-logs")
    .filter((l) => l.webhookId === webhookId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 50);
}

export function addWebhookDeliveryLog(log: WebhookDeliveryLog): void {
  const all = readCollection<WebhookDeliveryLog>("webhook-logs");
  all.push(log);
  if (all.length > 1000) all.splice(0, all.length - 1000);
  writeCollection("webhook-logs", all);
}
