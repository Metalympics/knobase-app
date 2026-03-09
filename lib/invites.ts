// ── Invite System ──
// Server-side invite creation, validation, and acceptance.
// Works with the `invites` table (see migration 010).

import { createClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/client";

type InviteRow = Database["public"]["Tables"]["invites"]["Row"];

export interface CreateInviteParams {
  email: string;
  schoolId: string;
  documentId?: string;
  inviterId: string;
  role?: "admin" | "editor" | "viewer";
}

/**
 * Create an invite and return the token.
 * Caller should send the email separately (e.g. via Resend).
 */
export async function createInvite({
  email,
  schoolId,
  documentId,
  inviterId,
  role = "editor",
}: CreateInviteParams): Promise<{ token: string; error: string | null }> {
  const supabase = createClient();
  const token = crypto.randomUUID();

  const { error } = await supabase.from("invites").insert({
    token,
    email,
    school_id: schoolId,
    document_id: documentId ?? null,
    invited_by: inviterId,
    role,
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });

  if (error) {
    console.error("Failed to create invite:", error);
    return { token: "", error: error.message };
  }

  return { token, error: null };
}

/**
 * Validate an invite token. Returns the invite if valid, null otherwise.
 */
export async function validateInvite(
  token: string
): Promise<InviteRow | null> {
  const supabase = createClient();

  const { data } = await supabase
    .from("invites")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  const invite = data as InviteRow | null;
  if (!invite) return null;
  if (invite.used_at) return null;
  if (new Date(invite.expires_at) < new Date()) return null;

  return invite;
}

/**
 * Accept an invite: update user's school_id, mark invite as used.
 * Should be called after the user is authenticated.
 */
export async function acceptInvite(
  authUserId: string,
  token: string
): Promise<{ success: boolean; redirectTo: string; error: string | null }> {
  const supabase = createClient();

  // 1. Validate invite
  const invite = await validateInvite(token);
  if (!invite) {
    return {
      success: false,
      redirectTo: "/s/default",
      error: "Invite is invalid or expired.",
    };
  }

  // 2. Look up public.users by auth_id
  const { data: publicUser } = await supabase
    .from("users")
    .select("id")
    .eq("auth_id", authUserId)
    .single();

  if (!publicUser) {
    return {
      success: false,
      redirectTo: "/s/default",
      error: "User profile not found.",
    };
  }

  // 3. Update user's school_id
  if (invite.school_id) {
    const { error: updateError } = await supabase
      .from("users")
      .update({ school_id: invite.school_id })
      .eq("id", publicUser.id);

    if (updateError) {
      console.error("Failed to update user school:", updateError);
      return {
        success: false,
        redirectTo: "/s/default",
        error: updateError.message,
      };
    }
  }

  // 4. Mark invite as used
  await supabase
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id);

  // 5. Determine redirect
  const redirectTo = invite.document_id
    ? `/d/${invite.document_id}`
    : invite.school_id
      ? `/s/${invite.school_id}`
      : "/s/default";

  return { success: true, redirectTo, error: null };
}

/**
 * Generate the full invite URL for a token.
 */
export function getInviteUrl(token: string): string {
  const base =
    typeof window !== "undefined"
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || "https://app.knobase.com";
  return `${base}/invite/${token}`;
}
