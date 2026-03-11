/**
 * Webhook Registration API
 *
 * POST   /api/webhooks/register           - Register a new webhook
 * DELETE /api/webhooks/register?id=<uuid> - Remove a webhook (ownership verified)
 *
 * The HMAC secret is only returned once during registration.
 * Webhooks are stored in the user_webhooks table with RLS enforced via
 * user_id ownership checks.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { UserWebhook, WebhookEventType } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Request / Response types                                            */
/* ------------------------------------------------------------------ */

interface WebhookRegistrationRequest {
  webhook_url: string;
  event_type?: WebhookEventType;
}

interface WebhookRegistrationResponse {
  id: string;
  webhook_url: string;
  secret: string;
  event_type: WebhookEventType;
  is_active: boolean;
  created_at: string;
  warning: string;
}

interface WebhookDeleteResponse {
  message: string;
  id: string;
}

interface ApiErrorResponse {
  error: string;
  code: string;
  details?: unknown;
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const RegisterWebhookSchema = z.object({
  webhook_url: z
    .string()
    .url("Must be a valid HTTPS URL")
    .refine((url) => url.startsWith("https://"), {
      message: "Webhook URL must use HTTPS",
    }),
  event_type: z
    .enum(["mention", "comment", "invite", "task_assigned"])
    .default("mention"),
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Agent-Id, X-Knobase-Workspace",
    "Access-Control-Max-Age": "86400",
  };
}

function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status, headers: corsHeaders() },
  );
}

