import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { createApiKey } from "@/lib/supabase/api-keys";

interface DeviceCodeRecord {
  id: string;
  device_code: string;
  user_code: string;
  client_id: string;
  user_id: string | null;
  school_id: string | null;
  scope: string[];
  expires_at: string;
  interval: number;
  last_polled_at: string | null;
  access_token: string | null;
  agent_name: string | null;
  created_at: string;
}

/**
 * POST /api/v1/agents/connect
 *
 * Completes agent registration after the Device Code Flow.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { device_code: deviceCode } = body as { device_code?: string };

    console.log("[AgentConnect] Received device_code:", deviceCode);

    if (!deviceCode) {
      return NextResponse.json(
        { error: "device_code is required" },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Look up the device code record
    console.log("[AgentConnect] Looking up device code in DB...");
    const { data, error: dcError } = await (admin
      .from("oauth_device_codes") as any)
      .select("*")
      .eq("device_code", deviceCode)
      .single();

    console.log("[AgentConnect] DB query result:", { 
      hasData: !!data, 
      error: dcError?.message,
      dataKeys: data ? Object.keys(data) : null
    });

    const record = data as DeviceCodeRecord | null;

    if (dcError || !record) {
      console.error("[AgentConnect] Device code not found:", dcError?.message);
      return NextResponse.json(
        { error: "invalid_device_code", message: "Unknown or invalid device code" },
        { status: 400 },
      );
    }

    console.log("[AgentConnect] Found record:", {
      user_id: record.user_id,
      expires_at: record.expires_at,
      client_id: record.client_id
    });

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

    if (userError || !authorizingUser) {
      console.error("[AgentConnect] User not found:", userError?.message);
      return NextResponse.json(
        { error: "user_not_found", message: "Authorizing user not found" },
        { status: 404 },
      );
    }

    const schoolId = record.school_id ?? authorizingUser.school_id;
    if (!schoolId) {
      return NextResponse.json(
        { error: "user_not_found", message: "Authorizing user or workspace not found" },
        { status: 404 },
      );
    }
    const botId = record.client_id;
    const agentName = record.agent_name?.trim() || "OpenClaw Agent";

    console.log("[AgentConnect] Creating/connecting agent for bot:", botId, "school:", schoolId, "name:", agentName);

    // Check if an agent user already exists for this bot in this workspace
    const { data: existingAgent } = await (admin
      .from("users") as any)
      .select("id")
      .eq("bot_id", botId)
      .eq("school_id", schoolId)
      .eq("type", "agent")
      .single();

    let agentId: string;

    if (existingAgent) {
      console.log("[AgentConnect] Found existing agent:", existingAgent.id);
      agentId = existingAgent.id;
    } else {
      console.log("[AgentConnect] Creating new agent user...");
      const agentAuthId = randomUUID();
      const agentEmail = `agent+${botId}@bot.knobase`;

      // Create the agent user record
      const { data: newAgent, error: insertError } = await admin
        .from("users")
        .insert({
          auth_id: agentAuthId,
          email: agentEmail,
          type: "agent",
          bot_id: botId,
          school_id: schoolId,
          name: agentName,
          owner_id: authorizingUser.id,
        } as any)
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
      console.log("[AgentConnect] Created new agent:", agentId);
    }

    // Generate an API key for the agent
    console.log("[AgentConnect] Generating API key...");
    const { rawKey } = await createApiKey({
      school_id: schoolId,
      agent_id: agentId,
      name: `Device flow key for ${botId}`,
      scopes: ["read", "write", "task"],
    });

    // Mark the device code as completed and delete it
    await (admin
      .from("oauth_device_codes") as any)
      .update({ access_token: rawKey })
      .eq("device_code", deviceCode);
    
    // Clean up the device code record
    await (admin
      .from("oauth_device_codes") as any)
      .delete()
      .eq("device_code", deviceCode);

    console.log("[AgentConnect] Success! Returning agent_id:", agentId);

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
