/**
 * Workspace webhook store — Supabase-backed.
 *
 * Replaces the old localStorage-only implementation.
 * All functions are async. The `schoolId` comes from the Supabase session
 * (auth_profiles.last_active_school_id) when not explicitly provided.
 */

import { createClient } from "@/lib/supabase/client";

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

export const WEBHOOK_EVENTS: {
  value: WebhookEvent;
  label: string;
  description: string;
}[] = [
  {
    value: "document.created",
    label: "Document Created",
    description: "When a new document is created",
  },
  {
    value: "document.updated",
    label: "Document Updated",
    description: "When a document is edited",
  },
  {
    value: "document.deleted",
    label: "Document Deleted",
    description: "When a document is removed",
  },
  {
    value: "agent.suggested",
    label: "Agent Suggestion",
    description: "When an AI agent makes a suggestion",
  },
  {
    value: "comment.added",
    label: "Comment Added",
    description: "When a comment is posted",
  },
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

// ── Helpers ───────────────────────────────────────────────────────────

function generateSecret(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "whsec_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToWebhook(row: any): Webhook {
  return {
    id: row.id,
    url: row.url,
    events: (row.events ?? []) as WebhookEvent[],
    secret: row.secret,
    active: row.is_active,
    createdAt: row.created_at,
    lastTriggeredAt: row.last_triggered_at ?? undefined,
    failureCount: row.failure_count ?? 0,
  };
}

/** Returns the active school_id from Supabase auth → auth_profiles. */
async function getSchoolId(): Promise<string | null> {
  // Prefer explicit localStorage cache (set when user navigates to a workspace)
  if (typeof window !== "undefined") {
    const cached = localStorage.getItem("knobase-app:active-school-id");
    if (cached) return cached;
  }
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from("auth_profiles")
      .select("last_active_school_id")
      .eq("id", user.id)
      .maybeSingle();
    return data?.last_active_school_id ?? null;
  } catch {
    return null;
  }
}

// ── Public API ────────────────────────────────────────────────────────

export async function listWebhooks(schoolId?: string): Promise<Webhook[]> {
  const sid = schoolId ?? await getSchoolId();
  if (!sid) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("workspace_webhooks")
    .select("*")
    .eq("school_id", sid)
    .order("created_at", { ascending: false });
  return (data ?? []).map(rowToWebhook);
}

export async function getWebhook(id: string): Promise<Webhook | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("workspace_webhooks")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? rowToWebhook(data) : null;
}

export async function createWebhook(
  partial: { url: string; events: WebhookEvent[]; secret?: string; active?: boolean },
  schoolId?: string,
): Promise<Webhook | null> {
  const sid = schoolId ?? await getSchoolId();
  if (!sid) return null;
  const supabase = createClient();
  const { data } = await supabase
    .from("workspace_webhooks")
    .insert({
      school_id: sid,
      url: partial.url,
      events: partial.events,
      secret: partial.secret ?? generateSecret(),
      is_active: partial.active ?? true,
    })
    .select("*")
    .single();
  return data ? rowToWebhook(data) : null;
}

export async function updateWebhook(
  id: string,
  patch: Partial<Pick<Webhook, "url" | "events" | "secret" | "active">>,
): Promise<Webhook | null> {
  const supabase = createClient();
  const update: Record<string, unknown> = {};
  if (patch.url !== undefined) update.url = patch.url;
  if (patch.events !== undefined) update.events = patch.events;
  if (patch.secret !== undefined) update.secret = patch.secret;
  if (patch.active !== undefined) update.is_active = patch.active;
  const { data } = await supabase
    .from("workspace_webhooks")
    .update(update)
    .eq("id", id)
    .select("*")
    .single();
  return data ? rowToWebhook(data) : null;
}

export async function deleteWebhook(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from("workspace_webhooks")
    .delete()
    .eq("id", id);
  return !error;
}

// Delivery logs are kept in localStorage (they're transient diagnostics)
const DELIVERIES_KEY = "knobase-app:webhook-deliveries";

function readDeliveries(): WebhookDelivery[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(DELIVERIES_KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function getDeliveries(webhookId: string): WebhookDelivery[] {
  return readDeliveries()
    .filter((d) => d.webhookId === webhookId)
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

export function addDelivery(delivery: WebhookDelivery): void {
  const all = readDeliveries();
  all.push(delivery);
  const trimmed = all.slice(-500);
  if (typeof window !== "undefined") {
    localStorage.setItem(DELIVERIES_KEY, JSON.stringify(trimmed));
  }
}
