"use client";

import Image from "next/image";
import { Trash2, PencilLine } from "lucide-react";

interface InlineAgentPromptCardProps {
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  promptValue?: string;
}

export function InlineAgentPromptCard({
  agentName,
  agentAvatar,
  agentColor,
  promptValue = "",
}: InlineAgentPromptCardProps) {
  return (
    <div
      className="rounded-lg border"
      style={{ borderColor: `${agentColor}30`, backgroundColor: `${agentColor}08` }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: `${agentColor}20` }}
      >
        <div
          className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full text-[10px]"
          style={{ backgroundColor: agentColor, color: "#fff" }}
        >
          {agentAvatar.startsWith("/") ? (
            <Image src={agentAvatar} alt={agentName} width={20} height={20} className="h-full w-full object-cover rounded-full" />
          ) : (
            agentAvatar || "🤖"
          )}
        </div>
        <span className="text-xs font-medium" style={{ color: agentColor }}>
          @{agentName}
        </span>
        <span className="text-[10px]" style={{ color: `${agentColor}80` }}>
          — type your instruction below
        </span>
      </div>

      {/* Input area */}
      <div className="flex items-end gap-2 px-3 py-2">
        <div className="flex-1 text-sm text-neutral-800 leading-relaxed min-h-[1.5rem]">
          {promptValue || (
            <span className="text-neutral-400">What would you like this agent to do?</span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          <button className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            className="rounded-md p-1.5 text-white transition-colors"
            style={{ backgroundColor: agentColor }}
          >
            <PencilLine className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="px-3 pb-1.5">
        <span className="text-[10px] text-neutral-400">
          <kbd className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9px] border border-neutral-200/60">Enter</kbd> submit
          {" "}<kbd className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9px] border border-neutral-200/60">Shift+Enter</kbd> new line
          {" "}<kbd className="rounded bg-white/60 px-1 py-0.5 font-mono text-[9px] border border-neutral-200/60">Esc</kbd> cancel
        </span>
      </div>
    </div>
  );
}
