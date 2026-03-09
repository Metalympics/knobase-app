import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createApiKey } from "@/lib/supabase/api-keys";

/**
 * POST /api/v1/agents/generate-key
 *
 * Generate an API key for an external agent (e.g. OpenClaw) so it can
 * authenticate against the Knobase API.
 *
 * The raw key is returned **once** — it cannot be retrieved later.
 *
 * Request body:
 *   { agentId: string, workspaceId: string, name?: string, scopes?: string[] }
 *
 * Requires an authenticated Supabase session (workspace admin).
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

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

    // Verify the caller is an admin of the school
    const { data: callerUser } = await supabase
      .from("users")
      .select("role, school_id")
      .eq("auth_id", user.id)
      .single();

    if (!callerUser || callerUser.school_id !== schoolId || callerUser.role !== "admin") {
      return NextResponse.json(
        { error: "Only school admins can generate API keys" },
        { status: 403 }
      );
    }

    // Create the key via existing CRUD module
    const { key, rawKey } = await createApiKey({
      school_id: schoolId,
      agent_id: agentId,
      name: name ?? `API Key for ${agentId}`,
      scopes: scopes ?? ["read", "write", "task"],
    });

    return NextResponse.json({
      success: true,
      apiKey: rawKey, // ⚠️ SAVE THIS — it will NOT be shown again
      keyId: key.id,
      keyPrefix: key.key_prefix,
      message: "Save this key securely — it cannot be retrieved later.",
    });
  } catch (error) {
    console.error("[GenerateKey] Error:", error);
    return NextResponse.json(
      { error: "Failed to generate API key" },
      { status: 500 }
    );
  }
}
