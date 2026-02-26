import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const registerSchema = z.object({
  agent_id: z.string().min(1).max(200),
  name: z.string().min(1).max(100),
  type: z.enum(["openclaw", "knobase_ai", "custom"]).default("openclaw"),
  version: z.string().max(20).default("1.0.0"),
  capabilities: z.array(z.string().max(50)).max(20).default([]),
  platform: z.string().max(100).optional(),
  hostname: z.string().max(200).optional(),
});

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
/* POST /api/v1/agents/register                                        */
/* ------------------------------------------------------------------ */

/**
 * Register a new agent (e.g. OpenClaw) with the workspace.
 * Authenticates via Bearer API key (same keys used for other v1 endpoints).
 * Upserts on agent_id — calling again updates the existing record.
 */
export async function POST(request: NextRequest) {
  // CORS preflight
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  const supabase = createAdminClient();

  // ── Auth: validate Bearer token against agent_api_keys ──
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

  // Check key expiry
  const kd = keyData as unknown as { workspace_id: string; revoked_at: string | null; expires_at: string | null };
  if (kd.expires_at && new Date(kd.expires_at) < new Date()) {
    return apiError("API key has expired", "UNAUTHORIZED", 401);
  }

  // ── Parse & validate body ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(
      "Validation failed",
      "VALIDATION_ERROR",
      400,
      parsed.error.issues,
    );
  }

  const data = parsed.data;

  // ── Upsert agent ──
  const { data: agent, error } = await supabase
    .from("agents")
    .upsert(
      {
        agent_id: data.agent_id,
        workspace_id: kd.workspace_id,
        name: data.name,
        type: data.type,
        version: data.version,
        capabilities: data.capabilities,
        platform: data.platform ?? null,
        hostname: data.hostname ?? null,
        is_active: true,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "agent_id", ignoreDuplicates: false },
    )
    .select()
    .single();

  if (error) {
    console.error("[Agent Register] Error:", error);
    return apiError("Failed to register agent", "INTERNAL_ERROR", 500);
  }

  const row = agent as unknown as {
    id: string;
    agent_id: string;
    workspace_id: string;
    name: string;
    type: string;
    created_at: string;
  };

  return apiJson({
    success: true,
    agent: {
      id: row.id,
      agent_id: row.agent_id,
      workspace_id: row.workspace_id,
      name: row.name,
      type: row.type,
      created_at: row.created_at,
    },
  });
}

/**
 * OPTIONS handler for CORS preflight.
 */
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
