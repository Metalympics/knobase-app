import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import {
  listServerWebhooks,
  createServerWebhook,
} from "@/lib/api/server-store";
import { createWebhookSchema, validateBody } from "@/lib/api/validation";

export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const webhooks = listServerWebhooks();
  return apiJson({
    data: webhooks.map(({ secret, ...rest }) => ({
      ...rest,
      secret: secret.slice(0, 10) + "..." ,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(createWebhookSchema, body);
  if (!validation.success) return validation.error;

  const { url, events, secret, active } = validation.data;

  const generatedSecret = secret ?? (() => {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    return "whsec_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  })();

  const webhook = createServerWebhook({
    url,
    events,
    secret: generatedSecret,
    active,
    lastTriggeredAt: undefined,
  });

  return apiJson({ data: webhook }, 201);
}
