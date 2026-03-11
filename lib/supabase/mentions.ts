import { createClient } from "./client";
import type {
  Mention,
  MentionInsert,
  MentionUpdate,
  MentionResolutionStatus,
} from "./types";

/* ------------------------------------------------------------------ */
/* Mention CRUD                                                        */
/* ------------------------------------------------------------------ */
/*
 * IMPORTANT — Database-level side-effects on INSERT:
 *
 * When a row is inserted into the `mentions` table, the PostgreSQL trigger
 * `trg_create_notification_on_mention` (defined in migration 010) fires
 * AFTER INSERT and automatically creates a corresponding row in the
 * `notifications` table for human targets (target_type = 'human').
 *
 * This means callers of `createMention()` do NOT need to manually create
 * a notification — the database handles it. Agent targets (target_type =
 * 'agent') are excluded from auto-notification; they are notified via the
 * webhook/task system instead.
 *
 * The auto-created notification includes:
 *   - user_id    = mention.target_id  (the mentioned user)
 *   - type       = 'mention'
 *   - link       = '/documents/{document_id}?mention={mention_id}'
 *   - content    = '{source_name} mentioned you' (prefixed with robot
 *                  emoji if is_agent_generated is true)
 *
 * See: supabase/migrations/010_mentions_system.sql
 */

const supabase = () => createClient();

/**
 * Create a mention record when user types @name in a document.
 *
 * Side-effect: For human targets, a notification is auto-created by the
 * database trigger `trg_create_notification_on_mention` — no additional
 * notification logic is needed here.
 */
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
  options?: {
    resolutionStatus?: MentionResolutionStatus[];
    targetType?: "human" | "agent";
    targetId?: string;
  },
): Promise<Mention[]> {
  let query = supabase()
    .from("mentions")
    .select("*")
    .eq("document_id", documentId)
    .order("created_at", { ascending: false });

  if (options?.resolutionStatus?.length) {
    query = query.in("resolution_status", options.resolutionStatus);
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

/** List pending mentions targeting a specific agent */
export async function getPendingAgentMentions(
  agentId: string,
): Promise<Mention[]> {
  const { data, error } = await supabase()
    .from("mentions")
    .select("*")
    .eq("target_type", "agent")
    .eq("target_id", agentId)
    .eq("resolution_status", "pending")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Failed to get agent mentions: ${error.message}`);
  return (data ?? []) as Mention[];
}

/** Update mention */
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

/** Resolve a mention */
export async function resolveMention(mentionId: string): Promise<Mention> {
  return updateMention(mentionId, { resolution_status: "resolved" });
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
