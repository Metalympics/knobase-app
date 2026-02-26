// ── Supabase Agent API Keys ──
// CRUD for agent API keys stored in Supabase `agent_api_keys` table.
// Keys are hashed (SHA-256) before storage; raw key returned only at creation.

import { createClient } from "./client";
import { createAdminClient } from "./admin";
import type { AgentApiKey, AgentApiKeyInsert } from "./types";

/* ------------------------------------------------------------------ */
/* Hashing helpers (server-safe)                                       */
/* ------------------------------------------------------------------ */

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "kb_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

/* ------------------------------------------------------------------ */
/* CRUD                                                                */
/* ------------------------------------------------------------------ */

/**
 * Create a new API key. Returns the FULL key (only time it's visible).
 */
export async function createApiKey(
  data: Pick<AgentApiKeyInsert, "workspace_id" | "agent_id" | "name" | "tier" | "scopes" | "expires_at">
): Promise<{ key: AgentApiKey; rawKey: string }> {
  const rawKey = generateRawKey();
  const keyHash = await sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 10); // "kb_XXXXXXX"

  const supabase = createClient();
  const { data: apiKey, error } = await supabase
    .from("agent_api_keys")
    .insert({
      workspace_id: data.workspace_id,
      agent_id: data.agent_id,
      name: data.name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      tier: data.tier ?? "free",
      scopes: data.scopes ?? ["read", "write", "task"],
    })
    .select()
    .single();

  if (error) throw error;
  return { key: apiKey as unknown as AgentApiKey, rawKey };
}

/**
 * List all API keys for a workspace (never returns the raw key).
 */
export async function listApiKeysByWorkspace(
  workspaceId: string
): Promise<AgentApiKey[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("agent_api_keys")
    .select("*")
    .eq("workspace_id", workspaceId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AgentApiKey[];
}

/**
 * Find an API key by its raw token (hash-based lookup).
 * Uses admin client so it works in server-side API routes.
 */
export async function findApiKeyByRawToken(
  rawToken: string
): Promise<AgentApiKey | null> {
  const keyHash = await sha256(rawToken);
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (error) return null;

  const row = data as unknown as AgentApiKey;

  // Check expiry
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return null;
  }

  // Update last_used_at (fire-and-forget)
  supabase
    .from("agent_api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", row.id)
    .then(() => {});

  return row;
}

/**
 * Revoke an API key (soft delete).
 */
export async function revokeApiKey(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("agent_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
