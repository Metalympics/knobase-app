import { NextRequest, NextResponse } from "next/server";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import { getVaultKey, updateVaultKey, deleteVaultKey } from "@/lib/vault/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * PATCH /api/vault/:id — Update a vault key's description or value.
 */
export async function PATCH(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { school_id } = auth.apiKey;

  const existing = await getVaultKey(id);
  if (!existing || existing.school_id !== school_id) {
    return apiError("Vault key not found", "NOT_FOUND", 404);
  }

  let body: { description?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  try {
    const updated = await updateVaultKey(id, school_id, {
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
 * DELETE /api/vault/:id — Remove a vault key.
 */
export async function DELETE(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { school_id } = auth.apiKey;

  const existing = await getVaultKey(id);
  if (!existing || existing.school_id !== school_id) {
    return apiError("Vault key not found", "NOT_FOUND", 404);
  }

  const success = await deleteVaultKey(id, school_id);
  if (!success) {
    return apiError("Failed to delete vault key", "INTERNAL_ERROR", 500);
  }

  return apiJson({ deleted: true });
}
