/**
 * Mentions API
 *
 * POST /api/mentions - Create a mention from the editor and dispatch webhook
 *
 * Supports two authentication methods:
 *   1. Session auth (cookie-based) — for browser clients
 *   2. API key auth (X-API-Key header) — for agents calling via MCP
 *
 * When an agent authenticates with an API key, source_id is set to the
 * agent's user_id so edits are attributed correctly.
 *
 * Body: {
 *   document_id: string;   // UUID of the document
 *   school_id: string;     // UUID of the workspace/school
 *   block_id?: string;     // Block containing the mention
 *   content_offset?: number;
 *   target_id: string;     // UUID of the mentioned agent/user
 *   target_name: string;   // Display name of the target
 *   target_type: "human" | "agent";
 *   mention_text: string;  // e.g. "@AgentName"
 *   context_text?: string; // Surrounding text for context
 *   is_agent_generated?: boolean;
 *   parent_mention_id?: string;
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { validateApiKey, ApiKeyError } from "@/lib/auth/api-key";
import { dispatchWebhook } from "@/lib/webhooks/dispatcher";
import type { MentionInsert, Mention } from "@/lib/supabase/types";

const CreateMentionSchema = z.object({
  document_id: z.string().uuid("Must be a valid document UUID"),
  school_id: z.string().uuid("Must be a valid school UUID"),
  block_id: z.string().optional(),
  content_offset: z.number().int().nonnegative().optional(),
  target_id: z.string().uuid("Must be a valid target UUID"),
  target_name: z.string().min(1, "Target name is required"),
  target_type: z.enum(["human", "agent"]),
  mention_text: z.string().min(1, "Mention text is required"),
  context_text: z.string().max(2000).optional(),
  is_agent_generated: z.boolean().optional().default(false),
  parent_mention_id: z.string().uuid().optional(),
});

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-Agent-Id, X-Knobase-Workspace",
    "Access-Control-Max-Age": "86400",
  };
}

function errorResponse(message: string, code: string, status: number, details?: unknown) {
  return NextResponse.json(
    { error: message, code, ...(details ? { details } : {}) },
    { status, headers: corsHeaders() },
  );
}

function successResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: corsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate — try API key first, fall back to session auth
    let sourceId: string;
    let sourceType: "human" | "agent";
    let sourceName: string;

    const adminClient = createAdminClient();
    const hasApiKey = request.headers.has("x-api-key");

    if (hasApiKey) {
      try {
        const identity = await validateApiKey(request);

        const { data: agentProfile, error: agentErr } = await adminClient
          .from("users")
          .select("id, type, name, email")
          .eq("id", identity.user_id)
          .single();

        if (agentErr || !agentProfile) {
          return errorResponse("Agent profile not found for API key", "USER_NOT_FOUND", 404);
        }

        sourceId = agentProfile.id;
        sourceType = agentProfile.type === "agent" ? "agent" : "human";
        sourceName = agentProfile.name || agentProfile.email || "Agent";
      } catch (err) {
        if (err instanceof ApiKeyError) {
          return errorResponse(err.message, err.code, err.statusCode);
        }
        throw err;
      }
    } else {
      const supabase = await createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();
      if (authError || !user) {
        return errorResponse("Unauthorized", "UNAUTHORIZED", 401);
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, type, name")
        .eq("auth_id", user.id)
        .single();

      if (profileError || !profile) {
        return errorResponse("User profile not found", "USER_NOT_FOUND", 404);
      }

      sourceId = profile.id;
      sourceType = profile.type === "agent" ? "agent" : "human";
      sourceName = profile.name || user.email || "Unknown";
    }

    // Parse and validate request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON body", "INVALID_BODY", 400);
    }

    const validation = CreateMentionSchema.safeParse(body);
    if (!validation.success) {
      return errorResponse("Validation failed", "VALIDATION_ERROR", 400, {
        issues: validation.error.issues,
      });
    }

    const input = validation.data;

    // Verify target exists
    const { data: target, error: targetError } = await adminClient
      .from("users")
      .select("id, type")
      .eq("id", input.target_id)
      .single();

    if (targetError || !target) {
      return errorResponse("Mentioned user/agent not found", "TARGET_NOT_FOUND", 404);
    }

    const insertPayload: MentionInsert = {
      document_id: input.document_id,
      school_id: input.school_id,
      block_id: input.block_id ?? null,
      content_offset: input.content_offset ?? null,
      source_type: sourceType,
      source_id: sourceId,
      source_name: sourceName,
      target_type: input.target_type,
      target_id: input.target_id,
      target_name: input.target_name,
      mention_text: input.mention_text,
      context_text: input.context_text ?? null,
      resolution_status: "pending",
      is_agent_generated: input.is_agent_generated,
      parent_mention_id: input.parent_mention_id ?? null,
    };

    const { data: mention, error: insertError } = await adminClient
      .from("mentions")
      .insert(insertPayload)
      .select("*")
      .single();

    if (insertError) {
      console.error("[Mentions] Insert error:", insertError);
      return errorResponse("Failed to create mention", "CREATE_FAILED", 500);
    }

    const mentionRow = mention as Mention;

    // 3. Lookup agent webhook from user_webhooks table
    const { data: webhookData } = await adminClient
      .from("user_webhooks")
      .select("webhook_url, secret, is_active")
      .eq("user_id", input.target_id)
      .eq("event_type", "mention")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // 4. Dispatch webhook asynchronously (fire-and-forget)
    let dispatched = false;
    const mcpBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://api.knobase.com";
    const mcpEndpoint = `${mcpBaseUrl}/api/mcp`;

    if (webhookData?.webhook_url && webhookData?.secret) {
      // Look up the target agent's Knobase API key so it can authenticate MCP calls
      const { data: agentApiKey } = await adminClient
        .from("agent_api_keys")
        .select("key_hash")
        .eq("agent_id", input.target_id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      dispatchWebhook(webhookData.webhook_url, webhookData.secret, {
        event: "mention.created",
        timestamp: new Date().toISOString(),
        mention: {
          id: mentionRow.id,
          document_id: mentionRow.document_id,
          school_id: mentionRow.school_id,
          block_id: mentionRow.block_id,
          content_offset: mentionRow.content_offset,
          source_type: mentionRow.source_type,
          source_id: mentionRow.source_id,
          source_name: mentionRow.source_name,
          target_type: mentionRow.target_type,
          target_id: mentionRow.target_id,
          target_name: mentionRow.target_name,
          mention_text: mentionRow.mention_text,
          context_text: mentionRow.context_text,
          resolution_status: mentionRow.resolution_status,
          is_agent_generated: mentionRow.is_agent_generated,
          parent_mention_id: mentionRow.parent_mention_id,
          created_at: mentionRow.created_at,
        },
        mcp: {
          endpoint: mcpEndpoint,
        },
        // knobase_context gives the agent explicit instructions on how to
        // use MCP tools — especially create_mention to notify the user back.
        knobase_context: {
          mcp_endpoint: mcpEndpoint,
          api_key: agentApiKey?.key_hash ?? undefined,
          requesting_user_id: mentionRow.source_id,
          requesting_user_name: mentionRow.source_name,
          school_id: mentionRow.school_id,
          available_tools: [
            "list_documents",
            "read_document",
            "write_document",
            "search_documents",
            "create_document",
            "delete_document",
            "list_agents",
            "get_agent_info",
            "create_mention",
          ],
          instructions: [
            "You are an AI agent operating inside the Knobase workspace platform.",
            `You have access to workspace tools via the Knobase MCP endpoint: ${mcpEndpoint}`,
            "Authenticate all MCP calls with the api_key provided in this context.",
            "",
            "KEY TOOL — create_mention:",
            "Use this tool to @mention and notify a user when you complete your work, want their attention, or need to reply in context.",
            "Parameters: document_id (required), target_user_id (required), mention_text (e.g. '@Alice'), context_text (brief summary).",
            `The user who mentioned you is: ${mentionRow.source_name} (ID: ${mentionRow.source_id}).`,
            `Use create_mention targeting user ID ${mentionRow.source_id} to notify them when you finish or have a reply.`,
          ].join("\n"),
        },
      })
        .then((result: { success: boolean; error?: string }) => {
          // 5. Update resolution_status to resolved (delivered) or unknown (failed)
          const newStatus: "resolved" | "unknown" = result.success ? "resolved" : "unknown";
          adminClient
            .from("mentions")
            .update({ resolution_status: newStatus })
            .eq("id", mentionRow.id)
            .then(({ error: updateErr }: { error: unknown }) => {
              if (updateErr) {
                console.error("[Mentions] Status update error:", updateErr);
              }
            });
        })
        .catch((err: unknown) => {
          console.error("[Mentions] Webhook dispatch error:", err);
          adminClient
            .from("mentions")
            .update({ resolution_status: "unknown" as const })
            .eq("id", mentionRow.id)
            .then(({ error: updateErr }: { error: unknown }) => {
              if (updateErr) {
                console.error("[Mentions] Status update error:", updateErr);
              }
            });
        });

      dispatched = true;
    }

    return successResponse(
      {
        mention: {
          id: mentionRow.id,
          document_id: mentionRow.document_id,
          school_id: mentionRow.school_id,
          block_id: mentionRow.block_id,
          content_offset: mentionRow.content_offset,
          source_type: mentionRow.source_type,
          source_id: mentionRow.source_id,
          source_name: mentionRow.source_name,
          target_type: mentionRow.target_type,
          target_id: mentionRow.target_id,
          target_name: mentionRow.target_name,
          mention_text: mentionRow.mention_text,
          context_text: mentionRow.context_text,
          resolution_status: mentionRow.resolution_status,
          is_agent_generated: mentionRow.is_agent_generated,
          parent_mention_id: mentionRow.parent_mention_id,
          created_at: mentionRow.created_at,
        },
        dispatched,
        message: dispatched
          ? "Mention created and webhook dispatched"
          : "Mention created but no active webhook found",
      },
      201,
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Mentions] POST error:", err);
    return errorResponse(message, "INTERNAL_ERROR", 500);
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
