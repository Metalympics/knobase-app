import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

/**
 * GET /api/agents/invite/status?device_code=<uuid>&created_after=<iso>
 *
 * Primary path: polls the device code record for status="completed".
 * Fallback path: if the CLI deleted the device code row after connecting,
 * looks for an agent in `users` where owner_id matches the inviting user
 * and created_at >= created_after. This uniquely ties the result to the
 * specific invite even when multiple users invite agents simultaneously.
 */
export async function GET(request: NextRequest) {
  const deviceCode = request.nextUrl.searchParams.get("device_code");
  const createdAfter = request.nextUrl.searchParams.get("created_after");

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

  // ── Primary: device code lookup ──────────────────────────────────────
  const { data: record, error: dcError } = await (admin
    .from("oauth_device_codes") as any)
    .select("status, agent_id, agent_name, expires_at, user_id")
    .eq("device_code", deviceCode)
    .single();

  if (dcError || !record) {
    // The CLI may have deleted the row after connecting. If the caller
    // provided created_after, fall back to scanning the users table.
    if (createdAfter) {
      const fallback = await findAgentByOwner(admin, user.id, createdAfter);
      if (fallback) {
        return NextResponse.json({ status: "connected", agent: fallback });
      }
    }

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
            connected_at: (agent as any).created_at,
          }
        : {
            id: record.agent_id,
            name: record.agent_name ?? "OpenClaw Agent",
            connected_at: new Date().toISOString(),
          },
    });
  }

  // Still pending — also try the fallback in case the row was updated by
  // the connect endpoint but the CLI subsequently deleted it mid-poll.
  if (createdAfter) {
    const fallback = await findAgentByOwner(admin, user.id, createdAfter);
    if (fallback) {
      return NextResponse.json({ status: "connected", agent: fallback });
    }
  }

  return NextResponse.json({
    status: "pending",
    message: "Waiting for agent to connect",
  });
}

/**
 * Fallback lookup: resolves the inviting user's profile ID, then finds the
 * most recently created agent they own after `createdAfter`. Using owner_id
 * ensures uniqueness — two concurrent invites by different users cannot
 * cross-match each other's agents.
 */
async function findAgentByOwner(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  authUid: string,
  createdAfter: string,
) {
  const { data: profile } = await admin
    .from("users")
    .select("id")
    .eq("auth_id", authUid)
    .single();

  if (!profile) return null;

  const { data: agent } = await admin
    .from("users")
    .select("id, name, bot_id, availability, created_at")
    .eq("owner_id", profile.id)
    .eq("type", "agent")
    .gte("created_at", createdAfter)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!agent) return null;

  return {
    id: agent.id,
    name: (agent as any).name ?? "OpenClaw Agent",
    bot_id: (agent as any).bot_id,
    availability: (agent as any).availability,
    connected_at: (agent as any).created_at,
  };
}
