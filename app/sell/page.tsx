"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import type { KnowledgePack } from "@/lib/supabase/types";
import { calculateFees } from "@/lib/marketplace/utils";

export default function SellDashboardPage() {
  const router = useRouter();
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/marketplace/my-packs");
        if (!res.ok) throw new Error("Unauthorized");
        const data = await res.json();
        setPacks(data.packs ?? []);
      } catch {
        console.error("Failed to fetch packs");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function formatPrice(cents: number) {
    if (cents === 0) return "Free";
    return `$${(cents / 100).toFixed(2)}`;
  }

  // Aggregate stats
  const totalSales = packs.reduce((sum, p) => sum + p.sales_count, 0);
  const totalRevenue = packs.reduce((sum, p) => sum + p.sales_count * p.price_cents, 0);
  const totalPayout = calculateFees(totalRevenue).creatorPayout;

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="mt-1 text-neutral-500">
            Manage your knowledge packs and track sales
          </p>
        </div>
        <Button onClick={() => router.push("/sell/new")}>+ Create New Pack</Button>
      </div>

      {/* Stats */}
      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">Total Sales</p>
          <p className="mt-1 text-2xl font-bold">{totalSales}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">Total Revenue</p>
          <p className="mt-1 text-2xl font-bold">{formatPrice(totalRevenue)}</p>
        </div>
        <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950">
          <p className="text-sm text-neutral-500">Your Earnings (after fees)</p>
          <p className="mt-1 text-2xl font-bold text-green-600">{formatPrice(totalPayout)}</p>
        </div>
      </div>

      {/* Packs list */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
            />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <div className="mb-4 text-5xl">🎨</div>
          <h3 className="text-lg font-medium">No packs yet</h3>
          <p className="text-sm text-neutral-500">
            Create your first knowledge pack to start selling
          </p>
          <Button className="mt-4" onClick={() => router.push("/sell/new")}>
            Create Your First Pack
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Your Packs ({packs.length})</h2>
          {packs.map((pack) => {
            const revenue = pack.sales_count * pack.price_cents;
            const earnings = calculateFees(revenue).creatorPayout;

            return (
              <div
                key={pack.id}
                className="flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-950"
              >
                {/* Icon */}
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 text-xl dark:from-violet-950 dark:to-blue-950">
                  📦
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{pack.name}</h3>
                    <StatusBadge status={pack.status} />
                  </div>
                  <p className="text-sm text-neutral-500">
                    {formatPrice(pack.price_cents)} · {pack.sales_count} sales
                    {pack.rating_count > 0 && ` · ⭐ ${Number(pack.rating_average).toFixed(1)}`}
                  </p>
                </div>

                {/* Revenue */}
                <div className="text-right">
                  <p className="text-sm text-neutral-500">Revenue</p>
                  <p className="font-semibold">{formatPrice(revenue)}</p>
                  <p className="text-xs text-green-600">
                    Earnings: {formatPrice(earnings)}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/templates/${pack.id}`)}
                  >
                    View
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    draft: "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400",
    pending_review: "bg-yellow-100 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400",
    active: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400",
    rejected: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
    archived: "bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-500",
  };

  const labels: Record<string, string> = {
    draft: "Draft",
    pending_review: "In Review",
    active: "Active",
    rejected: "Rejected",
    archived: "Archived",
  };

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${styles[status] ?? ""}`}>
      {labels[status] ?? status}
    </span>
  );
}
