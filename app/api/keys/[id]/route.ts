import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

interface Params {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/keys/:id
 *
 * Revoke (soft-delete) an API key by setting is_active = false.
 * The row is preserved for audit purposes.
 */
export async function DELETE(request: NextRequest, { params }: Params) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id) return apiError("Key id is required", "VALIDATION_ERROR", 400);

  const supabase = createAdminClient();

  const { data: existing, error: fetchError } = await supabase
    .from("api_keys")
    .select("id, is_active")
    .eq("id", id)
    .single();

  if (fetchError || !existing) {
    return apiError("API key not found", "NOT_FOUND", 404);
  }

  if (!existing.is_active) {
    return apiError("API key is already revoked", "ALREADY_REVOKED", 409);
  }

  const { error: updateError } = await supabase
    .from("api_keys")
    .update({ is_active: false })
    .eq("id", id);

  if (updateError) {
    console.error("[DELETE /api/keys/:id]", updateError);
    return apiError("Failed to revoke API key", "INTERNAL_ERROR", 500);
  }

  return apiJson({ message: "API key revoked" });
}
