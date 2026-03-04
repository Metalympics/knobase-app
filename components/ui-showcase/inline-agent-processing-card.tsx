"use client";

import Image from "next/image";
import { Loader2, Trash2, PencilLine } from "lucide-react";
import { motion } from "framer-motion";

interface InlineAgentProcessingCardProps {
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  prompt: string;
  currentAction?: string;
  state?: "queued" | "running";
}

export function InlineAgentProcessingCard({
  agentName,
  agentAvatar,
  agentColor,
  prompt,
  currentAction,
  state = "running",
}: InlineAgentProcessingCardProps) {
  const isQueued = state === "queued";
  const isRunning = state === "running";

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
          className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full"
          style={{ backgroundColor: agentColor }}
        >
          {agentAvatar.startsWith("/") ? (
            <Image src={agentAvatar} alt={agentName} width={20} height={20} className="h-full w-full object-cover rounded-full" />
          ) : (
            <span className="text-[10px] text-white">{agentAvatar || "🤖"}</span>
          )}
        </div>
        <span className="text-xs font-medium" style={{ color: agentColor }}>
          @{agentName}
        </span>

        {isQueued && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}80` }}>
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: agentColor }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: agentColor }} />
            </span>
            <span>Queued</span>
          </div>
        )}
        {isRunning && (
          <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}80` }}>
            <Loader2 className="h-3 w-3 animate-spin" style={{ color: agentColor }} />
            <span>Processing...</span>
          </div>
        )}
      </div>

      {/* Prompt + actions */}
      <div className="flex items-end gap-2 px-3 py-2">
        <div className="flex-1 min-w-0">
          <p className={`whitespace-pre-wrap text-sm leading-relaxed ${isQueued ? "animate-pulse text-neutral-600" : "text-neutral-500"}`}>
            {prompt}
          </p>
          {isRunning && currentAction && (
            <p className="mt-0.5 text-[11px] text-neutral-400 truncate">{currentAction}</p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 pb-0.5">
          <button className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button className="rounded-md p-1.5 text-white" style={{ backgroundColor: agentColor }}>
            <PencilLine className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {isRunning && (
        <div className="mx-3 mb-2 h-1 bg-neutral-200/60 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{ backgroundColor: agentColor, width: "40%" }}
            initial={{ x: "-100%" }}
            animate={{ x: "250%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
          />
        </div>
      )}
    </div>
  );
}
