import { NextRequest, NextResponse } from "next/server";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import { getVaultKey, decryptVaultKey } from "@/lib/vault/store";

type RouteContext = { params: Promise<{ id: string }> };

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/vault/:id/value — Decrypt and return a vault key's value.
 * Logs the access for audit.
 */
export async function GET(request: NextRequest, context: RouteContext) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { id } = await context.params;
  const { school_id, agent_id } = auth.apiKey;

  const existing = await getVaultKey(id);
  if (!existing || existing.school_id !== school_id) {
    return apiError("Vault key not found", "NOT_FOUND", 404);
  }

  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    undefined;

  const result = await decryptVaultKey(id, school_id, {
    agentId: agent_id ?? undefined,
    ipAddress: ip,
  });

  if (!result) {
    return apiError("Failed to decrypt vault key", "INTERNAL_ERROR", 500);
  }

  return apiJson({
    env_name: result.env_name,
    description: result.description,
    value: result.value,
    expires_in: 300,
  });
}
