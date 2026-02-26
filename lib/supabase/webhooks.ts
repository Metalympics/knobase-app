// ── Supabase Agent Webhooks ──
// CRUD + delivery for agent webhook endpoints.
// Stored in Supabase `agent_webhooks` table (not localStorage).

import { createClient } from "./client";
import type { AgentWebhook, AgentWebhookInsert, AgentWebhookUpdate } from "./types";

const supabase = createClient();

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

export async function createWebhook(
  data: AgentWebhookInsert
): Promise<AgentWebhook> {
  const { data: webhook, error } = await supabase
    .from("agent_webhooks")
    .insert(data)
    .select()
    .single();
  if (error) throw error;
  return webhook as unknown as AgentWebhook;
}

export async function getWebhook(id: string): Promise<AgentWebhook | null> {
  const { data, error } = await supabase
    .from("agent_webhooks")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as unknown as AgentWebhook;
}

export async function listWebhooksByWorkspace(
  workspaceId: string
): Promise<AgentWebhook[]> {
  const { data, error } = await supabase
    .from("agent_webhooks")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AgentWebhook[];
}

export async function listWebhooksByAgent(
  agentId: string,
  workspaceId?: string
): Promise<AgentWebhook[]> {
  let query = supabase
    .from("agent_webhooks")
    .select("*")
    .eq("agent_id", agentId)
    .eq("active", true);
  if (workspaceId) query = query.eq("workspace_id", workspaceId);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as AgentWebhook[];
}

export async function updateWebhook(
  id: string,
  updates: AgentWebhookUpdate
): Promise<AgentWebhook> {
  const { data, error } = await supabase
    .from("agent_webhooks")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as unknown as AgentWebhook;
}

export async function deleteWebhook(id: string): Promise<void> {
  const { error } = await supabase
    .from("agent_webhooks")
    .delete()
    .eq("id", id);
  if (error) throw error;
}

export async function incrementFailureCount(id: string): Promise<void> {
  const wh = await getWebhook(id);
  if (!wh) return;

  const newCount = wh.failure_count + 1;
  const updates: AgentWebhookUpdate = { failure_count: newCount };

  // Auto-disable after 10 consecutive failures
  if (newCount >= 10) {
    updates.active = false;
  }

  await updateWebhook(id, updates);
}

export async function resetFailureCount(id: string): Promise<void> {
  await updateWebhook(id, {
    failure_count: 0,
    last_triggered_at: new Date().toISOString(),
  });
}
