"use client";

import { useState, useMemo, useCallback } from "react";
import { Search, SlidersHorizontal } from "lucide-react";
import { AgentCard } from "./agent-card";
import {
  getMarketplaceAgents,
  CATEGORIES,
  type MarketplaceAgent,
} from "@/lib/marketplace/store";

interface AgentListProps {
  onInstall?: () => void;
}

export function AgentList({ onInstall }: AgentListProps) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<
    MarketplaceAgent["category"] | "all"
  >("all");

  const allAgents = useMemo(() => getMarketplaceAgents(), []);

  const filtered = useMemo(() => {
    let result = allAgents;

    if (activeCategory !== "all") {
      result = result.filter((a) => a.category === activeCategory);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q) ||
          a.category.includes(q)
      );
    }

    return result;
  }, [allAgents, activeCategory, search]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
          />
        </div>
        <div className="flex items-center gap-1 rounded-lg border border-neutral-200 bg-white p-1">
          <button
            onClick={() => setActiveCategory("all")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              activeCategory === "all"
                ? "bg-purple-100 text-purple-700"
                : "text-neutral-500 hover:bg-neutral-50"
            }`}
          >
            All
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setActiveCategory(cat.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                activeCategory === cat.value
                  ? "bg-purple-100 text-purple-700"
                  : "text-neutral-500 hover:bg-neutral-50"
              }`}
              title={cat.label}
            >
              {cat.icon}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-neutral-200 py-12">
          <SlidersHorizontal className="h-6 w-6 text-neutral-300" />
          <p className="text-sm text-neutral-400">No agents found</p>
          <p className="text-xs text-neutral-300">
            Try a different search or category
          </p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
          {filtered.map((agent) => (
            <AgentCard key={agent.id} agent={agent} onInstall={onInstall} />
          ))}
        </div>
      )}
    </div>
  );
}
