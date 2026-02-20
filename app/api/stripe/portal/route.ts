import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";

export async function POST(req: NextRequest) {
  try {
    const { customerId, returnUrl } = await req.json();

    if (!customerId || !returnUrl) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const stripe = getStripe();

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return NextResponse.json({ url: session.url });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Internal server error";
    console.error("Stripe portal error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
