/**
 * Agent Context API
 * 
 * Provides workspace context to agents so they can:
 * 1. Know who assigned the current task (to @mention back)
 * 2. See available users to mention
 * 3. See available agents for chained tasks
 * 
 * User Flow:
 * 1. User says "@claw analyze this"
 * 2. Agent starts working, needs context
 * 3. Agent calls this API to get workspace members
 * 4. Agent writes response: "@chris analysis complete..."
 * 5. Mention detector parses @chris and notifies user
 */

import { createServerClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const workspaceId = searchParams.get("workspaceId");
  const documentId = searchParams.get("documentId");

  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspaceId is required" },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();

    // Get current user (the one making the request)
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch workspace members
    const { data: members, error: membersError } = await supabase
      .from("workspace_members")
      .select(`
        user_id,
        role,
        users:public_users!inner(
          id,
          email,
          raw_user_meta_data
        )
      `)
      .eq("workspace_id", workspaceId);

    if (membersError) {
      console.error("[AgentContext] Failed to fetch members:", membersError);
      return NextResponse.json(
        { error: "Failed to fetch workspace members" },
        { status: 500 }
      );
    }

    // Fetch available agents in workspace
    const { data: agents, error: agentsError } = await supabase
      .from("agent_personas")
      .select("id, name, agent_id, model, description, avatar")
      .eq("workspace_id", workspaceId)
      .eq("is_active", true);

    if (agentsError) {
      console.error("[AgentContext] Failed to fetch agents:", agentsError);
      return NextResponse.json(
        { error: "Failed to fetch agents" },
        { status: 500 }
      );
    }

    // Get document context if documentId provided
    let documentContext = null;
    if (documentId) {
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .select("id, title, created_by, workspace_id")
        .eq("id", documentId)
        .single();

      if (!docError && doc) {
        documentContext = doc;
      }
    }

    // Get recent tasks for this user (to find who assigned last task)
    const { data: recentTasks, error: tasksError } = await supabase
      .from("agent_tasks")
      .select("id, created_by, agent_id, title, status")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(10);

    // Format workspace members for mention lookup
    const workspaceMembers = members?.map((m: any) => ({
      userId: m.user_id,
      displayName:
        m.users?.raw_user_meta_data?.full_name ||
        m.users?.raw_user_meta_data?.name ||
        m.users?.email?.split("@")[0] ||
        "Unknown",
      email: m.users?.email,
      role: m.role,
      avatar: m.users?.raw_user_meta_data?.avatar_url,
    })) || [];

    // Format available agents
    const availableAgents = agents?.map((a: any) => ({
      id: a.agent_id || a.id,
      name: a.name,
      model: a.model,
      description: a.description,
      avatar: a.avatar,
    })) || [];

    // Find recent task context
    const lastTask = recentTasks?.[0] || null;

    return NextResponse.json({
      taskContext: {
        currentUserId: user.id,
        currentUserEmail: user.email,
        lastTaskAssignedBy: lastTask?.created_by || null,
        documentId,
        workspaceId,
      },
      workspaceMembers,
      availableAgents,
      documentContext,
      recentTasks: recentTasks || [],
      // Helper text for agent prompts
      mentionInstructions: {
        users: workspaceMembers.map((m) => `@${m.displayName.toLowerCase().replace(/\s+/g, "")}`),
        agents: availableAgents.map((a) => `@${a.id}`),
        example: "To mention someone, include @username in your response. Example: '@chris analysis complete. please review.'",
      },
    });
  } catch (error) {
    console.error("[AgentContext] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
