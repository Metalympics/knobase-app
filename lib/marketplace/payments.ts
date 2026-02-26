// ── Marketplace Payments ──
// Stripe integration for one-time knowledge pack purchases.
// Uses Stripe Checkout for payment + webhooks for fulfillment.

import { getStripe } from "@/lib/stripe/config";
import { createAdminClient } from "@/lib/supabase/admin";
import type { KnowledgePack } from "@/lib/supabase/types";
import { calculateFees } from "./utils";

// Re-export for backward compat
export { calculateFees } from "./utils";

/* ------------------------------------------------------------------ */
/* Checkout                                                            */
/* ------------------------------------------------------------------ */

/**
 * Create a Stripe Checkout session for purchasing a knowledge pack.
 * Returns the checkout URL for the buyer to complete payment.
 */
export async function createPackCheckoutSession(opts: {
  packId: string;
  buyerId: string;
  returnUrl: string;
}): Promise<{ url: string; sessionId: string }> {
  const supabase = createAdminClient();

  // Look up pack details
  const { data: rawPack, error } = await supabase
    .from("knowledge_packs")
    .select("*")
    .eq("id", opts.packId)
    .eq("status", "active")
    .single();

  if (error || !rawPack) {
    throw new Error("Knowledge pack not found or not available for purchase");
  }

  const pack = rawPack as unknown as KnowledgePack;

  if (pack.price_cents <= 0) {
    throw new Error("This pack is free — no checkout needed");
  }

  // Check if already purchased
  const { data: existing } = await supabase
    .from("pack_purchases")
    .select("id")
    .eq("pack_id", opts.packId)
    .eq("buyer_id", opts.buyerId)
    .eq("status", "completed")
    .single();

  if (existing) {
    throw new Error("You have already purchased this pack");
  }

  const stripe = getStripe();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: pack.currency.toLowerCase(),
          product_data: {
            name: pack.name,
            description: pack.short_description ?? pack.description.slice(0, 200),
            ...(pack.thumbnail_url ? { images: [pack.thumbnail_url] } : {}),
          },
          unit_amount: pack.price_cents,
        },
        quantity: 1,
      },
    ],
    success_url: `${opts.returnUrl}?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${opts.returnUrl}?canceled=true`,
    metadata: {
      type: "marketplace_purchase",
      pack_id: opts.packId,
      buyer_id: opts.buyerId,
    },
  });

  // Create pending purchase record
  await supabase.from("pack_purchases").insert({
    pack_id: opts.packId,
    buyer_id: opts.buyerId,
    stripe_session_id: session.id,
    amount_cents: pack.price_cents,
    currency: pack.currency,
    status: "pending" as const,
  });

  return { url: session.url!, sessionId: session.id };
}

/* ------------------------------------------------------------------ */
/* Fulfillment (called from Stripe webhook)                           */
/* ------------------------------------------------------------------ */

/**
 * Complete a purchase after Stripe payment succeeds.
 * Called from the Stripe webhook handler on checkout.session.completed.
 */
export async function fulfillPurchase(
  stripeSessionId: string,
  paymentIntentId: string
): Promise<void> {
  const supabase = createAdminClient();

  const { data: rawPurchase, error } = await supabase
    .from("pack_purchases")
    .select("*")
    .eq("stripe_session_id", stripeSessionId)
    .single();

  if (error || !rawPurchase) {
    console.error("[Marketplace] Purchase not found for session:", stripeSessionId);
    return;
  }

  // Update purchase status
  await supabase
    .from("pack_purchases")
    .update({
      status: "completed" as const,
      stripe_payment_intent_id: paymentIntentId,
      completed_at: new Date().toISOString(),
    })
    .eq("id", (rawPurchase as unknown as { id: string }).id);

  // sales_count increment is handled by the DB trigger
}

/**
 * Handle a refund — mark purchase as refunded.
 */
export async function handleRefund(paymentIntentId: string): Promise<void> {
  const supabase = createAdminClient();

  await supabase
    .from("pack_purchases")
    .update({ status: "refunded" as const })
    .eq("stripe_payment_intent_id", paymentIntentId);
}

/* ------------------------------------------------------------------ */
/* Revenue helpers                                                     */
/* ------------------------------------------------------------------ */

/**
 * Get total revenue stats for a creator.
 */
export async function getCreatorRevenue(creatorId: string): Promise<{
  totalSales: number;
  totalRevenueCents: number;
  totalPayoutCents: number;
  packCount: number;
}> {
  const supabase = createAdminClient();

  // Get all packs by this creator
  const { data: packs } = await supabase
    .from("knowledge_packs")
    .select("id, sales_count, price_cents")
    .eq("creator_id", creatorId);

  if (!packs || packs.length === 0) {
    return { totalSales: 0, totalRevenueCents: 0, totalPayoutCents: 0, packCount: 0 };
  }

  const packRows = packs as unknown as Array<{ id: string; sales_count: number; price_cents: number }>;

  let totalSales = 0;
  let totalRevenueCents = 0;
  let totalPayoutCents = 0;

  for (const pack of packRows) {
    totalSales += pack.sales_count;
    const revenue = pack.sales_count * pack.price_cents;
    totalRevenueCents += revenue;
    totalPayoutCents += calculateFees(revenue).creatorPayout;
  }

  return {
    totalSales,
    totalRevenueCents,
    totalPayoutCents,
    packCount: packRows.length,
  };
}
