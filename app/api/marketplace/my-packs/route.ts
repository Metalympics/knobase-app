import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { listPacksByCreator } from "@/lib/marketplace/crud";
import { getCreatorRevenue } from "@/lib/marketplace/payments";

/**
 * GET /api/marketplace/my-packs — List current user's created packs + revenue stats
 * Requires auth.
 */
export async function GET() {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Resolve internal user ID
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }

    const userId = (profile as unknown as { id: string }).id;

    const [packs, revenue] = await Promise.all([
      listPacksByCreator(userId),
      getCreatorRevenue(userId),
    ]);

    return NextResponse.json({ packs, revenue });
  } catch (error) {
    console.error("[Marketplace] My packs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch your packs" },
      { status: 500 }
    );
  }
}
