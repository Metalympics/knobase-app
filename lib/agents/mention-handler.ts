// ── Mention Handler ──
// High-level handler for @agent mentions detected in documents.
// Looks up the agent by name from users with type='agent',
// creates a task, and dispatches a webhook notification.

import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhookEvent } from "@/lib/webhooks/outbound";
import { DOCUMENT_FORMAT_GUIDE } from "@/lib/agents/document-format-guide";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface MentionData {
  documentId: string;
  schoolId: string;
  blockId?: string;
  /** The raw mention text including `@`, e.g. "@claw" */
  mentionedAgent: string;
  /** The user's prompt / message text */
  message: string;
  /** Surrounding text context for the agent */
  context: string;
  userId: string;
  userName?: string;
}

export interface MentionResult {
  success: boolean;
  taskId?: string;
  agentId?: string;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Handler                                                             */
/* ------------------------------------------------------------------ */

/**
 * Handle a new @agent mention in a document.
 *
 * 1. Looks up the agent by name (case-insensitive) in the workspace.
 * 2. Creates a task in the `agent_tasks` table.
 * 3. Dispatches a `mention.created` webhook event.
 */
export async function handleAgentMention(data: MentionData): Promise<MentionResult> {
  const supabase = createAdminClient();

  // Extract agent name (remove @)
  const agentName = data.mentionedAgent.replace(/^@/, "").toLowerCase();

  // ── 1. Find matching agent in school (users with type='agent') ──
  const { data: agent, error: agentError } = await supabase
    .from("users")
    .select("id, bot_id, name, agent_type")
    .eq("school_id", data.schoolId)
    .eq("type", "agent")
    .ilike("name", agentName)
    .neq("availability", "offline")
    .single();

  if (agentError || !agent) {
    console.log(`[Mention] Agent "${data.mentionedAgent}" not found in school ${data.schoolId}`);
    return { success: false, error: "Agent not found" };
  }

  const agentRow = agent as unknown as {
    id: string;
    bot_id: string;
    name: string;
    agent_type: string;
  };

  // ── 2. Create a task for the agent ──
  const { data: task, error: taskError } = await supabase
    .from("agent_tasks")
    .insert({
      school_id: data.schoolId,
      document_id: data.documentId,
      bot_id: agentRow.bot_id,
      task_type: "mention",
      prompt: data.message,
      title: `Mention from ${data.userName ?? data.userId}`,
      priority: 5,
      status: "pending",
      target_context: {
        type: "mention",
        block_id: data.blockId,
        context: data.context,
      },
      assigned_by: data.userId,
      assigned_by_type: "human",
    })
    .select()
    .single();

  if (taskError) {
    console.error("[Mention] Failed to create task:", taskError);
    return { success: false, error: "Failed to create task" };
  }

  const taskRow = task as unknown as { id: string };

  // ── 3. Dispatch webhook notification ──
  // Look up the agent's API key so it can authenticate MCP callbacks
  const mcpBaseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.API_BASE_URL || "https://api.knobase.com";
  const mcpEndpoint = `${mcpBaseUrl}/api/mcp`;

  const { data: agentApiKey } = await supabase
    .from("agent_api_keys")
    .select("key_hash")
    .eq("agent_id", agentRow.id)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  try {
    await dispatchWebhookEvent(
      agentRow.id,
      data.schoolId,
      "mention.created",
      {
        task_id: taskRow.id,
        document_id: data.documentId,
        block_id: data.blockId,
        message: data.message,
        context: data.context,
        mentioned_by: data.userId,
        mentioned_by_name: data.userName,
        agent_name: agentRow.name,
        timestamp: new Date().toISOString(),
        // Explicit instructions so the agent knows how to use Knobase tools
        // and specifically how to mention the requesting user back when done.
        knobase_context: {
          mcp_endpoint: mcpEndpoint,
          api_key: agentApiKey?.key_hash ?? undefined,
          requesting_user_id: data.userId,
          requesting_user_name: data.userName ?? data.userId,
          school_id: data.schoolId,
          available_tools: [
            "list_documents",
            "read_document",
            "write_document",
            "stream_edit",
            "search_documents",
            "create_document",
            "delete_document",
            "list_agents",
            "get_agent_info",
            "create_mention",
            "update_task_status",
          ],
          instructions: [
            "You are an AI agent operating inside the Knobase workspace platform.",
            `You have access to workspace tools via the Knobase MCP endpoint: ${mcpEndpoint}`,
            "Authenticate all MCP calls with the api_key provided in this context.",
            "",
            "PROGRESS & STATUS — update_task_status:",
            "Use update_task_status to report your progress in real-time so the user sees live feedback.",
            "Call with status='working' and current_action (e.g. 'Reading document...') while processing.",
            "Call with status='completed' and result_summary when done, or status='failed' and error_message on failure.",
            "",
            "STREAMING EDITS — stream_edit:",
            "Use stream_edit to apply incremental edits to a document. Each call applies one operation.",
            "Preferred over write_document when making progressive changes visible in real-time.",
            "",
            "MENTIONS — create_mention:",
            "Use this tool to @mention and notify a user when you complete your work or want to reply in context.",
            "Parameters: document_id (required), target_user_id (required), mention_text (e.g. '@Alice'), context_text.",
            `The user who mentioned you is: ${data.userName ?? data.userId} (ID: ${data.userId}).`,
            `Use create_mention targeting user ID ${data.userId} on document ${data.documentId} to notify them when you are done.`,
            "",
            DOCUMENT_FORMAT_GUIDE,
          ].join("\n"),
        },
      },
    );
  } catch (error) {
    console.error("[Mention] Webhook dispatch failed:", error);
    // Don't fail the mention — the task was still created
  }

  // ── 4. Update agent last activity ──
  supabase
    .from("users")
    .update({ last_invoked_at: new Date().toISOString() })
    .eq("id", agentRow.id)
    .then(() => {});

  return {
    success: true,
    taskId: taskRow.id,
    agentId: agentRow.bot_id,
  };
}
