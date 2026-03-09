"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Download, Star, Check, Crown } from "lucide-react";
import { createAgent } from "@/lib/agents/store";
import { incrementDownloads, type MarketplaceAgent } from "@/lib/marketplace/store";
import { canCreateAgent } from "@/lib/subscription/store";
import { getActiveWorkspaceId } from "@/lib/schools/store";

interface AgentCardProps {
  agent: MarketplaceAgent;
  onInstall?: () => void;
}

export function AgentCard({ agent, onInstall }: AgentCardProps) {
  const [installed, setInstalled] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const router = useRouter();

  const handleInstall = useCallback(() => {
    const wsId = getActiveWorkspaceId();
    if (wsId && !canCreateAgent(wsId)) {
      setShowUpgrade(true);
      return;
    }

    createAgent({
      name: agent.name,
      avatar: agent.avatar,
      color: agent.color,
      personality: agent.personality,
      capabilities: agent.capabilities as ("read" | "write" | "suggest" | "chat")[],
    });
    incrementDownloads(agent.id);
    setInstalled(true);
    onInstall?.();
  }, [agent, onInstall]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative rounded-xl border border-neutral-200 bg-white p-4 transition-all hover:border-purple-200 hover:shadow-md"
    >
      {agent.featured && (
        <div className="absolute -top-2 right-3 rounded-full bg-purple-500 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white">
          Featured
        </div>
      )}

      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-lg shadow-sm"
          style={{ backgroundColor: agent.color + "18", borderColor: agent.color + "30" }}
        >
          {agent.avatar}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neutral-900">
              {agent.name}
            </h3>
            <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] font-medium capitalize text-neutral-500">
              {agent.category}
            </span>
          </div>

          <p className="mt-1 text-xs leading-relaxed text-neutral-500 line-clamp-2">
            {agent.description}
          </p>

          <div className="mt-2.5 flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`h-3 w-3 ${
                    star <= Math.round(agent.rating)
                      ? "fill-amber-400 text-amber-400"
                      : "text-neutral-200"
                  }`}
                />
              ))}
              <span className="ml-0.5 text-[11px] text-neutral-400">
                {agent.rating}
              </span>
            </div>
            <span className="text-[11px] text-neutral-400">
              {agent.downloads.toLocaleString()} installs
            </span>
            <span className="text-[11px] text-neutral-300">
              by {agent.author}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex flex-1 flex-wrap gap-1">
          {agent.capabilities.map((cap) => (
            <span
              key={cap}
              className="rounded-full bg-neutral-50 px-2 py-0.5 text-[10px] font-medium text-neutral-500"
            >
              {cap}
            </span>
          ))}
        </div>

        <button
          onClick={handleInstall}
          disabled={installed}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
            installed
              ? "border border-emerald-200 bg-emerald-50 text-emerald-600"
              : "border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100"
          }`}
        >
          {installed ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Installed
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5" />
              Install
            </>
          )}
        </button>
      </div>

      {showUpgrade && (
        <div className="mt-3 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <Crown className="h-4 w-4 shrink-0 text-amber-600" />
          <p className="flex-1 text-xs text-amber-700">
            Agent limit reached. Upgrade your plan to install more agents.
          </p>
          <button
            onClick={() => router.push("/pricing")}
            className="shrink-0 rounded-md bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700"
          >
            Upgrade
          </button>
        </div>
      )}
    </motion.div>
  );
}
