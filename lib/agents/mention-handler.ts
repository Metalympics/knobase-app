// ── Mention Handler ──
// High-level handler for @agent mentions detected in documents.
// Looks up the agent by name from users with type='agent',
// creates a task, and dispatches a webhook notification.

import { createAdminClient } from "@/lib/supabase/admin";
import { dispatchWebhookEvent } from "@/lib/webhooks/outbound";

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
      agent_id: agentRow.bot_id,
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
      created_by: data.userId,
      created_by_type: "user",
    })
    .select()
    .single();

  if (taskError) {
    console.error("[Mention] Failed to create task:", taskError);
    return { success: false, error: "Failed to create task" };
  }

  const taskRow = task as unknown as { id: string };

  // ── 3. Dispatch webhook notification ──
  try {
    await dispatchWebhookEvent(
      agentRow.bot_id,
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
