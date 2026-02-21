import { createBrowserClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          auth_id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          auth_id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          auth_id?: string;
          email?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at: string;
          updated_at: string;
          settings: Record<string, unknown>;
          invite_code: string;
          icon: string | null;
          color: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          created_at?: string;
          updated_at?: string;
          settings?: Record<string, unknown>;
          invite_code: string;
          icon?: string | null;
          color?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          created_at?: string;
          updated_at?: string;
          settings?: Record<string, unknown>;
          invite_code?: string;
          icon?: string | null;
          color?: string | null;
        };
      };
      workspace_members: {
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          joined_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role: "admin" | "editor" | "viewer";
          joined_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: "admin" | "editor" | "viewer";
          joined_at?: string;
        };
      };
      documents: {
        Row: {
          id: string;
          workspace_id: string;
          title: string;
          content: string;
          created_at: string;
          updated_at: string;
          created_by: string;
          visibility: "private" | "shared" | "public";
        };
        Insert: {
          id?: string;
          workspace_id: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          created_by: string;
          visibility?: "private" | "shared" | "public";
        };
        Update: {
          id?: string;
          workspace_id?: string;
          title?: string;
          content?: string;
          created_at?: string;
          updated_at?: string;
          created_by?: string;
          visibility?: "private" | "shared" | "public";
        };
      };
    };
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];

export type InsertDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];

export type UpdateDto<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

function getEnvVars() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Add them to .env.local to enable authentication and database features."
    );
  }

  return { url, anonKey };
}

/**
 * Browser client for client-side usage
 * Automatically handles cookie-based session management
 */
export function createClient(): SupabaseClient<Database> {
  const { url, anonKey } = getEnvVars();

  return createBrowserClient<Database>(url, anonKey);
}

/**
 * Server client for API routes and Server Components
 * Uses Next.js cookies for session management
 */
export async function createServerClient(): Promise<SupabaseClient<Database>> {
  const { url, anonKey } = getEnvVars();
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

/**
 * Admin client with service role for admin operations
 * Can bypass RLS policies - use with caution
 * Only use in server-side code (API routes, server actions)
 */
export function createAdminClient(): SupabaseClient<Database> {
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
