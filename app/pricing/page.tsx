"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Minus } from "lucide-react";
import { PLANS } from "@/lib/subscription/plans";
import {
  getSubscription,
  updateSubscriptionTier,
} from "@/lib/subscription/store";
import {
  getActiveWorkspaceId,
  getOrCreateDefaultWorkspace,
} from "@/lib/schools/store";
import type { PlanTier } from "@/lib/subscription/types";

const VISIBLE_TIERS: PlanTier[] = ["free", "pro"];

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
        tier === "pro" ? "Upgraded to Pro." : "Downgraded to Free."
      );
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-[#e5e5e5]">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-6 py-3">
          <button
            onClick={() => router.push("/s/default")}
            className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <span className="text-sm font-medium text-neutral-900">
            Plans & Billing
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-8">
          <h1 className="text-lg font-semibold text-neutral-900">
            Choose your plan
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Scale your knowledge base as you grow.
          </p>
        </div>

        {successMessage && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50/50 px-3 py-2.5 text-sm text-emerald-700">
            <Check className="h-3.5 w-3.5 shrink-0" />
            {successMessage}
          </div>
        )}

        <div className="space-y-4">
          {VISIBLE_TIERS.map((tier) => {
            const plan = PLANS[tier];
            const isCurrent = tier === currentTier;

            return (
              <div
                key={tier}
                className={`rounded-lg border bg-white ${
                  isCurrent
                    ? "border-neutral-900"
                    : "border-[#e5e5e5]"
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-semibold text-neutral-900">
                          {plan.name}
                        </h2>
                        {isCurrent && (
                          <span className="rounded-full bg-neutral-900 px-2 py-0.5 text-[10px] font-medium text-white">
                            Current
                          </span>
                        )}
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500">
                        {plan.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {plan.priceMonthly === 0 ? (
                      <span className="text-sm font-semibold text-neutral-900">
                        Free
                      </span>
                    ) : (
                      <div className="flex items-baseline gap-0.5">
                        <span className="text-sm font-semibold text-neutral-900">
                          ${plan.priceMonthly}
                        </span>
                        <span className="text-xs text-neutral-400">
                          /mo
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-5 py-4">
                  <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex items-start gap-2 text-[13px] text-neutral-600"
                      >
                        <Check className="mt-0.5 h-3 w-3 shrink-0 text-neutral-400" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="border-t border-[#e5e5e5] px-5 py-3">
                  {isCurrent ? (
                    <span className="text-xs text-neutral-400">
                      This is your current plan.
                    </span>
                  ) : (
                    <button
                      onClick={() => handleSelectPlan(tier)}
                      disabled={loading !== null}
                      className="flex h-8 items-center gap-1.5 rounded-md bg-neutral-900 px-4 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-50"
                    >
                      {loading === tier ? (
                        <>
                          <span className="h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
                          Processing...
                        </>
                      ) : tier === "free" ? (
                        "Downgrade to Free"
                      ) : (
                        "Upgrade to Pro"
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Comparison */}
        <div className="mt-10">
          <h2 className="text-sm font-semibold text-neutral-900">
            Plan comparison
          </h2>
          <div className="mt-3 overflow-hidden rounded-lg border border-[#e5e5e5]">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#e5e5e5] bg-[#fafafa]">
                  <th className="px-4 py-2.5 text-xs font-medium text-neutral-500">
                    Feature
                  </th>
                  {VISIBLE_TIERS.map((tier) => (
                    <th
                      key={tier}
                      className="px-4 py-2.5 text-xs font-medium text-neutral-500"
                    >
                      {PLANS[tier].name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e5e5e5]">
                {[
                  { label: "Documents", free: "50", pro: "Unlimited" },
                  { label: "Agent slots", free: "1", pro: "5" },
                  { label: "Workspace members", free: "1", pro: "10" },
                  { label: "Real-time collaboration", free: true, pro: true },
                  { label: "Version history", free: true, pro: true },
                  { label: "MCP server", free: true, pro: true },
                  { label: "API access", free: false, pro: true },
                  { label: "Agent marketplace", free: false, pro: true },
                  { label: "Custom agents", free: false, pro: true },
                  { label: "Priority sync", free: false, pro: true },
                ].map((row) => (
                  <tr key={row.label}>
                    <td className="px-4 py-2 text-[13px] text-neutral-700">
                      {row.label}
                    </td>
                    {(["free", "pro"] as const).map((tier) => {
                      const val = row[tier];
                      return (
                        <td
                          key={tier}
                          className="px-4 py-2 text-[13px] text-neutral-600"
                        >
                          {val === true ? (
                            <Check className="h-3.5 w-3.5 text-neutral-900" />
                          ) : val === false ? (
                            <Minus className="h-3.5 w-3.5 text-neutral-300" />
                          ) : (
                            val
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-8 text-xs text-neutral-400">
          All plans include end-to-end encryption and version history.
          No credit card required for the free plan.
        </p>
      </main>
    </div>
  );
}
