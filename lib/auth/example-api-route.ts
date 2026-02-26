import { createServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/utils";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createServerClient();

    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: workspaces, error } = await supabase
      .from("workspaces")
      .select(
        `
        *,
        workspace_members!inner (
          role,
          joined_at
        )
      `
      )
      .eq("workspace_members.user_id", user.id);

    if (error) {
      console.error("Error fetching workspaces:", error);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspaces });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerClient();

    const user = await getCurrentUser(supabase);

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, settings } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json(
        { error: "Invalid workspace name" },
        { status: 400 }
      );
    }

    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const inviteCode = Array.from(crypto.getRandomValues(new Uint8Array(4)))
      .map((b) => b.toString(36))
      .join("")
      .slice(0, 8)
      .toUpperCase();

    const { data: workspaceData, error: insertError } = await supabase
      .from("workspaces")
      .insert({
        name,
        slug,
        owner_id: user.id,
        invite_code: inviteCode,
        settings: settings || {
          isPublic: false,
          allowGuests: false,
          defaultAgent: null,
        },
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating workspace:", insertError);
      return NextResponse.json(
        { error: "Failed to create workspace" },
        { status: 500 }
      );
    }

    const workspace = workspaceData as unknown as { id: string };
    const { error: memberError } = await supabase
      .from("workspace_members")
      .insert({
        workspace_id: workspace.id,
        user_id: user.id,
        role: "admin",
      });

    if (memberError) {
      console.error("Error adding workspace member:", memberError);

      await supabase.from("workspaces").delete().eq("id", workspace.id);

      return NextResponse.json(
        { error: "Failed to set up workspace membership" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace: workspaceData }, { status: 201 });
  } catch (error) {
    console.error("Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
