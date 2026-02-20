export interface Webhook {
  id: string;
  url: string;
  events: WebhookEvent[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

export type WebhookEvent =
  | "document.created"
  | "document.updated"
  | "document.deleted"
  | "agent.suggested"
  | "comment.added";

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: "document.created", label: "Document Created", description: "When a new document is created" },
  { value: "document.updated", label: "Document Updated", description: "When a document is edited" },
  { value: "document.deleted", label: "Document Deleted", description: "When a document is removed" },
  { value: "agent.suggested", label: "Agent Suggestion", description: "When an AI agent makes a suggestion" },
  { value: "comment.added", label: "Comment Added", description: "When a comment is posted" },
];

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: WebhookEvent;
  payload: unknown;
  statusCode?: number;
  response?: string;
  success: boolean;
  attemptCount: number;
  timestamp: string;
}

const LS_PREFIX = "knobase-app:";
const WEBHOOKS_KEY = `${LS_PREFIX}webhooks`;
const DELIVERIES_KEY = `${LS_PREFIX}webhook-deliveries`;

function readWebhooks(): Webhook[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(WEBHOOKS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeWebhooks(hooks: Webhook[]): void {
  localStorage.setItem(WEBHOOKS_KEY, JSON.stringify(hooks));
}

export function listWebhooks(): Webhook[] {
  return readWebhooks();
}

export function getWebhook(id: string): Webhook | null {
  return readWebhooks().find((w) => w.id === id) ?? null;
}

export function createWebhook(partial: {
  url: string;
  events: WebhookEvent[];
  secret?: string;
  active?: boolean;
}): Webhook {
  const hooks = readWebhooks();
  const webhook: Webhook = {
    id: crypto.randomUUID(),
    url: partial.url,
    events: partial.events,
    secret: partial.secret ?? generateSecret(),
    active: partial.active ?? true,
    createdAt: new Date().toISOString(),
    failureCount: 0,
  };
  hooks.push(webhook);
  writeWebhooks(hooks);
  return webhook;
}

export function updateWebhook(
  id: string,
  patch: Partial<Pick<Webhook, "url" | "events" | "secret" | "active">>
): Webhook | null {
  const hooks = readWebhooks();
  const idx = hooks.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  Object.assign(hooks[idx], patch);
  writeWebhooks(hooks);
  return hooks[idx];
}

export function deleteWebhook(id: string): boolean {
  const hooks = readWebhooks();
  const filtered = hooks.filter((w) => w.id !== id);
  if (filtered.length === hooks.length) return false;
  writeWebhooks(filtered);
  return true;
}

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

// Delivery log (client-side)
function readDeliveries(): WebhookDelivery[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DELIVERIES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function writeDeliveries(deliveries: WebhookDelivery[]): void {
  const trimmed = deliveries.slice(-500);
  localStorage.setItem(DELIVERIES_KEY, JSON.stringify(trimmed));
}

export function getDeliveries(webhookId: string): WebhookDelivery[] {
  return readDeliveries()
    .filter((d) => d.webhookId === webhookId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function addDelivery(delivery: WebhookDelivery): void {
  const all = readDeliveries();
  all.push(delivery);
  writeDeliveries(all);
}
