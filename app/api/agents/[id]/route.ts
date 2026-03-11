import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import type { AgentUpdate } from "@/lib/supabase/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

type AgentProfileUpdate = Partial<
  Pick<AgentUpdate, "name" | "display_name" | "description" | "avatar_url">
>;

const ALLOWED_UPDATE_FIELDS = new Set([
  "name",
  "display_name",
  "description",
  "avatar_url",
] as const);

/**
 * PATCH /api/agents/[id]
 *
 * Update an agent's profile (name, display_name, description, avatar_url).
 * Only fields present in the body are updated.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;
  const supabase = createAdminClient();

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const updates: AgentProfileUpdate = {};
  for (const key of Object.keys(body)) {
    if (ALLOWED_UPDATE_FIELDS.has(key as "name" | "display_name" | "description" | "avatar_url")) {
      const value = body[key];
      if (value !== undefined && (typeof value === "string" || value === null)) {
        (updates as Record<string, unknown>)[key] = value;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return apiError(
      "No valid fields to update. Allowed: name, display_name, description, avatar_url",
      "BAD_REQUEST",
      400,
    );
  }

  // Verify the agent exists in this workspace and is of type 'agent'
  const { data: existing, error: findErr } = await supabase
    .from("users")
    .select("id, type, school_id, is_suspended")
    .eq("id", agentId)
    .single();

  if (findErr || !existing) {
    return apiError("Agent not found", "NOT_FOUND", 404);
  }

  const row = existing as unknown as {
    id: string;
    type: string | null;
    school_id: string | null;
    is_suspended: boolean;
  };

  if (row.type !== "agent") {
    return apiError("Resource is not an agent", "BAD_REQUEST", 400);
  }
  if (row.school_id !== school_id) {
    return apiError("Agent does not belong to this workspace", "FORBIDDEN", 403);
  }
  if (row.is_suspended) {
    return apiError("Cannot update a suspended agent", "BAD_REQUEST", 400);
  }

  const { data: updated, error: updateErr } = await supabase
    .from("users")
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq("id", agentId)
    .select("id, name, display_name, description, avatar_url, updated_at")
    .single();

  if (updateErr) {
    console.error("[Agents PATCH] Error:", updateErr);
    return apiError("Failed to update agent", "INTERNAL_ERROR", 500);
  }

  return apiJson({ agent: updated });
}

/**
 * DELETE /api/agents/[id]
 *
 * Suspend an agent: sets is_suspended=true and revokes all active API keys
 * associated with the agent. This is a soft delete — the record persists.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id: agentId } = await context.params;
  const { school_id } = auth.apiKey;
  const supabase = createAdminClient();

  // Verify the agent exists in this workspace
  const { data: existing, error: findErr } = await supabase
    .from("users")
    .select("id, type, school_id, is_suspended")
    .eq("id", agentId)
    .single();

  if (findErr || !existing) {
    return apiError("Agent not found", "NOT_FOUND", 404);
  }

  const row = existing as unknown as {
    id: string;
    type: string | null;
    school_id: string | null;
    is_suspended: boolean;
  };

  if (row.type !== "agent") {
    return apiError("Resource is not an agent", "BAD_REQUEST", 400);
  }
  if (row.school_id !== school_id) {
    return apiError("Agent does not belong to this workspace", "FORBIDDEN", 403);
  }
  if (row.is_suspended) {
    return apiJson({ message: "Agent is already suspended", id: agentId });
  }

  const now = new Date().toISOString();

  // Suspend the agent
  const { error: suspendErr } = await supabase
    .from("users")
    .update({
      is_suspended: true,
      availability: "offline",
      updated_at: now,
    })
    .eq("id", agentId);

  if (suspendErr) {
    console.error("[Agents DELETE] Suspend error:", suspendErr);
    return apiError("Failed to suspend agent", "INTERNAL_ERROR", 500);
  }

  // Revoke all active API keys for this agent
  const { error: revokeErr, count: revokedCount } = await supabase
    .from("agent_api_keys")
    .update({ revoked_at: now, is_active: false })
    .eq("agent_id", agentId)
    .eq("school_id", school_id)
    .is("revoked_at", null);

  if (revokeErr) {
    console.error("[Agents DELETE] Revoke keys error:", revokeErr);
  }

  return apiJson({
    message: "Agent suspended and API keys revoked",
    id: agentId,
    keys_revoked: revokedCount ?? 0,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
