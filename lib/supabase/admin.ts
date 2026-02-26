// ── Supabase Admin Client ──
// Service-role client that bypasses RLS.
// Safe to import from both client and server modules since it does NOT
// depend on next/headers.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./client";

/**
 * Admin client with service role for admin operations.
 * Bypasses RLS policies — use with caution.
 * Only call in server-side code (API routes, server actions, webhooks).
 *
 * This module is intentionally separate from server.ts so that importing
 * createAdminClient does NOT pull in next/headers (which would break
 * client component bundles that transitively reference this).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Service role key is required for admin operations."
    );
  }

  return createSupabaseClient<Database>(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
