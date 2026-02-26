import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe/config";
import { fulfillPurchase, handleRefund } from "@/lib/marketplace/payments";
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
        const meta = session.metadata ?? {};

        if (meta.type === "marketplace_purchase") {
          // Marketplace one-time purchase
          await fulfillPurchase(
            session.id,
            (session.payment_intent as string) ?? ""
          );
          console.log(`[Stripe] Marketplace purchase fulfilled: pack=${meta.pack_id}`);
        } else if (meta.workspaceId && meta.tier) {
          // Subscription checkout
          console.log(`Subscription activated: workspace=${meta.workspaceId}, tier=${meta.tier}`);
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

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        if (charge.payment_intent) {
          await handleRefund(charge.payment_intent as string);
          console.log(`[Stripe] Refund processed: pi=${charge.payment_intent}`);
        }
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
