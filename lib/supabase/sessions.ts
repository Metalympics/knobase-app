import { createClient } from "./client";
import type {
  AgentSession,
  AgentSessionInsert,
  AgentSessionUpdate,
} from "./types";

/* ------------------------------------------------------------------ */
/* Agent Session Management                                            */
/* ------------------------------------------------------------------ */

const supabase = () => createClient();

/** Upsert an agent session (one per agent per document) */
export async function upsertSession(
  input: AgentSessionInsert,
): Promise<AgentSession> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .upsert(
      {
        ...input,
        last_activity_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
      },
      { onConflict: "agent_id,document_id" },
    )
    .select()
    .single();

  if (error) throw new Error(`Failed to upsert session: ${error.message}`);
  return data as AgentSession;
}

/** Get the current session for a specific agent */
export async function getAgentSession(
  agentId: string,
): Promise<AgentSession | null> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .select("*")
    .eq("agent_id", agentId)
    .gt("expires_at", new Date().toISOString())
    .order("last_activity_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data as AgentSession | null;
}

/** List active agent sessions for a document */
export async function listSessionsByDocument(
  documentId: string,
): Promise<AgentSession[]> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .select("*")
    .eq("document_id", documentId)
    .gt("expires_at", new Date().toISOString())
    .order("last_activity_at", { ascending: false });

  if (error) throw new Error(`Failed to list sessions: ${error.message}`);
  return (data ?? []) as AgentSession[];
}

/** List active agent sessions for a workspace */
export async function listSessionsByWorkspace(
  workspaceId: string,
): Promise<AgentSession[]> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .gt("expires_at", new Date().toISOString())
    .order("last_activity_at", { ascending: false });

  if (error) throw new Error(`Failed to list workspace sessions: ${error.message}`);
  return (data ?? []) as AgentSession[];
}

/** Update an agent session */
export async function updateSession(
  sessionId: string,
  updates: AgentSessionUpdate,
): Promise<AgentSession> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .update({
      ...updates,
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to update session: ${error.message}`);
  return data as AgentSession;
}

/** Update agent session by agent_id + document_id (convenience) */
export async function updateAgentSessionByKey(
  agentId: string,
  documentId: string,
  updates: AgentSessionUpdate,
): Promise<AgentSession | null> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .update({
      ...updates,
      last_activity_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    })
    .eq("agent_id", agentId)
    .eq("document_id", documentId)
    .select()
    .single();

  if (error) return null;
  return data as AgentSession | null;
}

/** End an agent session */
export async function endSession(agentId: string, documentId: string): Promise<void> {
  await supabase()
    .from("agent_sessions")
    .update({
      status: "idle",
      current_task_id: null,
      expires_at: new Date().toISOString(), // Expire immediately
    })
    .eq("agent_id", agentId)
    .eq("document_id", documentId);
}

/** Toggle follow mode for a user on an agent session */
export async function toggleFollow(
  sessionId: string,
  userId: string,
): Promise<AgentSession> {
  const session = await supabase()
    .from("agent_sessions")
    .select("followed_by")
    .eq("id", sessionId)
    .single();

  if (session.error) throw new Error(`Session not found: ${session.error.message}`);

  const followers = session.data.followed_by ?? [];
  const isFollowing = followers.includes(userId);

  const newFollowers = isFollowing
    ? followers.filter((id: string) => id !== userId)
    : [...followers, userId];

  const { data, error } = await supabase()
    .from("agent_sessions")
    .update({ followed_by: newFollowers })
    .eq("id", sessionId)
    .select()
    .single();

  if (error) throw new Error(`Failed to toggle follow: ${error.message}`);
  return data as AgentSession;
}

/** Clean up expired sessions */
export async function cleanExpiredSessions(): Promise<number> {
  const { data, error } = await supabase()
    .from("agent_sessions")
    .delete()
    .lt("expires_at", new Date().toISOString())
    .select("id");

  if (error) return 0;
  return data?.length ?? 0;
}

/** Subscribe to agent sessions for a document (realtime) */
export function subscribeToDocumentSessions(
  documentId: string,
  callback: (session: AgentSession, eventType: string) => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`doc-sessions-${documentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "agent_sessions",
        filter: `document_id=eq.${documentId}`,
      },
      (payload) => {
        callback(payload.new as AgentSession, payload.eventType);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}

/** Subscribe to all sessions for an agent (e.g., for "where is @claw") */
export function subscribeToAgentSessions(
  agentId: string,
  callback: (session: AgentSession, eventType: string) => void,
): { unsubscribe: () => void } {
  const channel = supabase()
    .channel(`agent-sessions-${agentId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "agent_sessions",
        filter: `agent_id=eq.${agentId}`,
      },
      (payload) => {
        callback(payload.new as AgentSession, payload.eventType);
      },
    )
    .subscribe();

  return {
    unsubscribe: () => {
      supabase().removeChannel(channel);
    },
  };
}
