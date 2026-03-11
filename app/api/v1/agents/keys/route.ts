import { NextRequest } from "next/server";
import { apiJson, apiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/v1/agents/keys?schoolId=...
 *
 * List agent API keys for a workspace. Uses Supabase session auth (cookies)
 * so it works from the browser Settings UI.
 */
export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const schoolId = request.nextUrl.searchParams.get("schoolId");
  if (!schoolId) return apiError("schoolId is required", "VALIDATION_ERROR", 400);

  const admin = createAdminClient();

  const { data, error } = await admin
    .from("agent_api_keys")
    .select("id, name, key_prefix, scopes, agent_id, school_id, last_used_at, expires_at, created_at, revoked_at")
    .eq("school_id", schoolId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[GET /api/v1/agents/keys]", error);
    return apiError("Failed to list agent keys", "INTERNAL_ERROR", 500);
  }

  return apiJson({ data: data ?? [] });
}
