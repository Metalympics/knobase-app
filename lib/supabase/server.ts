// ── Supabase Server Clients ──
// For API routes and Server Components only.
// Uses next/headers which is NOT available in client components.

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./client";

// Re-export admin client for convenience (it does NOT use next/headers)
export { createAdminClient } from "./admin";

/**
 * Server client for API routes and Server Components.
 * Uses Next.js cookies for session management.
 */
export async function createServerClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing SUPABASE_URL or SUPABASE_ANON_KEY."
    );
  }

  const cookieStore = await cookies();

  return createSupabaseClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        cookie: cookieStore
          .getAll()
          .map((c) => `${c.name}=${c.value}`)
          .join("; "),
      },
    },
  });
}
