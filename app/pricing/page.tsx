"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Crown, Sparkles, Zap } from "lucide-react";
import { PLANS } from "@/lib/subscription/plans";
import { getSubscription, updateSubscriptionTier } from "@/lib/subscription/store";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/workspaces/store";
import type { PlanTier } from "@/lib/subscription/types";

const VISIBLE_TIERS: PlanTier[] = ["free", "pro"];

const TIER_ICONS: Record<string, React.ReactNode> = {
  free: <Zap className="h-5 w-5" />,
  pro: <Crown className="h-5 w-5" />,
};

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; badge: string; button: string; buttonHover: string }> = {
  free: {
    bg: "bg-white",
    border: "border-neutral-200",
    text: "text-neutral-600",
    badge: "bg-neutral-100 text-neutral-600",
    button: "bg-neutral-900 text-white",
    buttonHover: "hover:bg-neutral-800",
  },
  pro: {
    bg: "bg-gradient-to-b from-purple-50/50 to-white",
    border: "border-purple-300 ring-1 ring-purple-100",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    button: "bg-purple-600 text-white",
    buttonHover: "hover:bg-purple-700",
  },
};

export default function PricingPage() {
  const router = useRouter();
  const [currentTier, setCurrentTier] = useState<PlanTier>("free");
  const [loading, setLoading] = useState<PlanTier | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const wsId = getActiveWorkspaceId();
    if (wsId) {
      setWorkspaceId(wsId);
      setCurrentTier(getSubscription(wsId).tier);
    } else {
      const ws = getOrCreateDefaultWorkspace();
      setWorkspaceId(ws.id);
      setCurrentTier(getSubscription(ws.id).tier);
    }
  }, []);

  async function handleSelectPlan(tier: PlanTier) {
    if (tier === currentTier || !workspaceId) return;
    setLoading(tier);
    setSuccessMessage(null);

    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, workspaceId }),
      });

      const data = await res.json();

      if (data.success) {
        updateSubscriptionTier(workspaceId, tier);
        setCurrentTier(tier);
        setSuccessMessage(data.message);
      }
    } catch {
      updateSubscriptionTier(workspaceId, tier);
      setCurrentTier(tier);
      setSuccessMessage(
        tier === "pro" ? "Upgraded to Pro!" : "Downgraded to Free"
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-4xl items-center gap-4 px-6 py-4">
          <button
            onClick={() => router.push("/knowledge")}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-neutral-900">
              Choose your plan
            </h1>
            <p className="text-sm text-neutral-500">
              Scale your knowledge base as you grow
            </p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-12">
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            <Check className="h-4 w-4" />
            {successMessage}
          </motion.div>
        )}

        <div className="grid gap-8 md:grid-cols-2">
          {VISIBLE_TIERS.map((tier, i) => {
            const plan = PLANS[tier];
            const colors = TIER_COLORS[tier];
            const isCurrent = tier === currentTier;
            const isPopular = tier === "pro";

            return (
              <motion.div
                key={tier}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                className={`relative flex flex-col rounded-2xl border ${colors.border} ${colors.bg} p-8`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="flex items-center gap-1 rounded-full bg-purple-600 px-3 py-1 text-[11px] font-semibold text-white shadow-md">
                      <Sparkles className="h-3 w-3" />
                      Recommended
                    </span>
                  </div>
                )}

                <div className="flex items-center gap-3">
                  <div className={`rounded-lg p-2 ${colors.badge}`}>
                    {TIER_ICONS[tier]}
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">
                      {plan.name}
                    </h2>
                    <p className="text-sm text-neutral-500">
                      {plan.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex items-baseline gap-1">
                  {plan.priceMonthly === 0 ? (
                    <span className="text-4xl font-bold text-neutral-900">
                      Free
                    </span>
                  ) : (
                    <>
                      <span className="text-4xl font-bold text-neutral-900">
                        ${plan.priceMonthly}
                      </span>
                      <span className="text-sm text-neutral-500">/month</span>
                    </>
                  )}
                </div>

                <div className="mt-8 flex-1">
                  <ul className="space-y-3">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2.5 text-sm text-neutral-600"
                      >
                        <Check className={`mt-0.5 h-4 w-4 shrink-0 ${colors.text}`} />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handleSelectPlan(tier)}
                  disabled={isCurrent || loading !== null}
                  className={`mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all ${
                    isCurrent
                      ? "cursor-default border-2 border-neutral-300 bg-neutral-100 text-neutral-500"
                      : `${colors.button} ${colors.buttonHover} shadow-sm`
                  } disabled:opacity-70`}
                >
                  {loading === tier ? (
                    <span className="flex items-center gap-2">
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Processing...
                    </span>
                  ) : isCurrent ? (
                    "Current Plan"
                  ) : tier === "free" ? (
                    "Downgrade to Free"
                  ) : (
                    "Upgrade to Pro"
                  )}
                </button>

                {isCurrent && tier === "pro" && (
                  <p className="mt-3 text-center text-xs text-purple-500">
                    You&apos;re on Pro — enjoy unlimited documents!
                  </p>
                )}
              </motion.div>
            );
          })}
        </div>

        <div className="mt-12 text-center">
          <p className="text-sm text-neutral-400">
            All plans include end-to-end encryption, real-time collaboration, and version history.
          </p>
          <p className="mt-2 text-xs text-neutral-400">
            No credit card required — instant upgrade with mock billing.
          </p>
        </div>
      </main>
    </div>
  );
}