function successResponse<T>(data: T, status = 200): NextResponse<T> {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

/**
 * Resolve the authenticated Supabase auth user to their internal user_id.
 * Returns null (with an error response) when authentication or lookup fails.
 */
async function resolveUserId(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
): Promise<
  | { userId: string; error: null }
  | { userId: null; error: NextResponse<ApiErrorResponse> }
> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { userId: null, error: errorResponse("Unauthorized", "UNAUTHORIZED", 401) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", user.id)
    .single();

  if (profileError || !profile) {
    return {
      userId: null,
      error: errorResponse("User profile not found", "USER_NOT_FOUND", 404),
    };
  }

  return { userId: profile.id, error: null };
}

/**
 * Generate a high-entropy HMAC secret prefixed with `whsec_`.
 * Combines crypto.randomUUID() with 32 bytes of random data
 * for a secret suitable for HMAC-SHA256 signing.
 */
function generateWebhookSecret(): string {
  const uuid = crypto.randomUUID().replace(/-/g, "");
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `whsec_${uuid}${hex}`;
}

/* ------------------------------------------------------------------ */
/* GET - List current user's webhooks                                  */
/* ------------------------------------------------------------------ */

export async function GET(): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { userId, error: authErr } = await resolveUserId(supabase);
    if (authErr) return authErr;

    const adminClient = createAdminClient();

    const { data: webhooks, error: listError } = await adminClient
      .from("user_webhooks")
      .select("id, webhook_url, event_type, is_active, created_at, updated_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (listError) {
      console.error("[Webhook Register] List error:", listError);
      return errorResponse("Failed to list webhooks", "LIST_FAILED", 500);
    }

    return successResponse({ webhooks: webhooks ?? [] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Webhook Register] GET error:", err);
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* PATCH - Regenerate secret for a webhook                             */
/* ------------------------------------------------------------------ */

export async function PATCH(
  request: NextRequest,
): Promise<NextResponse> {
  try {
    const supabase = await createServerClient();
    const { userId, error: authErr } = await resolveUserId(supabase);
    if (authErr) return authErr;

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId || !UUID_RE.test(webhookId)) {
      return errorResponse("Invalid or missing webhook ID", "INVALID_ID", 400);
    }

    const adminClient = createAdminClient();

    const { data: existing, error: lookupError } = await adminClient
      .from("user_webhooks")
      .select("id, user_id")
      .eq("id", webhookId)
      .single();

    if (lookupError || !existing || existing.user_id !== userId) {
      return errorResponse("Webhook not found", "NOT_FOUND", 404);
    }

    const newSecret = generateWebhookSecret();

    const { error: updateError } = await adminClient
      .from("user_webhooks")
      .update({ secret: newSecret, updated_at: new Date().toISOString() })
      .eq("id", webhookId)
      .eq("user_id", userId);

    if (updateError) {
      console.error("[Webhook Register] Patch error:", updateError);
      return errorResponse("Failed to regenerate secret", "UPDATE_FAILED", 500);
    }

    return successResponse({
      id: webhookId,
      secret: newSecret,
      warning: "Store this secret securely. It will not be shown again.",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Webhook Register] PATCH error:", err);
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* POST - Register a new webhook                                       */
/* ------------------------------------------------------------------ */

export async function POST(
  request: NextRequest,
): Promise<NextResponse<WebhookRegistrationResponse | ApiErrorResponse>> {
  try {
    const supabase = await createServerClient();
    const { userId, error: authErr } = await resolveUserId(supabase);
    if (authErr) return authErr;

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", "INVALID_BODY", 400);
    }

    const validation = RegisterWebhookSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation failed", "VALIDATION_ERROR", 400, {
        issues: validation.error.issues,
      });
    }

    const { webhook_url, event_type } = validation.data;
    const secret = generateWebhookSecret();

    // Admin client bypasses RLS for the insert, but we bind user_id
    // so that subsequent RLS reads/deletes are scoped to the owner.
    const adminClient = createAdminClient();

    const { data: webhook, error: insertError } = await adminClient
      .from("user_webhooks")
      .insert({
        user_id: userId,
        webhook_url,
        event_type,
        secret,
        is_active: true,
      })
      .select("id, webhook_url, event_type, is_active, created_at")
      .single();

    if (insertError) {
      console.error("[Webhook Register] Insert error:", insertError);
      return errorResponse("Failed to create webhook", "CREATE_FAILED", 500);
    }

    return successResponse<WebhookRegistrationResponse>(
      {
        id: webhook.id,
        webhook_url: webhook.webhook_url,
        secret,
        event_type: webhook.event_type as WebhookEventType,
        is_active: webhook.is_active ?? true,
        created_at: webhook.created_at ?? new Date().toISOString(),
        warning: "Store this secret securely. It will not be shown again.",
      },
      201,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Webhook Register] POST error:", err);
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* DELETE - Remove a webhook by ID (ownership verified)                */
/* ------------------------------------------------------------------ */

export async function DELETE(
  request: NextRequest,
): Promise<NextResponse<WebhookDeleteResponse | ApiErrorResponse>> {
  try {
    const supabase = await createServerClient();
    const { userId, error: authErr } = await resolveUserId(supabase);
    if (authErr) return authErr;

    const { searchParams } = new URL(request.url);
    const webhookId = searchParams.get("id");

    if (!webhookId) {
      return errorResponse("Missing webhook ID", "MISSING_ID", 400);
    }

    if (!UUID_RE.test(webhookId)) {
      return errorResponse("Invalid webhook ID format", "INVALID_ID", 400);
    }

    const adminClient = createAdminClient();

    // Verify the webhook exists and belongs to this user before deleting.
    const { data: existing, error: lookupError } = await adminClient
      .from("user_webhooks")
      .select("id, user_id")
      .eq("id", webhookId)
      .single();

    if (lookupError || !existing) {
      return errorResponse("Webhook not found", "NOT_FOUND", 404);
    }

    if (existing.user_id !== userId) {
      return errorResponse("Webhook not found", "NOT_FOUND", 404);
    }

    const { error: deleteError } = await adminClient
      .from("user_webhooks")
      .delete()
      .eq("id", webhookId)
      .eq("user_id", userId);

    if (deleteError) {
      console.error("[Webhook Register] Delete error:", deleteError);
      return errorResponse("Failed to delete webhook", "DELETE_FAILED", 500);
    }

    return successResponse<WebhookDeleteResponse>({
      message: "Webhook deleted successfully",
      id: webhookId,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Webhook Register] DELETE error:", err);
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* OPTIONS - CORS preflight                                            */
/* ------------------------------------------------------------------ */

export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
