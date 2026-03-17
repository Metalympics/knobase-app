import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/agents/invite/status?device_code=<uuid>
 *
 * Polls the device code record to check if an agent has connected.
 * Returns the agent details once the status flips to "completed".
 */
export async function GET(request: NextRequest) {
  const deviceCode = request.nextUrl.searchParams.get("device_code");

  if (!deviceCode) {
    return NextResponse.json(
      { error: "device_code query parameter is required" },
      { status: 400 },
    );
  }

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

  const { data: record, error: dcError } = await (admin
    .from("oauth_device_codes") as any)
    .select("status, agent_id, agent_name, expires_at, user_id")
    .eq("device_code", deviceCode)
    .single();

  if (dcError || !record) {
    return NextResponse.json(
      { status: "not_found", message: "Device code not found or already cleaned up" },
      { status: 404 },
    );
  }

  if (new Date(record.expires_at) < new Date()) {
    return NextResponse.json({
      status: "expired",
      message: "The device code has expired",
    });
  }

  if (record.status === "completed" && record.agent_id) {
    const { data: agent } = await admin
      .from("users")
      .select("id, name, bot_id, availability, created_at")
      .eq("id", record.agent_id)
      .single();

    return NextResponse.json({
      status: "connected",
      agent: agent
        ? {
            id: agent.id,
            name: (agent as any).name ?? record.agent_name ?? "OpenClaw Agent",
            bot_id: (agent as any).bot_id,
            availability: (agent as any).availability,
            connected_at: new Date().toISOString(),
          }
        : {
            id: record.agent_id,
            name: record.agent_name ?? "OpenClaw Agent",
            connected_at: new Date().toISOString(),
          },
    });
  }

  return NextResponse.json({
    status: "pending",
    message: "Waiting for agent to connect",
  });
}
