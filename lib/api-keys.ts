// ── API Key Utilities ──
// Thin wrappers around lib/supabase/api-keys.ts for convenience.
// Re-exports the core CRUD + adds sync helper functions
// matching the interface expected by the OpenClaw Gateway integration.

export {
  createApiKey,
  listApiKeysBySchool,
  findApiKeyByRawToken,
  revokeApiKey,
} from "@/lib/supabase/api-keys";

/**
 * Generate a random API key string.
 * Format: `kb_` + 64 hex chars (32 bytes).
 */
export function generateApiKey(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return (
    "kb_" +
    Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("")
  );
}

/**
 * Hash an API key using SHA-256 (Web Crypto — works in Edge Runtime).
 */
export async function hashApiKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(apiKey);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Timing-safe comparison of two hex strings.
 * Uses constant-time comparison to prevent timing attacks.
 */
export async function verifyApiKey(
  rawKey: string,
  storedHash: string
): Promise<boolean> {
  const computedHash = await hashApiKey(rawKey);
  if (computedHash.length !== storedHash.length) return false;

  // Constant-time comparison using XOR
  let result = 0;
  for (let i = 0; i < computedHash.length; i++) {
    result |= computedHash.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return result === 0;
}
