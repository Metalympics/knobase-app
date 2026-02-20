import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (_stripe) return _stripe;

  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Missing STRIPE_SECRET_KEY environment variable");
  }

  _stripe = new Stripe(key, { apiVersion: "2026-01-28.clover" });
  return _stripe;
}

export const PRICE_IDS: Record<string, string> = {
  pro: process.env.STRIPE_PRO_PRICE_ID ?? "",
  enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID ?? "",
};
