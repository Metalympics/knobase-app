// ── Auth Callback Route ──
// Handles OAuth and magic link redirects from Supabase.
// Creates public.users record on first sign-in.
// Redirects to onboarding if no workspace assigned.

import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const redirect = searchParams.get("redirect");
  const inviteToken = searchParams.get("invite");

  // Default destination
  const destination = redirect || "/knowledge";

  if (code) {
    const response = NextResponse.redirect(new URL(destination, origin));

    const supabase = createServerClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set(name: string, value: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value, ...options });
          },
          remove(name: string, options: Record<string, unknown>) {
            response.cookies.set({ name, value: "", ...options });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("Auth callback error:", error);
      return NextResponse.redirect(
        new URL("/auth/login?error=auth_failed", origin)
      );
    }

    // Get authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Check if public.users record already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id, display_name")
        .eq("auth_id", user.id)
        .maybeSingle();

      if (!existingUser) {
        // First sign-in — create public.users record
        const displayName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "User";

        const { error: insertError } = await supabase.from("users").insert({
          auth_id: user.id,
          email: user.email!,
          display_name: displayName,
          avatar_url: user.user_metadata?.avatar_url || null,
        });

        if (insertError && insertError.code !== "23505") {
          console.error("Failed to create user profile:", insertError);
        }

        // New user → send to onboarding (unless coming from invite)
        if (!inviteToken) {
          return NextResponse.redirect(new URL("/onboarding", origin));
        }
      }

      // Handle invite token auto-accept
      if (inviteToken) {
        try {
          // Look up the invite
          const { data: invite } = await supabase
            .from("invites")
            .select("id, workspace_id, document_id, role, expires_at, used_at")
            .eq("token", inviteToken)
            .maybeSingle();

          if (
            invite &&
            !invite.used_at &&
            new Date(invite.expires_at) > new Date()
          ) {
            // Get the user's public.users ID
            const { data: publicUser } = await supabase
              .from("users")
              .select("id")
              .eq("auth_id", user.id)
              .single();

            if (publicUser && invite.workspace_id) {
              // Add user to workspace
              await supabase.from("workspace_members").upsert(
                {
                  workspace_id: invite.workspace_id,
                  user_id: publicUser.id,
                  role: (invite.role as "admin" | "editor" | "viewer") || "editor",
                },
                { onConflict: "workspace_id,user_id" }
              );

              // Mark invite as used
              await supabase
                .from("invites")
                .update({ used_at: new Date().toISOString() })
                .eq("id", invite.id);

              // Redirect to the invited document or workspace
              if (invite.document_id) {
                return NextResponse.redirect(
                  new URL(`/d/${invite.document_id}`, origin)
                );
              }
              // Redirect to workspace
              return NextResponse.redirect(
                new URL(`/w/${invite.workspace_id}`, origin)
              );
            }
          }
        } catch (err) {
          console.error("Invite acceptance error:", err);
          // Fall through to default redirect
        }
      }
    }

    return response;
  }

  // No code → redirect to home
  return NextResponse.redirect(new URL("/", origin));
}
