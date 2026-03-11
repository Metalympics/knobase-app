import { NextRequest } from "next/server";
import { apiJson, apiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/v1/agents/keys/:id
 *
 * Revoke (soft-delete) an agent API key. Uses Supabase session auth.
 */
export async function DELETE(_request: NextRequest, { params }: Params) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401);

  const { id } = await params;
  if (!id) return apiError("Key id is required", "VALIDATION_ERROR", 400);

  const admin = createAdminClient();

  const { data: existing, error: fetchError } = await admin
    .from("agent_api_keys")
    .select("id, revoked_at")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return apiError("Agent API key not found", "NOT_FOUND", 404);
  }

  if (existing.revoked_at) {
    return apiError("Agent API key is already revoked", "ALREADY_REVOKED", 409);
  }

  const { error: updateError } = await admin
    .from("agent_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id);

  if (updateError) {
    console.error("[DELETE /api/v1/agents/keys/:id]", updateError);
    return apiError("Failed to revoke agent API key", "INTERNAL_ERROR", 500);
  }

  return apiJson({ message: "Agent API key revoked" });
}
