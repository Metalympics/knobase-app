"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { KnowledgePack } from "@/lib/supabase/types";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "research", label: "Research" },
  { id: "coding", label: "Coding" },
  { id: "writing", label: "Writing" },
  { id: "business", label: "Business" },
  { id: "education", label: "Education" },
  { id: "creative", label: "Creative" },
  { id: "productivity", label: "Productivity" },
];

export default function TemplatesPage() {
  const router = useRouter();
  const [packs, setPacks] = useState<KnowledgePack[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const fetchPacks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== "all") params.set("category", category);
      if (search) params.set("search", search);
      params.set("limit", "20");

      const res = await fetch(`/api/marketplace/packs?${params}`);
      const data = await res.json();
      setPacks(data.packs ?? []);
      setCount(data.count ?? 0);
    } catch {
      console.error("Failed to fetch packs");
    } finally {
      setLoading(false);
    }
  }, [category, search]);

  useEffect(() => {
    fetchPacks();
  }, [fetchPacks]);

  function formatPrice(cents: number, currency: string) {
    if (cents === 0) return "Free";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
    }).format(cents / 100);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold">Knowledge Marketplace</h1>
          <p className="mt-1 text-neutral-500">
            Browse agent teams, document packs, and workflow templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/import")}>
            Import File
          </Button>
          <Button onClick={() => router.push("/sell")}>Sell Your Pack</Button>
        </div>
      </div>

      {/* Search + Categories */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search packs..."
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                category === cat.id
                  ? "bg-neutral-900 text-white dark:bg-white dark:text-neutral-900"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:hover:bg-neutral-700"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-sm text-neutral-500">
        {loading ? "Loading..." : `${count} pack${count !== 1 ? "s" : ""} found`}
      </p>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-64 animate-pulse rounded-xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900"
            />
          ))}
        </div>
      ) : packs.length === 0 ? (
        <div className="flex flex-col items-center py-20 text-center">
          <div className="mb-4 text-5xl">📭</div>
          <h3 className="text-lg font-medium">No packs found</h3>
          <p className="text-sm text-neutral-500">
            Try a different search or be the first to list one!
          </p>
          <Button className="mt-4" onClick={() => router.push("/sell/new")}>
            Create a Pack
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {packs.map((pack) => (
            <button
              key={pack.id}
              onClick={() => router.push(`/templates/${pack.id}`)}
              className="group flex flex-col rounded-xl border border-neutral-200 bg-white p-5 text-left transition hover:shadow-md dark:border-neutral-800 dark:bg-neutral-950 dark:hover:border-neutral-700"
            >
              {/* Thumbnail */}
              {pack.thumbnail_url ? (
                <div className="mb-4 aspect-video overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
                  <img
                    src={pack.thumbnail_url}
                    alt={pack.name}
                    className="h-full w-full object-cover transition group-hover:scale-105"
                  />
                </div>
              ) : (
                <div className="mb-4 flex aspect-video items-center justify-center rounded-lg bg-gradient-to-br from-violet-100 to-blue-100 text-4xl dark:from-violet-950 dark:to-blue-950">
                  📦
                </div>
              )}

              {/* Content */}
              <h3 className="mb-1 font-semibold group-hover:text-violet-600 dark:group-hover:text-violet-400">
                {pack.name}
              </h3>
              <p className="mb-3 line-clamp-2 text-sm text-neutral-500">
                {pack.short_description ?? pack.description}
              </p>

              {/* Stats */}
              <div className="mt-auto flex items-center justify-between text-sm">
                <div className="flex items-center gap-3 text-neutral-400">
                  {pack.rating_count > 0 && (
                    <span>⭐ {Number(pack.rating_average).toFixed(1)}</span>
                  )}
                  {pack.sales_count > 0 && (
                    <span>{pack.sales_count} sales</span>
                  )}
                </div>
                <span className="font-semibold text-neutral-900 dark:text-white">
                  {formatPrice(pack.price_cents, pack.currency)}
                </span>
              </div>

              {/* Tags */}
              {pack.categories.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {pack.categories.slice(0, 3).map((cat) => (
                    <span
                      key={cat}
                      className="rounded bg-neutral-100 px-2 py-0.5 text-xs text-neutral-500 dark:bg-neutral-800"
                    >
                      {cat}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
