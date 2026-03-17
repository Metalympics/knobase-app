import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";

/* ------------------------------------------------------------------ */
/* POST /api/presence/heartbeat                                         */
/* Agent heartbeat — updates last_heartbeat_at and sets status online.  */
/* Authenticated via Bearer token (agent_api_keys).                     */
/*                                                                      */
/* Body: {                                                              */
/*   timestamp?: string,   // ISO 8601 timestamp from agent             */
/*   status?: string       // e.g. "online", "away"                     */
/* }                                                                    */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { agent_id, school_id } = auth.apiKey;

  if (!agent_id) {
    return apiError(
      "This API key is not associated with an agent",
      "BAD_REQUEST",
      400
    );
  }

  let body: { timestamp?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const validStatuses = ["online", "away"];
  const presenceStatus =
    body.status && validStatuses.includes(body.status) ? body.status : "online";

  const now = new Date().toISOString();
  const supabase = createAdminClient();

  const { data: agent, error } = await supabase
    .from("users")
    .update({
      last_heartbeat_at: now,
      presence_status: presenceStatus,
      presence_updated_at: now,
      last_seen_at: now,
    })
    .eq("id", agent_id)
    .eq("school_id", school_id)
    .eq("type", "agent")
    .select("id, name, bot_id, presence_status, last_heartbeat_at")
    .single();

  if (error || !agent) {
    return apiError(
      "Agent not found or not registered in this workspace",
      "NOT_FOUND",
      404
    );
  }

  return apiJson({
    ok: true,
    agent_id: agent.id,
    bot_id: agent.bot_id,
    presence_status: agent.presence_status,
    last_heartbeat_at: agent.last_heartbeat_at,
    server_timestamp: now,
  });
}

/* ------------------------------------------------------------------ */
/* OPTIONS (CORS)                                                      */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
