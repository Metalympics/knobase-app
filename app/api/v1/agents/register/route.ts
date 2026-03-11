import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const registerSchema = z.object({
  agent_id: z.string().min(1).max(200).optional(),
  agentId: z.string().min(1).max(200).optional(),
  name: z.string().min(1).max(100),
  schoolId: z.string().uuid().optional(),
  type: z.enum(["openclaw", "knobase_ai", "custom"]).default("openclaw"),
  role: z.string().max(50).optional(),
  description: z.string().max(500).optional(),
  version: z.string().max(20).default("1.0.0"),
  capabilities: z.array(z.string().max(50)).max(20).default([]),
  platform: z.string().max(100).optional(),
  hostname: z.string().max(200).optional(),
}).refine((d) => d.agent_id || d.agentId, {
  message: "agent_id or agentId is required",
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

type AuthOutcome =
  | { mode: "api-key"; schoolId: string }
  | { mode: "session"; schoolId: string; authUserId: string }
  | { mode: "error"; response: NextResponse };

async function resolveAuth(
  request: NextRequest,
  bodySchoolId: string | undefined,
): Promise<AuthOutcome> {
  const authHeader = request.headers.get("Authorization");
  console.log("[Agent Register] Auth header present:", !!authHeader);

  if (authHeader?.startsWith("Bearer ")) {
    console.log("[Agent Register] Using Bearer token auth");
    const admin = createAdminClient();
    const rawToken = authHeader.slice(7);
    const keyHash = await sha256(rawToken);

    const { data: keyData, error: keyError } = await admin
      .from("agent_api_keys")
      .select("school_id, revoked_at, expires_at")
      .eq("key_hash", keyHash)
      .is("revoked_at", null)
      .single();

    if (keyError || !keyData) {
      console.log("[Agent Register] Bearer token invalid:", keyError?.message);
      return { mode: "error", response: apiError("Invalid API key", "UNAUTHORIZED", 401) };
    }

    const kd = keyData as unknown as { school_id: string; expires_at: string | null };
    if (kd.expires_at && new Date(kd.expires_at) < new Date()) {
      return { mode: "error", response: apiError("API key has expired", "UNAUTHORIZED", 401) };
    }

    return { mode: "api-key", schoolId: kd.school_id };
  }

  // Fall back to Supabase session auth (browser/UI calls)
  console.log("[Agent Register] No Bearer token — trying session auth via cookies");

  const supabase = await createServerClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  console.log("[Agent Register] getUser result:", user ? `id=${user.id} email=${user.email}` : "null", "error:", userError?.message ?? "none");

  if (!user) {
    return { mode: "error", response: apiError("Not authenticated — session cookie missing or expired", "UNAUTHORIZED", 401) };
  }

  if (!bodySchoolId) {
    console.log("[Agent Register] Session auth OK but no schoolId in body");
    return { mode: "error", response: apiError("schoolId is required for session-based auth", "BAD_REQUEST", 400) };
  }

  const admin = createAdminClient();
  const { data: callerUser, error: callerError } = await admin
    .from("users")
    .select("school_id")
    .eq("auth_id", user.id)
    .eq("school_id", bodySchoolId)
    .single();

  console.log("[Agent Register] Workspace membership check:", callerUser ? "found" : "not found", "error:", callerError?.message ?? "none");

  if (!callerUser) {
    return { mode: "error", response: apiError("You are not a member of this workspace", "FORBIDDEN", 403) };
  }

  console.log("[Agent Register] Session auth OK — user", user.id, "schoolId", bodySchoolId);
  return { mode: "session", schoolId: bodySchoolId, authUserId: user.id };
}

/* ------------------------------------------------------------------ */
/* POST /api/v1/agents/register                                        */
/* ------------------------------------------------------------------ */

/**
 * Register a new agent (e.g. OpenClaw) with the workspace.
 *
 * Auth: Bearer API key (external agents) OR Supabase session cookie
 * (logged-in user inviting from the UI).
 *
 * Upserts on agent_id — calling again updates the existing record.
 */
export async function POST(request: NextRequest) {
  console.log("[Agent Register] POST hit —", request.nextUrl.pathname);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders() });
  }

  // ── Parse body first (needed for session auth schoolId) ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  console.log("[Agent Register] Body:", JSON.stringify(body));

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    console.log("[Agent Register] Validation failed:", parsed.error.issues);
    return apiError("Validation failed", "VALIDATION_ERROR", 400, parsed.error.issues);
  }

  const data = parsed.data;
  const agentId = data.agent_id ?? data.agentId!;

  // ── Authenticate ──
  const auth = await resolveAuth(request, data.schoolId);
  if (auth.mode === "error") return auth.response;

  const schoolId = auth.schoolId;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  // ── Upsert agent as users row (type='agent') ──
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("bot_id", agentId)
    .eq("school_id", schoolId)
    .single();

  const existingRow = existing as unknown as { id: string } | null;

  let agentUser: unknown;

  if (existingRow) {
    const { data: updated, error } = await supabase
      .from("users")
      .update({
        name: data.name,
        agent_type: data.type,
        capabilities: data.capabilities,
        availability: "online",
        last_invoked_at: now,
      })
      .eq("id", existingRow.id)
      .select("id, bot_id, school_id, name, agent_type, created_at")
      .single();

    if (error) {
      console.error("[Agent Register] Update error:", error);
      return apiError("Failed to register agent", "INTERNAL_ERROR", 500);
    }
    agentUser = updated;
  } else {
    const { data: inserted, error } = await supabase
      .from("users")
      .insert({
        auth_id: crypto.randomUUID(),
        email: `${agentId}@bot.internal`,
        name: data.name,
        type: "agent",
        bot_id: agentId,
        school_id: schoolId,
        agent_type: data.type,
        capabilities: data.capabilities,
        availability: "online",
        last_invoked_at: now,
      })
      .select("id, bot_id, school_id, name, agent_type, created_at")
      .single();

    if (error) {
      console.error("[Agent Register] Insert error:", error);
      return apiError("Failed to register agent", "INTERNAL_ERROR", 500);
    }
    agentUser = inserted;
  }

  const row = agentUser as {
    id: string;
    bot_id: string;
    school_id: string;
    name: string;
    agent_type: string;
    created_at: string;
  };

  return apiJson({
    success: true,
    agent: {
      id: row.id,
      agent_id: row.bot_id,
      school_id: row.school_id,
      name: row.name,
      type: row.agent_type,
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
