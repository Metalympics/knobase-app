"use client";

import { useState } from "react";
import Image from "next/image";
import { X, Search, Plus, Check, Sparkles, Zap, BarChart2, Palette, Shield, TrendingUp } from "lucide-react";

interface AgentCard {
  id: string;
  name: string;
  tagline: string;
  description: string;
  avatar: string;
  color: string;
  category: string;
  icon: React.ReactNode;
  added?: boolean;
}

const AGENT_CATALOG: AgentCard[] = [
  {
    id: "strategy-lead",
    name: "Strategy Lead",
    tagline: "Go-to-market & growth strategy",
    description: "Analyzes market data, builds competitive positioning, and creates go-to-market plans. Ask it to outline OKRs, evaluate a new market, or plan a product launch.",
    avatar: "/strategy-lead.svg",
    color: "#7C3AED",
    category: "Strategy",
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    tagline: "Metrics, cohorts & forecasts",
    description: "Pulls apart your metrics, identifies trends in cohort data, and builds revenue forecasts. Give it a dataset and a question, and it returns structured analysis.",
    avatar: "/data-analyst.svg",
    color: "#2563EB",
    category: "Analytics",
    icon: <BarChart2 className="h-4 w-4" />,
  },
  {
    id: "designer",
    name: "Designer",
    tagline: "Visual design & UX direction",
    description: "Reviews flows for usability issues, suggests visual improvements, and generates design direction for landing pages, onboarding flows, and dashboards.",
    avatar: "/designer.svg",
    color: "#EC4899",
    category: "Design",
    icon: <Palette className="h-4 w-4" />,
  },
  {
    id: "compliance-officer",
    name: "Compliance Officer",
    tagline: "Regulatory review & risk",
    description: "Reviews contracts, flags GDPR/HIPAA risks, and checks your content against regulatory frameworks. Essential for healthcare, finance, and enterprise deals.",
    avatar: "/compliance-officer.svg",
    color: "#1E3A5F",
    category: "Legal & Risk",
    icon: <Shield className="h-4 w-4" />,
  },
  {
    id: "seo-expert",
    name: "SEO Expert",
    tagline: "Search visibility & content strategy",
    description: "Audits your content for search intent, identifies keyword opportunities, and writes meta descriptions and structured content briefs to drive organic growth.",
    avatar: "/seo-expert.svg",
    color: "#EA580C",
    category: "Marketing",
    icon: <TrendingUp className="h-4 w-4" />,
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    tagline: "Full-stack workspace agent",
    description: "OpenClaw is Knobase's native AI — it can research, summarize, draft, and coordinate with other agents. The backbone of your AI-powered workspace.",
    avatar: "/openclaw.png",
    color: "#E94560",
    category: "General",
    icon: <Zap className="h-4 w-4" />,
  },
];

const CATEGORIES = ["All", "Strategy", "Analytics", "Design", "Legal & Risk", "Marketing", "General"];

interface AgentStudioModalProps {
  onClose: () => void;
  addedAgentIds?: string[];
  onAdd?: (agentId: string) => void;
  /** When true, suppresses the fixed backdrop so the modal flows inline on the page */
  standalone?: boolean;
}

export function AgentStudioModal({ onClose, addedAgentIds = [], onAdd, standalone = false }: AgentStudioModalProps) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [added, setAdded] = useState<Set<string>>(new Set(addedAgentIds));

  const filtered = AGENT_CATALOG.filter((a) => {
    const matchesSearch =
      !search ||
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tagline.toLowerCase().includes(search.toLowerCase()) ||
      a.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || a.category === category;
    return matchesSearch && matchesCategory;
  });

  const handleAdd = (agentId: string) => {
    setAdded((prev) => new Set([...prev, agentId]));
    onAdd?.(agentId);
  };

  const innerContent = (
    <>
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-neutral-100">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Agent Studio</h2>
          <p className="text-sm text-neutral-500 mt-0.5">
            Add AI agents to your workspace. @mention them inside any document.
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Search + filter */}
      <div className="px-6 py-4 border-b border-neutral-100 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search agents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-neutral-200 bg-neutral-50 py-2 pl-9 pr-4 text-sm text-neutral-900 placeholder:text-neutral-400 outline-none focus:border-neutral-400 focus:bg-white transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                category === cat
                  ? "bg-neutral-900 text-white"
                  : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Agent cards */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
            <Search className="h-8 w-8 mb-3" />
            <p className="text-sm">No agents match &quot;{search}&quot;</p>
          </div>
        ) : (
          filtered.map((agent) => {
            const isAdded = added.has(agent.id);
            return (
              <div
                key={agent.id}
                className="flex items-start gap-4 rounded-xl border border-neutral-100 p-4 hover:border-neutral-200 hover:bg-neutral-50/50 transition-colors"
              >
                {/* Avatar */}
                <div
                  className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl"
                  style={{ backgroundColor: agent.color + "1a" }}
                >
                  <Image
                    src={agent.avatar}
                    alt={agent.name}
                    width={48}
                    height={48}
                    className="h-10 w-10 rounded-lg object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-900 text-sm">{agent.name}</span>
                    <span
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ backgroundColor: agent.color + "18", color: agent.color }}
                    >
                      {agent.icon}
                      {agent.category}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-500 mt-0.5 font-medium">{agent.tagline}</p>
                  <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed line-clamp-2">
                    {agent.description}
                  </p>
                </div>

                {/* Add button */}
                <button
                  onClick={() => !isAdded && handleAdd(agent.id)}
                  className={`shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                    isAdded
                      ? "bg-emerald-50 text-emerald-600 cursor-default"
                      : "bg-neutral-900 text-white hover:bg-neutral-700"
                  }`}
                >
                  {isAdded ? (
                    <>
                      <Check className="h-3 w-3" />
                      Added
                    </>
                  ) : (
                    <>
                      <Plus className="h-3 w-3" />
                      Add
                    </>
                  )}
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100">
        <p className="text-xs text-neutral-400">
          {added.size > 0
            ? `${added.size} agent${added.size === 1 ? "" : "s"} added to workspace`
            : "No agents added yet"}
        </p>
        <button
          onClick={onClose}
          className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700 transition-colors"
        >
          Done
        </button>
      </div>
    </>
  );

  if (standalone) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl flex flex-col">
        {innerContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl rounded-2xl border border-neutral-200 bg-white shadow-2xl flex flex-col max-h-[85vh]">
        {innerContent}
      </div>
    </div>
  );
}
