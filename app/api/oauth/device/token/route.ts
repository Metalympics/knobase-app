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
    // Read body as text first, then parse based on content-type
    const bodyText = await request.text();
    let params: Record<string, string> = {};
    
    const contentType = request.headers.get('content-type') || '';
    
    if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data
      const searchParams = new URLSearchParams(bodyText);
      searchParams.forEach((value, key) => {
        params[key] = value;
      });
    } else {
      // Parse as JSON
      try {
        params = JSON.parse(bodyText);
      } catch {
        // Empty or invalid JSON
      }
    }

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

    console.log("[OAuth Token] Looking up device code:", deviceCode);

    let supabase;
    try {
      supabase = createAdminClient();
    } catch (clientErr: any) {
      console.error("[OAuth Token] Failed to create admin client:", clientErr.message);
      return NextResponse.json(
        { error: "server_error", error_description: "Database client initialization failed" },
        { status: 500 },
      );
    }

    const { data: record, error } = await supabase
      .from("oauth_device_codes")
      .select("*")
      .eq("device_code", deviceCode)
      .single();

    console.log("[OAuth Token] Query result:", { hasRecord: !!record, error: error?.message });

    if (error || !record) {
      console.error("[OAuth Token] Record not found:", error);
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

    // Don't delete the record here - let the connect endpoint handle it
    // after it retrieves the agent information

    return NextResponse.json({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: ACCESS_TOKEN_EXPIRES_IN,
    });
  } catch (err: any) {
    console.error("[OAuth Device Token] Unhandled error:", err.message, err);
    return NextResponse.json(
      { error: "server_error", error_description: "Internal server error: " + err.message },
      { status: 500 },
    );
  }
}
