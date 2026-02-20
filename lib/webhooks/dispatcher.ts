import type { Webhook, WebhookEvent, WebhookDelivery } from "./store";
import { listWebhooks, updateWebhook, addDelivery } from "./store";

const MAX_RETRIES = 3;
const INITIAL_DELAY_MS = 1000;

interface WebhookPayload {
  event: WebhookEvent;
  timestamp: string;
  data: unknown;
}

async function computeSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
  return "sha256=" + Array.from(new Uint8Array(sig), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function deliverWebhook(
  webhook: Webhook,
  payload: WebhookPayload,
  attempt: number
): Promise<WebhookDelivery> {
  const body = JSON.stringify(payload);
  const signature = await computeSignature(body, webhook.secret);

  const delivery: WebhookDelivery = {
    id: crypto.randomUUID(),
    webhookId: webhook.id,
    event: payload.event,
    payload,
    success: false,
    attemptCount: attempt,
    timestamp: new Date().toISOString(),
  };

  try {
    const response = await fetch(webhook.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Knobase-Signature": signature,
        "X-Knobase-Event": payload.event,
        "X-Knobase-Delivery": delivery.id,
        "User-Agent": "Knobase-Webhooks/1.0",
      },
      body,
      signal: AbortSignal.timeout(10_000),
    });

    delivery.statusCode = response.status;
    delivery.success = response.ok;
    try {
      delivery.response = await response.text();
    } catch {
      delivery.response = "";
    }
  } catch (err) {
    delivery.success = false;
    delivery.response = err instanceof Error ? err.message : "Network error";
  }

  return delivery;
}

async function deliverWithRetry(webhook: Webhook, payload: WebhookPayload): Promise<void> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const delivery = await deliverWebhook(webhook, payload, attempt);
    addDelivery(delivery);

    if (delivery.success) {
      updateWebhook(webhook.id, { active: webhook.active });
      return;
    }

    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  const wh = { ...webhook };
  wh.failureCount = (wh.failureCount ?? 0) + 1;
  if (wh.failureCount >= 10) {
    updateWebhook(wh.id, { active: false });
  }
}

export async function dispatchEvent(event: WebhookEvent, data: unknown): Promise<void> {
  const webhooks = listWebhooks().filter((w) => w.active && w.events.includes(event));
  if (webhooks.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  await Promise.allSettled(webhooks.map((wh) => deliverWithRetry(wh, payload)));
}

export async function testWebhook(webhook: Webhook): Promise<WebhookDelivery> {
  const payload: WebhookPayload = {
    event: "document.created",
    timestamp: new Date().toISOString(),
    data: {
      test: true,
      message: "This is a test webhook delivery from Knobase",
      documentId: "test-123",
      title: "Test Document",
    },
  };

  const delivery = await deliverWebhook(webhook, payload, 1);
  addDelivery(delivery);
  return delivery;
}

export function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  return computeSignature(payload, secret).then((expected) => expected === signature);
}
