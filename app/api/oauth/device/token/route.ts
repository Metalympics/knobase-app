import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { randomUUID } from "crypto";

interface DeviceCodeRecord {
  id: string;
  device_code: string;
  user_code: string;
  client_id: string;
  user_id: string | null;
  scope: string[];
  expires_at: string;
  interval: number;
  last_polled_at: string | null;
  access_token: string | null;
  created_at: string;
}

const ACCESS_TOKEN_EXPIRES_IN = 3600;

export async function POST(request: NextRequest) {
  try {
    const body = await request.formData().catch(() => null);
    const params = body
      ? Object.fromEntries(body.entries())
      : await request.json();

    const grantType = params.grant_type as string | undefined;
    const deviceCode = params.device_code as string | undefined;

    if (grantType !== "urn:ietf:params:oauth:grant-type:device_code") {
      return NextResponse.json(
        { error: "unsupported_grant_type" },
        { status: 400 },
      );
    }

    if (!deviceCode) {
      return NextResponse.json(
        { error: "invalid_request", error_description: "device_code is required" },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("oauth_device_codes")
      .select("*")
      .eq("device_code", deviceCode)
      .single();

    const record = data as unknown as DeviceCodeRecord | null;

    if (error || !record) {
      return NextResponse.json(
        { error: "invalid_grant", error_description: "Unknown device code" },
        { status: 400 },
      );
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "expired_token", error_description: "The device code has expired" },
        { status: 400 },
      );
    }

    if (!record.user_id) {
      return NextResponse.json(
        { error: "authorization_pending", error_description: "The user has not yet authorized this device" },
        { status: 400 },
      );
    }

    const accessToken = randomUUID();

    await (supabase
      .from("oauth_device_codes") as any)
      .delete()
      .eq("device_code", deviceCode);

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (err) {
    console.error("[OAuth Device Token]", err);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error" },
      { status: 500 },
    );
  }
}
