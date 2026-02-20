import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import type Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET ?? "";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get("stripe-signature") ?? "";

  if (!WEBHOOK_SECRET) {
    console.error("STRIPE_WEBHOOK_SECRET not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  let event: Stripe.Event;
  try {
    const stripe = getStripe();
    event = stripe.webhooks.constructEvent(body, sig, WEBHOOK_SECRET);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Webhook verification failed:", message);
    return NextResponse.json({ error: `Webhook Error: ${message}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const { workspaceId, tier } = session.metadata ?? {};
        if (workspaceId && tier) {
          console.log(`Subscription activated: workspace=${workspaceId}, tier=${tier}`);
          // In production, persist to database here
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const { workspaceId } = subscription.metadata ?? {};
        if (workspaceId) {
          const status = subscription.status;
          console.log(`Subscription updated: workspace=${workspaceId}, status=${status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const { workspaceId } = subscription.metadata ?? {};
        if (workspaceId) {
          console.log(`Subscription canceled: workspace=${workspaceId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.id;
        console.log(`Payment failed for invoice: ${subId}`);
        break;
      }

      default:
        break;
    }
  } catch (err: unknown) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
