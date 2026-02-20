import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { tier, workspaceId } = body;

    if (!tier || !workspaceId) {
      return NextResponse.json(
        { error: "Missing tier or workspaceId" },
        { status: 400 }
      );
    }

    if (tier !== "free" && tier !== "pro") {
      return NextResponse.json(
        { error: "Invalid tier. Must be 'free' or 'pro'" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      tier,
      workspaceId,
      message: tier === "pro"
        ? "Upgraded to Pro! (mock — no payment required)"
        : "Downgraded to Free",
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }
}
