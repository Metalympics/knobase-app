import { NextRequest, NextResponse } from "next/server";
import { withAuth, corsHeaders, apiJson, apiError } from "@/lib/api/auth";
import { listVaultKeys, createVaultKey } from "@/lib/vault/store";

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders() });
}

/**
 * GET /api/vault — List all vault keys for the workspace (metadata only).
 */
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { school_id } = auth.apiKey;
  const keys = await listVaultKeys(school_id);

  return apiJson({
    keys: keys.map((k) => ({
      id: k.id,
      env_name: k.env_name,
      description: k.description,
      available: true,
      created_at: k.created_at,
      last_used_at: k.last_used_at,
    })),
  });
}

/**
 * POST /api/vault — Add a new API key to the vault.
 */
export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { school_id } = auth.apiKey;

  let body: { env_name?: string; description?: string; value?: string };
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "BAD_REQUEST", 400);
  }

  if (!body.env_name || typeof body.env_name !== "string") {
    return apiError("env_name is required", "VALIDATION_ERROR", 400);
  }

  if (!body.value || typeof body.value !== "string") {
    return apiError("value is required", "VALIDATION_ERROR", 400);
  }

  try {
    const key = await createVaultKey({
      school_id,
      env_name: body.env_name,
      description: body.description,
      value: body.value,
      created_by: auth.apiKey.agent_id ?? undefined,
    });

    return apiJson({ key }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create key";
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return apiError(
        `A key with env_name "${body.env_name}" already exists in this workspace`,
        "CONFLICT",
        409,
      );
    }
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}
