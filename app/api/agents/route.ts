import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import type { Agent } from "@/lib/supabase/types";

type AgentListItem = Pick<
  Agent,
  | "id"
  | "name"
  | "display_name"
  | "avatar_url"
  | "description"
  | "capabilities"
  | "expertise"
  | "availability"
  | "agent_type"
  | "bot_id"
  | "total_invocations"
  | "last_invoked_at"
  | "created_at"
>;

const AGENT_SELECT_FIELDS = [
  "id",
  "name",
  "display_name",
  "avatar_url",
  "description",
  "capabilities",
  "expertise",
  "availability",
  "agent_type",
  "bot_id",
  "total_invocations",
  "last_invoked_at",
  "created_at",
].join(", ");

/**
 * GET /api/agents
 *
 * List all active (non-suspended) agents in the workspace associated
 * with the caller's API key.
 */
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { school_id } = auth.apiKey;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("users")
    .select(AGENT_SELECT_FIELDS)
    .eq("school_id", school_id)
    .eq("type", "agent")
    .eq("is_suspended", false)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[Agents GET] Error:", error);
    return apiError("Failed to list agents", "INTERNAL_ERROR", 500);
  }

  const agents = (data ?? []) as unknown as AgentListItem[];

  return apiJson({
    agents: agents.map((a) => ({
      id: a.id,
      name: a.name,
      display_name: a.display_name,
      avatar_url: a.avatar_url,
      description: a.description,
      capabilities: a.capabilities,
      expertise: a.expertise,
      availability: a.availability,
      agent_type: a.agent_type,
      bot_id: a.bot_id,
      total_invocations: a.total_invocations,
      last_invoked_at: a.last_invoked_at,
      created_at: a.created_at,
    })),
    count: agents.length,
  });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
