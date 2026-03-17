import { NextRequest } from "next/server";
import { apiJson, apiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { createVaultKey, listVaultKeys } from "@/lib/vault/store";

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
 * GET /api/vault/internal?school_id=...
 * List vault keys (session auth, for browser UI).
 */
export async function GET(request: NextRequest) {
  const schoolId = request.nextUrl.searchParams.get("school_id");
  const sessionUser = await resolveSessionUser(schoolId);
  if (!sessionUser) {
    return apiError("Unauthorized", "UNAUTHORIZED", 401);
  }

  const wsId = schoolId ?? sessionUser.school_id;
  if (!wsId) {
    return apiError("school_id is required", "BAD_REQUEST", 400);
  }

  const keys = await listVaultKeys(wsId);
  return apiJson({ keys });
}

/**
 * POST /api/vault/internal
 * Create a vault key (session auth, for browser UI).
 */
export async function POST(request: NextRequest) {
  let body: {
    school_id?: string;
    env_name?: string;
    description?: string;
    value?: string;
  };
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

  if (!body.env_name || !body.value) {
    return apiError("env_name and value are required", "VALIDATION_ERROR", 400);
  }

  try {
    const key = await createVaultKey({
      school_id: schoolId,
      env_name: body.env_name,
      description: body.description,
      value: body.value,
      created_by: sessionUser.id,
    });
    return apiJson({ key }, 201);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to create key";
    if (msg.includes("duplicate key") || msg.includes("unique")) {
      return apiError(
        `A key with env_name "${body.env_name}" already exists`,
        "CONFLICT",
        409,
      );
    }
    return apiError(msg, "INTERNAL_ERROR", 500);
  }
}
