import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

const USER_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ123456789";
const USER_CODE_LENGTH = 8;
const EXPIRES_IN = 900;
const POLL_INTERVAL = 5;
const DEFAULT_CLIENT_ID = "openclaw-cli";
const DEFAULT_SCOPE = ["read", "write", "task"];

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
    const deviceCode = randomUUID();
    const userCode = generateUserCode();

    const body = await request.json().catch(() => ({})) as { client_id?: string };
    const clientId = body.client_id ?? DEFAULT_CLIENT_ID;

    console.log("[OAuth Code] Generating code for client:", clientId);

    let supabase;
    try {
      supabase = createAdminClient();
    } catch (clientErr: any) {
      console.error("[OAuth Code] Failed to create admin client:", clientErr.message);
      return NextResponse.json(
        { error: "server_error", error_description: "Database client initialization failed: " + clientErr.message },
        { status: 500 },
      );
    }
    
    const expiresAt = new Date(Date.now() + EXPIRES_IN * 1000).toISOString();

    console.log("[OAuth Code] Inserting into database...");
    
    const { data: insertData, error: insertErr } = await supabase.from("oauth_device_codes").insert({
      device_code: deviceCode,
      user_code: userCode,
      client_id: clientId,
      scope: DEFAULT_SCOPE,
      expires_at: expiresAt,
      interval: POLL_INTERVAL,
    }).select();

    if (insertErr) {
      console.error("[OAuth Device Code] Insert failed:", insertErr.message, insertErr);
      return NextResponse.json(
        {
          error: "server_error",
          error_description: "Failed to store device code: " + insertErr.message,
        },
        { status: 500 },
      );
    }

    console.log("[OAuth Code] Successfully stored:", { user_code: userCode, insertData });

    const verificationUri =
      `${process.env.NEXT_PUBLIC_APP_URL ?? "https://knobase.app"}/oauth/device`;

    return NextResponse.json({
      device_code: deviceCode,
      user_code: userCode,
      verification_uri: verificationUri,
      expires_in: EXPIRES_IN,
      interval: POLL_INTERVAL,
    });
  } catch (err: any) {
    console.error("[OAuth Device Code] Unhandled error:", err.message, err);
    return NextResponse.json(
      { error: "server_error", error_description: "Failed to generate device code: " + err.message },
      { status: 500 },
    );
  }
}
