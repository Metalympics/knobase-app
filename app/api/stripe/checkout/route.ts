import { NextRequest, NextResponse } from "next/server";
import { getStripe, PRICE_IDS } from "@/lib/stripe/config";

export async function POST(req: NextRequest) {
  try {
    const { tier, workspaceId, returnUrl } = await req.json();

    if (!tier || !workspaceId || !returnUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const priceId = PRICE_IDS[tier];
    if (!priceId) {
      return NextResponse.json({ error: `No price configured for tier: ${tier}` }, { status: 400 });
    }

    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${returnUrl}?canceled=true`,
      metadata: {
        workspaceId,
        tier,
      },
      subscription_data: {
        metadata: {
          workspaceId,
          tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Stripe checkout error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
