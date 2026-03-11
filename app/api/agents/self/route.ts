import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import type { Agent, AgentApiKey } from "@/lib/supabase/types";

type AgentSelfResponse = Pick<
  Agent,
  | "id"
  | "name"
  | "display_name"
  | "email"
  | "avatar_url"
  | "description"
  | "capabilities"
  | "expertise"
  | "availability"
  | "agent_type"
  | "model"
  | "bot_id"
  | "school_id"
  | "total_invocations"
  | "last_invoked_at"
  | "created_at"
  | "updated_at"
>;

type ApiKeyInfo = Pick<
  AgentApiKey,
  "id" | "name" | "key_prefix" | "tier" | "scopes" | "last_used_at" | "expires_at" | "created_at"
>;

const AGENT_SELECT_FIELDS = [
  "id",
  "name",
  "display_name",
  "email",
  "avatar_url",
  "description",
  "capabilities",
  "expertise",
  "availability",
  "agent_type",
  "model",
  "bot_id",
  "school_id",
  "total_invocations",
  "last_invoked_at",
  "created_at",
  "updated_at",
].join(", ");

const KEY_SELECT_FIELDS = [
  "id",
  "name",
  "key_prefix",
  "tier",
  "scopes",
  "last_used_at",
  "expires_at",
  "created_at",
].join(", ");

/**
 * GET /api/agents/self
 *
 * Returns the agent profile associated with the calling API key.
 * Useful for agents to discover their own identity and workspace context.
 */
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { agent_id, school_id, id: keyId } = auth.apiKey;

  if (!agent_id) {
    return apiError(
      "This API key is not associated with an agent",
      "BAD_REQUEST",
      400,
    );
  }

  const supabase = createAdminClient();

  // Fetch the agent user record
  const { data: agentData, error: agentErr } = await supabase
    .from("users")
    .select(AGENT_SELECT_FIELDS)
    .eq("id", agent_id)
    .eq("school_id", school_id)
    .eq("type", "agent")
    .single();

  if (agentErr || !agentData) {
    return apiError("Agent not found", "NOT_FOUND", 404);
  }

  const agent = agentData as unknown as AgentSelfResponse;

  // Fetch the current API key metadata (not the secret)
  const { data: keyData } = await supabase
    .from("agent_api_keys")
    .select(KEY_SELECT_FIELDS)
    .eq("id", keyId)
    .single();

  const apiKey = keyData as unknown as ApiKeyInfo | null;

  return apiJson({
    agent: {
      id: agent.id,
      name: agent.name,
      display_name: agent.display_name,
      email: agent.email,
      avatar_url: agent.avatar_url,
      description: agent.description,
      capabilities: agent.capabilities,
      expertise: agent.expertise,
      availability: agent.availability,
      agent_type: agent.agent_type,
      model: agent.model,
      bot_id: agent.bot_id,
      school_id: agent.school_id,
      total_invocations: agent.total_invocations,
      last_invoked_at: agent.last_invoked_at,
      created_at: agent.created_at,
      updated_at: agent.updated_at,
    },
    api_key: apiKey
      ? {
          id: apiKey.id,
          name: apiKey.name,
          key_prefix: apiKey.key_prefix,
          tier: apiKey.tier,
          scopes: apiKey.scopes,
          last_used_at: apiKey.last_used_at,
          expires_at: apiKey.expires_at,
          created_at: apiKey.created_at,
        }
      : null,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
