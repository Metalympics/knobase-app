/**
 * OpenClaw Inbound Webhook
 *
 * POST /api/webhooks/openclaw
 *
 * Receives @mention notifications from Knobase and forwards them to
 * the OpenClaw agent for processing. The caller must supply a valid
 * shared secret via the X-Webhook-Secret header.
 *
 * Body: {
 *   type: "mention";
 *   document_id: string;
 *   content: string;
 *   mentioned_agent: string;
 *   user: string;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { handleAgentMention } from "@/lib/agents/mention-handler";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const OpenClawWebhookSchema = z.object({
  type: z.literal("mention"),
  document_id: z.string().uuid("document_id must be a valid UUID"),
  content: z.string().min(1, "content is required"),
  mentioned_agent: z.string().min(1, "mentioned_agent is required"),
  user: z.string().min(1, "user is required"),
});

type OpenClawWebhookBody = z.infer<typeof OpenClawWebhookSchema>;

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, X-Webhook-Secret",
    "Access-Control-Max-Age": "86400",
  };
}

function errorResponse(
  message: string,
  code: string,
  status: number,
  details?: unknown,
) {
  return NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status, headers: corsHeaders() },
  );
}

function successResponse<T>(data: T, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

/* ------------------------------------------------------------------ */
/* Signature verification                                              */
/* ------------------------------------------------------------------ */

function verifySecret(request: NextRequest): boolean {
  const secret = request.headers.get("x-webhook-secret");
  const expected = process.env.OPENCLAW_WEBHOOK_SECRET;

  if (!expected) {
    console.error(
      "[OpenClaw Webhook] OPENCLAW_WEBHOOK_SECRET is not configured",
    );
    return false;
  }

  if (!secret) return false;

  // Constant-time comparison
  if (secret.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < secret.length; i++) {
    mismatch |= secret.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

/* ------------------------------------------------------------------ */
/* POST /api/webhooks/openclaw                                         */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    // 1. Verify webhook signature
    if (!verifySecret(request)) {
      return errorResponse(
        "Invalid or missing webhook secret",
        "UNAUTHORIZED",
        401,
      );
    }

    // 2. Parse body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", "INVALID_BODY", 400);
    }

    const validation = OpenClawWebhookSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation failed", "VALIDATION_ERROR", 400, {
        issues: validation.error.issues.map((i) => ({
          field: i.path.join("."),
          message: i.message,
        })),
      });
    }

    const { document_id, content, mentioned_agent, user } =
      validation.data as OpenClawWebhookBody;

    // 3. Verify the mentioned agent exists
    const supabase = createAdminClient();
    const agentName = mentioned_agent.replace(/^@/, "").toLowerCase();

    const { data: agent, error: agentError } = await supabase
      .from("users")
      .select("id, bot_id, name, school_id")
      .eq("type", "agent")
      .ilike("name", agentName)
      .limit(1)
      .maybeSingle();

    if (agentError || !agent) {
      return errorResponse(
        `Agent "${mentioned_agent}" not found`,
        "AGENT_NOT_FOUND",
        404,
      );
    }

    const agentRow = agent as unknown as {
      id: string;
      bot_id: string;
      name: string;
      school_id: string;
    };

    // 4. Forward to the mention handler for task creation + webhook dispatch
    const result = await handleAgentMention({
      documentId: document_id,
      schoolId: agentRow.school_id,
      mentionedAgent: mentioned_agent,
      message: content,
      context: content,
      userId: user,
    });

    if (!result.success) {
      return errorResponse(
        result.error ?? "Failed to process mention",
        "PROCESSING_FAILED",
        500,
      );
    }

    return successResponse({
      success: true,
      task_id: result.taskId,
      agent_id: result.agentId,
      message: "Mention forwarded to agent for processing",
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[OpenClaw Webhook] POST error:", err);
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* OPTIONS — CORS preflight                                            */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
