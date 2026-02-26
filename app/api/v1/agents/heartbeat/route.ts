import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { corsHeaders, apiJson, apiError } from "@/lib/api/auth";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

async function sha256(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ------------------------------------------------------------------ */
/* POST /api/v1/agents/heartbeat                                       */
/* ------------------------------------------------------------------ */

/**
 * Agent heartbeat — updates `last_seen_at` for the calling agent.
 * Called periodically by OpenClaw skill to indicate the agent is alive.
 *
 * Body: { agent_id: string }
 */
export async function POST(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  const supabase = createAdminClient();

  // ── Auth: validate Bearer token ──
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return apiError("Missing or invalid Authorization header", "UNAUTHORIZED", 401);
  }

  const rawToken = authHeader.slice(7);
  const keyHash = await sha256(rawToken);

  const { data: keyData, error: keyError } = await supabase
    .from("agent_api_keys")
    .select("workspace_id, revoked_at, expires_at")
    .eq("key_hash", keyHash)
    .is("revoked_at", null)
    .single();

  if (keyError || !keyData) {
    return apiError("Invalid API key", "UNAUTHORIZED", 401);
  }

  const kd = keyData as unknown as {
    workspace_id: string;
    revoked_at: string | null;
    expires_at: string | null;
  };

  if (kd.expires_at && new Date(kd.expires_at) < new Date()) {
    return apiError("API key has expired", "UNAUTHORIZED", 401);
  }

  // ── Parse body ──
  let body: { agent_id?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  if (!body.agent_id || typeof body.agent_id !== "string") {
    return apiError("Missing or invalid 'agent_id'", "BAD_REQUEST", 400);
  }

  // ── Update last_seen_at ──
  const now = new Date().toISOString();
  const { data: agent, error } = await supabase
    .from("agents")
    .update({ last_seen_at: now, is_active: true })
    .eq("agent_id", body.agent_id)
    .eq("workspace_id", kd.workspace_id)
    .select("agent_id, name, last_seen_at")
    .single();

  if (error || !agent) {
    return apiError("Agent not found or not registered in this workspace", "NOT_FOUND", 404);
  }

  // Also update api key last_used_at
  await supabase
    .from("agent_api_keys")
    .update({ last_used_at: now })
    .eq("key_hash", keyHash);

  return apiJson({
    ok: true,
    agent_id: (agent as unknown as { agent_id: string }).agent_id,
    last_seen_at: now,
  });
}

/* ------------------------------------------------------------------ */
/* OPTIONS (CORS)                                                      */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
