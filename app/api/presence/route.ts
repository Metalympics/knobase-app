import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import { validateApiKey, ApiKeyError } from "@/lib/auth/api-key";

type PresenceMember = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  avatar_url: string | null;
  type: string;
  presence_status: string;
  last_seen_at: string | null;
  presence_updated_at: string | null;
  last_heartbeat_at: string | null;
  connection_quality: string | null;
};

type PresenceUpdateResult = {
  id: string;
  presence_status: string;
  websocket_session_id: string | null;
  presence_updated_at: string | null;
  connection_quality: string | null;
};

/* ------------------------------------------------------------------ */
/* GET /api/presence                                                    */
/* List all users with their presence status in the workspace.          */
/* Supports session auth (cookie) and API key auth (X-API-Key header).  */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  try {
    let schoolId: string;

    const adminClient = createAdminClient();
    const hasApiKey = request.headers.has("x-api-key");

    if (hasApiKey) {
      try {
        const identity = await validateApiKey(request);
        if (!identity.school_id) {
          return apiError("API key is not associated with a workspace", "BAD_REQUEST", 400);
        }
        schoolId = identity.school_id;
      } catch (err) {
        if (err instanceof ApiKeyError) {
          return apiError(err.message, err.code, err.statusCode);
        }
        throw err;
      }
    } else {
      const supabase = await createServerClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return apiError("Unauthorized", "UNAUTHORIZED", 401);
      }

      const { data: profile, error: profileError } = await supabase
        .from("users")
        .select("id, school_id")
        .eq("auth_id", user.id)
        .single();

      if (profileError || !profile || !profile.school_id) {
        return apiError("User profile not found", "USER_NOT_FOUND", 404);
      }

      schoolId = profile.school_id;
    }

    const { data: members, error } = await adminClient
      .from("users")
      .select(
        "id, name, display_name, email, avatar_url, type, presence_status, last_seen_at, presence_updated_at, last_heartbeat_at, connection_quality"
      )
      .eq("school_id", schoolId)
      .order("presence_status", { ascending: true });

    if (error) {
      console.error("[Presence] GET error:", error);
      return apiError("Failed to fetch presence data", "INTERNAL_ERROR", 500);
    }

    return apiJson({
      members: (members ?? []).map((m) => ({
        id: m.id,
        name: m.name,
        display_name: m.display_name,
        email: m.email,
        avatar_url: m.avatar_url,
        type: m.type,
        presence_status: m.presence_status,
        last_seen_at: m.last_seen_at,
        presence_updated_at: m.presence_updated_at,
        last_heartbeat_at: m.last_heartbeat_at,
        connection_quality: m.connection_quality,
      })),
      total: (members ?? []).length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Presence] GET error:", err);
    return apiError(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* POST /api/presence/update                                            */
/* Update human presence — called when WebSocket connects/disconnects.  */
/* Session auth only (cookie-based).                                    */
/*                                                                      */
/* Body: {                                                              */
/*   presence_status: "online" | "away" | "offline",                    */
/*   websocket_session_id?: string,                                     */
/*   connection_quality?: "excellent" | "good" | "poor"                 */
/* }                                                                    */
/* ------------------------------------------------------------------ */

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return apiError("Unauthorized", "UNAUTHORIZED", 401);
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select("id, school_id")
      .eq("auth_id", user.id)
      .single();

    if (profileError || !profile) {
      return apiError("User profile not found", "USER_NOT_FOUND", 404);
    }

    let body: {
      presence_status?: string;
      websocket_session_id?: string;
      connection_quality?: string;
    };
    try {
      body = await request.json();
    } catch {
      return apiError("Invalid JSON body", "BAD_REQUEST", 400);
    }

    const validStatuses = ["online", "away", "offline"];
    if (body.presence_status && !validStatuses.includes(body.presence_status)) {
      return apiError(
        `Invalid presence_status. Must be one of: ${validStatuses.join(", ")}`,
        "BAD_REQUEST",
        400
      );
    }

    const validQualities = ["excellent", "good", "poor"];
    if (body.connection_quality && !validQualities.includes(body.connection_quality)) {
      return apiError(
        `Invalid connection_quality. Must be one of: ${validQualities.join(", ")}`,
        "BAD_REQUEST",
        400
      );
    }

    const now = new Date().toISOString();
    const adminClient = createAdminClient();

    const updatePayload: Record<string, unknown> = {
      presence_updated_at: now,
      last_seen_at: now,
    };

    if (body.presence_status) {
      updatePayload.presence_status = body.presence_status;
    }
    if (body.websocket_session_id !== undefined) {
      updatePayload.websocket_session_id = body.websocket_session_id;
    }
    if (body.connection_quality !== undefined) {
      updatePayload.connection_quality = body.connection_quality;
    }

    const { data: updated, error: updateError } = await adminClient
      .from("users")
      .update(updatePayload)
      .eq("id", profile.id)
      .select("id, presence_status, websocket_session_id, presence_updated_at, connection_quality")
      .single();

    if (updateError) {
      console.error("[Presence] POST update error:", updateError);
      return apiError("Failed to update presence", "INTERNAL_ERROR", 500);
    }

    return apiJson({
      ok: true,
      user_id: updated.id,
      presence_status: updated.presence_status,
      websocket_session_id: updated.websocket_session_id,
      connection_quality: updated.connection_quality,
      updated_at: updated.presence_updated_at,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[Presence] POST error:", err);
    return apiError(message, "INTERNAL_ERROR", 500);
  }
}

/* ------------------------------------------------------------------ */
/* OPTIONS (CORS)                                                      */
/* ------------------------------------------------------------------ */

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}
