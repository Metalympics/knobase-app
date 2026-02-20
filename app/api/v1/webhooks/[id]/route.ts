import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import {
  getServerWebhook,
  updateServerWebhook,
  deleteServerWebhook,
  getWebhookDeliveryLogs,
} from "@/lib/api/server-store";
import { updateWebhookSchema, validateBody } from "@/lib/api/validation";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: Params) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const webhook = getServerWebhook(id);
  if (!webhook) return apiError("Webhook not found", "NOT_FOUND", 404);

  const logs = getWebhookDeliveryLogs(id);
  return apiJson({
    data: { ...webhook, secret: webhook.secret.slice(0, 10) + "..." },
    deliveries: logs,
  });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const validation = validateBody(updateWebhookSchema, body);
  if (!validation.success) return validation.error;

  const updated = updateServerWebhook(id, validation.data);
  if (!updated) return apiError("Webhook not found", "NOT_FOUND", 404);

  return apiJson({ data: { ...updated, secret: updated.secret.slice(0, 10) + "..." } });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const deleted = deleteServerWebhook(id);
  if (!deleted) return apiError("Webhook not found", "NOT_FOUND", 404);

  return apiJson({ message: "Webhook deleted" });
}
