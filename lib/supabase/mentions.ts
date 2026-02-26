import { createClient } from "./client";
import type {
  Mention,
  MentionInsert,
  MentionUpdate,
  MentionStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Mention CRUD                                                        */
/* ------------------------------------------------------------------ */

const supabase = () => createClient();

/** Create a mention record when user types @name in a document */
export async function createMention(input: MentionInsert): Promise<Mention> {
  const { data, error } = await supabase()
    .from("mentions")
    .insert(input)
    .select()
    .single();

  if (error) throw new Error(`Failed to create mention: ${error.message}`);
  return data as Mention;
}

/** Get a single mention */
export async function getMention(mentionId: string): Promise<Mention | null> {
  const { data, error } = await supabase()
    .from("mentions")
    .select("*")
    .eq("id", mentionId)
    .single();

  if (error) return null;
  return data as Mention | null;
}

/** List mentions for a document */
export async function listMentionsByDocument(
  documentId: string,
  options?: { status?: MentionStatus[]; targetType?: "agent" | "user"; targetId?: string },
): Promise<Mention[]> {
  let query = supabase()
    .from("mentions")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (options?.status?.length) {
    query = query.in("status", options.status);
  }
  if (options?.targetType) {
    query = query.eq("target_type", options.targetType);
  }
  if (options?.targetId) {
    query = query.eq("target_id", options.targetId);
  }

  const { data, error } = await query;
  if (error) throw new Error(`Failed to list mentions: ${error.message}`);
  return (data ?? []) as Mention[];
}

/** List unread mentions targeting a specific agent */
export async function getUnreadAgentMentions(
  agentId: string,
): Promise<Mention[]> {
  const { data, error } = await supabase()
    .from("mentions")
    .select("*")
    .eq("target_type", "agent")
    .eq("target_id", agentId)
    .eq("status", "unread")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to get agent mentions: ${error.message}`);
  return (data ?? []) as Mention[];
}

/** Update mention status */
export async function updateMention(
  mentionId: string,
  updates: MentionUpdate,
): Promise<Mention> {
  const { data, error } = await supabase()
    .from("mentions")
    .update(updates)
    .eq("id", mentionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update mention: ${error.message}`);
  return data as Mention;
}

/** Acknowledge a mention (agent has seen it) */
export async function acknowledgeMention(mentionId: string): Promise<Mention> {
  return updateMention(mentionId, { status: "acknowledged" });
}

/** Mark mention as completed */
export async function completeMention(
  mentionId: string,
  resolvedBy: string,
  linkedTaskId?: string,
): Promise<Mention> {
  return updateMention(mentionId, {
    status: "completed",
    resolved_by: resolvedBy,
    resolved_at: new Date().toISOString(),
    ...(linkedTaskId ? { linked_task_id: linkedTaskId } : {}),
  });
}

/** Dismiss a mention */
export async function dismissMention(
  mentionId: string,
  resolvedBy: string,
): Promise<Mention> {
  return updateMention(mentionId, {
    status: "dismissed",
    resolved_by: resolvedBy,
    resolved_at: new Date().toISOString(),
  });
}

/** Link a mention to a task */
export async function linkMentionToTask(
  mentionId: string,
  taskId: string,
): Promise<Mention> {
  return updateMention(mentionId, {
    linked_task_id: taskId,
    status: "acknowledged",
    notified_at: new Date().toISOString(),
  });
}

/** Subscribe to new mentions for a specific agent (realtime) */
export function subscribeToAgentMentions(
  agentId: string,
  callback: (mention: Mention) => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`agent-mentions-${agentId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "mentions",
        filter: `target_id=eq.${agentId}`,
      },
      (payload) => {
        callback(payload.new as Mention);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}

/** Subscribe to mention updates for a document (realtime) */
export function subscribeToDocumentMentions(
  documentId: string,
  callback: (mention: Mention, eventType: string) => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`doc-mentions-${documentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "mentions",
        filter: `document_id=eq.${documentId}`,
      },
      (payload) => {
        callback(payload.new as Mention, payload.eventType);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}
