import { NextRequest } from "next/server";
import { withAuth, apiJson, apiError } from "@/lib/api/auth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * GET /api/keys
 *
 * List API keys visible to the authenticated caller.
 * Filters by ?user_id= and/or ?school_id= query params.
 * Never returns the raw key or hash — only metadata.
 */
export async function GET(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  const { searchParams } = request.nextUrl;
  const userId = searchParams.get("user_id");
  const schoolId = searchParams.get("school_id");

  const supabase = createAdminClient();
  let query = supabase
    .from("api_keys")
    .select("id, name, key_prefix, scopes, user_id, school_id, is_active, last_used_at, expires_at, created_at")
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (userId) query = query.eq("user_id", userId);
  if (schoolId) query = query.eq("school_id", schoolId);

  const { data, error } = await query;

  if (error) {
    console.error("[GET /api/keys]", error);
    return apiError("Failed to list API keys", "INTERNAL_ERROR", 500);
  }

  return apiJson({ data: data ?? [] });
}

/**
 * POST /api/keys
 *
 * Create a new API key. Generates a random key with `knb_live_` prefix,
 * hashes it with SHA-256, and stores the hash. The plaintext key is
 * returned **only once** in this response.
 *
 * Body: { name: string, school_id: string, scopes?: string[], expires_at?: string }
 */
export async function POST(request: NextRequest) {
  const auth = await withAuth(request);
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return apiError("Invalid JSON body", "INVALID_BODY", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const schoolId = typeof body.school_id === "string" ? body.school_id : "";
  const scopes = Array.isArray(body.scopes) ? (body.scopes as string[]) : ["read", "write"];
  const expiresAt = typeof body.expires_at === "string" ? body.expires_at : null;

  if (!name) return apiError("name is required", "VALIDATION_ERROR", 400);
  if (!schoolId) return apiError("school_id is required", "VALIDATION_ERROR", 400);

  const rawKey = generateRawKey();
  const keyHash = await sha256(rawKey);
  const keyPrefix = rawKey.slice(0, 12);

  const supabase = createAdminClient();

  const { data: apiKey, error } = await supabase
    .from("api_keys")
    .insert({
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      user_id: auth.apiKey.id,
      school_id: schoolId,
      scopes,
      created_by: auth.apiKey.id,
      expires_at: expiresAt,
    })
    .select("id, name, key_prefix, scopes, school_id, is_active, expires_at, created_at")
    .single();

  if (error) {
    console.error("[POST /api/keys]", error);
    return apiError("Failed to create API key", "INTERNAL_ERROR", 500);
  }

  return apiJson(
    {
      data: apiKey,
      key: rawKey,
      message: "Store this key securely — it will not be shown again.",
    },
    201,
  );
}

/* ------------------------------------------------------------------ */
/* Internal helpers                                                    */
/* ------------------------------------------------------------------ */

async function sha256(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateRawKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "knb_live_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}
