import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { createPackCheckoutSession } from "@/lib/marketplace/payments";

/**
 * POST /api/marketplace/packs/[id]/buy — Start purchase checkout
 * Body: { returnUrl: string }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Look up internal user ID
    const { data: profile } = await supabase
      .from("users")
      .select("id")
      .eq("auth_id", user.id)
      .single();

    if (!profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const userId = (profile as unknown as { id: string }).id;
    const { id: packId } = await params;
    const { returnUrl } = await request.json();

    if (!returnUrl) {
      return NextResponse.json({ error: "returnUrl is required" }, { status: 400 });
    }

    const { url, sessionId } = await createPackCheckoutSession({
      packId,
      buyerId: userId,
      returnUrl,
    });

    return NextResponse.json({ url, sessionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start checkout";
    console.error("[Marketplace] Buy error:", error);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
