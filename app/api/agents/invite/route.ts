import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ123456789";
const USER_CODE_LENGTH = 8;
const EXPIRES_IN = 900;
const CLIENT_ID = "openclaw-knobase-skill";

function generateUserCode(): string {
  const chars: string[] = [];
  const bytes = new Uint8Array(USER_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    chars.push(USER_CODE_ALPHABET[b % USER_CODE_ALPHABET.length]);
  }
  return `${chars.slice(0, 4).join("")}-${chars.slice(4).join("")}`;
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const agentName: string | undefined = body.agent_name;

    const supabase = await createServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Not authenticated", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    const admin = createAdminClient();

    const { data: profile, error: profileError } = await admin
      .from("users")
      .select("id, school_id")
      .eq("auth_id", user.id)
      .limit(1)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "User profile not found", code: "USER_NOT_FOUND" },
        { status: 404 },
      );
    }

    const deviceCode = randomUUID();
    const userCode = generateUserCode();
    const expiresAt = new Date(Date.now() + EXPIRES_IN * 1000).toISOString();

    const { error: insertError } = await admin.from("oauth_device_codes").insert({
      device_code: deviceCode,
      user_code: userCode,
      client_id: CLIENT_ID,
      user_id: profile.id,
      school_id: profile.school_id,
      expires_at: expiresAt,
      status: "pending",
      ...(agentName ? { agent_name: agentName } : {}),
    });

    if (insertError) {
      console.error("[Agent Invite] Insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create invite code", code: "INTERNAL_ERROR" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      device_code: deviceCode,
      user_code: userCode,
      command: `openclaw-knobase connect --code ${userCode}`,
      expires_in: EXPIRES_IN,
      ...(agentName ? { agent_name: agentName } : {}),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Agent Invite] Unhandled error:", message);
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
