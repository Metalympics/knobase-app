import { createAdminClient } from "@/lib/supabase/admin";

export class ApiKeyError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "MISSING_KEY"
      | "INVALID_KEY"
      | "EXPIRED_KEY"
      | "INACTIVE_KEY"
      | "DB_ERROR",
    public readonly statusCode: number = 401
  ) {
    super(message);
    this.name = "ApiKeyError";
  }
}

export type ApiKeyIdentity = {
  user_id: string;
  school_id: string | null;
  scopes: string[];
};

async function hashKey(raw: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(raw);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function validateApiKey(
  request: Request
): Promise<ApiKeyIdentity> {
  const apiKey = request.headers.get("X-API-Key");
  if (!apiKey) {
    throw new ApiKeyError("Missing X-API-Key header", "MISSING_KEY");
  }

  const keyHash = await hashKey(apiKey);
  const supabase = createAdminClient();

  const { data: row, error } = await supabase
    .from("api_keys")
    .select("user_id, school_id, scopes, is_active, expires_at")
    .eq("key_hash", keyHash)
    .single();

  if (error || !row) {
    throw new ApiKeyError("Invalid API key", "INVALID_KEY");
  }

  if (!row.is_active) {
    throw new ApiKeyError("API key has been revoked", "INACTIVE_KEY", 403);
  }

  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    throw new ApiKeyError("API key has expired", "EXPIRED_KEY", 403);
  }

  supabase
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("key_hash", keyHash)
    .then();

  return {
    user_id: row.user_id,
    school_id: row.school_id ?? null,
    scopes: row.scopes ?? [],
  };
}
