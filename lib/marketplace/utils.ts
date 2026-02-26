// ── Marketplace Utilities ──
// Pure functions safe for both client and server use.

/** Platform fee: 20% of sale price */
const PLATFORM_FEE_PERCENT = 20;

/**
 * Calculate platform fee and creator payout for a given amount.
 */
export function calculateFees(amountCents: number): {
  platformFee: number;
  creatorPayout: number;
  stripeFee: number;
} {
  // Stripe fee: ~2.9% + 30¢
  const stripeFee = Math.ceil(amountCents * 0.029) + 30;
  const platformFee = Math.ceil(amountCents * (PLATFORM_FEE_PERCENT / 100));
  const creatorPayout = amountCents - platformFee - stripeFee;

  return {
    platformFee,
    creatorPayout: Math.max(0, creatorPayout),
    stripeFee,
  };
}
