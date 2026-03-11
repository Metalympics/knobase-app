// ── Outbound Webhook Dispatcher ──
// Server-side webhook delivery for notifying external agents (e.g. OpenClaw)
// when events occur (task.created, task.completed, proposal.created, etc.).
//
// Uses the Supabase `agent_webhooks` table for webhook configuration.
// Signs payloads with HMAC-SHA256 for verification.

import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentWebhook } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type WebhookEventType =
  | "task.created"
  | "task.completed"
  | "task.failed"
  | "task.cancelled"
  | "mention.created"
  | "proposal.created"
  | "proposal.decided"
  | "session.started"
  | "session.ended";

export interface WebhookPayload {
  event: WebhookEventType;
  timestamp: string;
  school_id: string;
  data: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* Signature                                                           */
/* ------------------------------------------------------------------ */

async function computeSignature(
  payload: string,
  secret: string
): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------------------------------------------ */
/* Delivery                                                            */
/* ------------------------------------------------------------------ */

async function deliverWebhook(
  webhook: AgentWebhook,
  payload: WebhookPayload
): Promise<{ success: boolean; statusCode?: number }> {
  const body = JSON.stringify(payload);
  const signature = await computeSignature(body, webhook.secret);
  const timestamp = Date.now().toString();

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Knobase-Signature": signature,
        "X-Knobase-Timestamp": timestamp,
        "X-Knobase-Event": payload.event,
        "User-Agent": "Knobase-Webhook/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    return { success: res.ok, statusCode: res.status };
  } catch {
    return { success: false };
  }
}

/**
 * Deliver a webhook with exponential backoff retry (max 3 attempts).
 */
async function deliverWithRetry(
  webhook: AgentWebhook,
  payload: WebhookPayload
): Promise<boolean> {
  const supabase = createAdminClient();

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      // Exponential backoff: 1s, 4s
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
    }

    const result = await deliverWebhook(webhook, payload);

    if (result.success) {
      // Reset failure count and update last triggered
      supabase
        .from("agent_webhooks")
        .update({
          failure_count: 0,
          last_triggered_at: new Date().toISOString(),
        })
        .eq("id", webhook.id)
        .then(() => {});

      return true;
    }
  }

  // All attempts failed — increment failure count
  supabase
    .from("agent_webhooks")
    .update({
      failure_count: webhook.failure_count + 1,
      // Auto-disable after 10 consecutive failures
      ...(webhook.failure_count + 1 >= 10 ? { active: false } : {}),
    })
    .eq("id", webhook.id)
    .then(() => {});

  console.error(
    `[Webhook] All delivery attempts failed for webhook ${webhook.id} (${webhook.url}), event=${payload.event}`
  );

  return false;
}

/* ------------------------------------------------------------------ */
/* Dispatch — finds matching webhooks and delivers in parallel          */
/* ------------------------------------------------------------------ */

/**
 * Dispatch a webhook event to all matching active webhooks for the given
 * agent in the given workspace.
 */
export async function dispatchWebhookEvent(
  agentId: string,
  schoolId: string,
  event: WebhookEventType,
  data: Record<string, unknown>
): Promise<{ delivered: number; failed: number }> {
  const supabase = createAdminClient();

  const { data: rawWebhooks, error } = await supabase
    .from("agent_webhooks")
    .select("*")
    .eq("agent_id", agentId)
    .eq("school_id", schoolId)
    .eq("active", true);

  if (error || !rawWebhooks || rawWebhooks.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  const webhooks = rawWebhooks as unknown as AgentWebhook[];

  const matching = webhooks.filter(
    (w) => w.events.length === 0 || w.events.includes(event)
  );

  if (matching.length === 0) {
    return { delivered: 0, failed: 0 };
  }

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    school_id: schoolId,
    data,
  };

  // Deliver in parallel
  const results = await Promise.allSettled(
    matching.map((wh) => deliverWithRetry(wh, payload))
  );

  let delivered = 0;
  let failed = 0;
  for (const r of results) {
    if (r.status === "fulfilled" && r.value) delivered++;
    else failed++;
  }

  return { delivered, failed };
}

/**
 * Convenience: dispatch a task.created event when a mention creates a task.
 * This is the critical notification that tells OpenClaw to start working.
 */
export async function notifyTaskCreated(
  task: Record<string, unknown>
): Promise<void> {
  const agentId = (task.agent_id as string) ?? "claw";
  const schoolId = (task.school_id as string) ?? (task.workspace_id as string);

  if (!schoolId) return;

  await dispatchWebhookEvent(agentId, schoolId, "task.created", {
    task_id: task.id,
    task_type: task.task_type,
    document_id: task.document_id,
    prompt: task.prompt,
    title: task.title,
    priority: task.priority,
    target_context: task.target_context,
    created_by: task.created_by,
  }).catch((err) => {
    console.error("[Webhook] Failed to notify task.created:", err);
  });
}
