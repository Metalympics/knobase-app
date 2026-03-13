import { NextRequest, NextResponse } from "next/server";
import { createServerClient, createAdminClient } from "@/lib/supabase/server";
import { createApiKey } from "@/lib/supabase/api-keys";

/**
 * POST /api/v1/agents/generate-key
 *
 * Generate an API key for an external agent so it can authenticate
 * against the Knobase API.
 *
 * The raw key is returned **once** — it cannot be retrieved later.
 *
 * Request body:
 *   { agentId: string, schoolId: string, name?: string, scopes?: string[] }
 *
 * Requires an authenticated Supabase session (workspace admin).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("[GenerateKey] getUser:", user ? `id=${user.id}` : "null", "error:", authError?.message ?? "none");

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { agentId, schoolId, name, scopes } = body as {
      agentId?: string;
      schoolId?: string;
      name?: string;
      scopes?: string[];
    };

    if (!agentId || !schoolId) {
      return NextResponse.json(
        { error: "agentId and schoolId are required" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    // Verify the caller is an admin of this workspace
    const { data: callerUser, error: callerError } = await admin
      .from("users")
      .select("id, type, role_id, school_id")
      .eq("auth_id", user.id)
      .eq("school_id", schoolId)
      .single();

    console.log("[GenerateKey] Caller lookup:", callerUser ? `type=${callerUser.type} role_id=${callerUser.role_id}` : "not found", "error:", callerError?.message ?? "none");

    const isAdmin =
      callerUser &&
      (callerUser.role_id === "system-admin" || callerUser.type === "admin");

    if (!callerUser || !isAdmin) {
      return NextResponse.json(
        { error: "Only workspace admins can generate API keys" },
        { status: 403 }
      );
    }

    // Look up the agent user to get the actual UUID (not bot_id)
    const { data: agentUser, error: agentError } = await admin
      .from("users")
      .select("id")
      .eq("bot_id", agentId)
      .eq("school_id", schoolId)
      .eq("type", "agent")
      .single();

    if (agentError || !agentUser) {
      return NextResponse.json(
        { error: "Agent not found — please register the agent first" },
        { status: 404 }
      );
    }

    const { key, rawKey } = await createApiKey({
      school_id: schoolId,
      agent_id: agentUser.id,  // Use the UUID, not bot_id
      name: name ?? `API Key for ${agentId}`,
      scopes: scopes ?? ["read", "write", "task"],
    });

    return NextResponse.json({
      success: true,
      apiKey: rawKey,
      keyId: key.id,
      keyPrefix: key.key_prefix,
      message: "Save this key securely — it cannot be retrieved later.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[GenerateKey] Error:", message, error);
    return NextResponse.json(
      { error: message || "Failed to generate API key" },
      { status: 500 }
    );
  }
}
