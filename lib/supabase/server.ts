// ── Supabase Server Clients ──
// For API routes and Server Components only.
// Uses next/headers which is NOT available in client components.

import { createServerClient as createSSRClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./client";

// Re-export admin client for convenience (it does NOT use next/headers)
export { createAdminClient } from "./admin";

/**
 * Server client for API routes and Server Components.
 * Uses @supabase/ssr with proper cookie bridging so auth.getUser() works.
 */
export async function createServerClient() {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
  }

  const cookieStore = await cookies();

  return createSSRClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // setAll can throw in Server Components (read-only context).
          // Safe to ignore — middleware handles token refresh.
        }
      },
    },
  });
}
