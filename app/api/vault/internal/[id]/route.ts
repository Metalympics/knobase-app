import { NextRequest } from "next/server";
import { apiJson, apiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { getVaultKey, updateVaultKey, deleteVaultKey } from "@/lib/vault/store";

type RouteContext = { params: Promise<{ id: string }> };

async function resolveSessionUser(schoolId?: string | null) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  let query = admin
    .from("users")
    .select("id, type, role_id, school_id")
    .eq("auth_id", user.id);

  if (schoolId) query = query.eq("school_id", schoolId);

  const { data } = await query.limit(1).single();
  return data;
}

/**
 * PATCH /api/vault/internal/:id
 * Update a vault key (session auth).
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  let body: { school_id?: string; description?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  const sessionUser = await resolveSessionUser(body.school_id);
  if (!sessionUser) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const schoolId = body.school_id ?? sessionUser.school_id;
  if (!schoolId) {
    return apiError("school_id is required", "BAD_REQUEST", 400);
  }

  const existing = await getVaultKey(id);
  if (!existing || existing.school_id !== schoolId) {
    return apiError("Vault key not found", "NOT_FOUND", 404);
  }

  try {
    const updated = await updateVaultKey(id, schoolId, {
      description: body.description,
      value: body.value,
    });
    return apiJson({ key: updated });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to update key";
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}

/**
 * DELETE /api/vault/internal/:id?school_id=...
 * Delete a vault key (session auth).
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const schoolId = request.nextUrl.searchParams.get("school_id");

  const sessionUser = await resolveSessionUser(schoolId);
  if (!sessionUser) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const wsId = schoolId ?? sessionUser.school_id;
  if (!wsId) {
    return apiError("school_id is required", "BAD_REQUEST", 400);
  }

  const existing = await getVaultKey(id);
  if (!existing || existing.school_id !== wsId) {
    return apiError("Vault key not found", "NOT_FOUND", 404);
  }

  const success = await deleteVaultKey(id, wsId);
  if (!success) {
    return apiError("Failed to delete vault key", "INTERNAL_ERROR", 500);
  }

  return apiJson({ deleted: true });
}
