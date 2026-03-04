"use client";

import Image from "next/image";
import { DEMO_AGENTS, DEMO_PEOPLE } from "@/lib/demo/simulated-agents";

export function AgentSelectorDropdownCard() {
  return (
    <div className="w-80 rounded-lg border border-[#e5e5e5] bg-white shadow-lg">
      <div className="px-3 py-2">
        {/* Trigger text */}
        <div className="mb-2 text-xs text-neutral-400 px-1 font-mono">@strategy</div>

        {/* AI Agents section */}
        <div className="mb-2">
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
            AI Agents
          </div>
          <div className="space-y-0.5 max-h-60 overflow-y-auto">
            {DEMO_AGENTS.map((agent, index) => (
              <div
                key={agent.id}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                  index === 0
                    ? "bg-neutral-100 text-neutral-900"
                    : "text-neutral-600 hover:bg-neutral-50"
                }`}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[#e5e5e5] bg-white">
                  <Image
                    src={agent.avatar}
                    alt={agent.name}
                    width={32}
                    height={32}
                    className="h-full w-full rounded-md object-cover"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900">{agent.name}</div>
                  <div className="text-xs text-neutral-400">{agent.description}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Collaborators section */}
        <div className="mb-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-1.5">
            Collaborators
          </div>
          <div className="space-y-0.5">
            {DEMO_PEOPLE.map((person) => (
              <div
                key={person.userId}
                className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md text-neutral-600 hover:bg-neutral-50 cursor-pointer"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white text-sm font-bold"
                  style={{ backgroundColor: person.color }}
                >
                  {person.displayName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-neutral-900">{person.displayName}</div>
                  <div className="text-xs text-neutral-400">{person.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer hint */}
        <div className="border-t border-neutral-100 pt-1.5 mt-1">
          <div className="flex items-center justify-center gap-3 text-[10px] text-neutral-400">
            <span><kbd className="rounded bg-neutral-100 px-1 font-mono text-[9px]">Enter</kbd> to select</span>
            <span><kbd className="rounded bg-neutral-100 px-1 font-mono text-[9px]">Esc</kbd> to dismiss</span>
          </div>
        </div>
      </div>
    </div>
  );
}
