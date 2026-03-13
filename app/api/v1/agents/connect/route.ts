import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createApiKey } from "@/lib/supabase/api-keys";

/**
 * POST /api/v1/agents/connect
 *
 * Completes agent registration after the Device Code Flow.
 * The CLI polls this endpoint with its device_code once the user has
 * approved the request in the browser.
 *
 * Request body:
 *   { device_code: string }
 *
 * Returns:
 *   { agent_id, api_key, workspace_id }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_code: deviceCode } = body as { device_code?: string };

    if (!deviceCode) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Look up the device code record
    const { data: record, error: dcError } = await admin
      .from("oauth_device_codes")
      .select("*")
      .eq("device_code", deviceCode)
      .single();

    if (dcError || !record) {
      return NextResponse.json(
        { error: "invalid_device_code", message: "Unknown or invalid device code" },
        { status: 400 },
      );
    }

    if (new Date(record.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "expired_token", message: "The device code has expired" },
        { status: 400 },
      );
    }

    if (!record.user_id) {
      return NextResponse.json(
        { error: "authorization_pending", message: "The user has not yet authorized this device" },
        { status: 400 },
      );
    }

    // Resolve the authorizing user to get their school_id
    const { data: authorizingUser, error: userError } = await admin
      .from("users")
      .select("id, school_id")
      .eq("id", record.user_id)
      .single();

    if (userError || !authorizingUser?.school_id) {
      return NextResponse.json(
        { error: "user_not_found", message: "Authorizing user or workspace not found" },
        { status: 404 },
      );
    }

    const schoolId = authorizingUser.school_id;
    const botId = record.client_id;

    // Check if an agent user already exists for this bot in this workspace
    const { data: existingAgent } = await admin
      .from("users")
      .select("id")
      .eq("bot_id", botId)
      .eq("school_id", schoolId)
      .eq("type", "agent")
      .single();

    let agentId: string;

    if (existingAgent) {
      agentId = existingAgent.id;
    } else {
      // Create the agent user record
      const { data: newAgent, error: insertError } = await admin
        .from("users")
        .insert({
          type: "agent",
          bot_id: botId,
          school_id: schoolId,
          name: botId,
          owner_id: authorizingUser.id,
        })
        .select("id")
        .single();

      if (insertError || !newAgent) {
        console.error("[AgentConnect] Failed to create agent user:", insertError?.message);
        return NextResponse.json(
          { error: "agent_creation_failed", message: "Could not create agent user" },
          { status: 500 },
        );
      }

      agentId = newAgent.id;
    }

    // Generate an API key for the agent
    const { rawKey } = await createApiKey({
      school_id: schoolId,
      agent_id: agentId,
      name: `Device flow key for ${botId}`,
      scopes: ["read", "write", "task"],
    });

    // Mark the device code as completed
    await admin
      .from("oauth_device_codes")
      .update({ access_token: rawKey })
      .eq("device_code", deviceCode);

    return NextResponse.json({
      agent_id: agentId,
      api_key: rawKey,
      workspace_id: schoolId,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[AgentConnect] Error:", message, error);
    return NextResponse.json(
      { error: "server_error", message: message || "Failed to complete agent connection" },
      { status: 500 },
    );
  }
}
