"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Loader2,
  Trash2,
  PencilLine,
  AlertCircle,
  Brain,
  ChevronDown,
  Wrench,
  Sparkles,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { TaskStreamState, ActiveToolCall } from "@/lib/agents/task-stream-store";

interface InlineAgentProcessingCardProps {
  agentName: string;
  agentAvatar: string;
  agentColor: string;
  prompt: string;
  currentAction?: string;
  state?: "queued" | "running" | "failed";
  error?: string | null;
  /** Live streaming state from the task-stream-store */
  streamState?: TaskStreamState | null;
  onCancel?: () => void;
  onEdit?: () => void;
}

export function InlineAgentProcessingCard({
  agentName,
  agentAvatar,
  agentColor,
  prompt,
  currentAction,
  state = "running",
  error,
  streamState,
  onCancel,
  onEdit,
}: InlineAgentProcessingCardProps) {
  const [thinkingOpen, setThinkingOpen] = useState(false);

  const isQueued = state === "queued";
  const isRunning = state === "running";
  const isFailed = state === "failed";

  const hasStream = streamState && streamState.version > 0;
  const liveText = hasStream ? streamState.text : "";
  const liveThinking = hasStream ? streamState.thinking : "";
  const activeTool = hasStream ? streamState.activeTool : null;
  const toolHistory = hasStream ? streamState.toolHistory : [];
  const streamPhase = hasStream ? streamState.phase : null;

  const isThinking = streamPhase === "thinking";
  const isTooling = streamPhase === "tool" && activeTool;
  const isStreaming = isRunning && liveText.length > 0;

  return (
    <div
      className={`rounded-lg border overflow-hidden ${isFailed ? "bg-red-50/40 border-red-200/60" : ""}`}
      style={!isFailed ? { borderColor: `${agentColor}30`, backgroundColor: `${agentColor}06` } : undefined}
    >
      {/* ── Header ── */}
      <div
        className="flex items-center gap-2 px-3 py-1.5 border-b"
        style={{ borderColor: isFailed ? undefined : `${agentColor}15` }}
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
        <span className="text-xs font-medium" style={{ color: isFailed ? undefined : agentColor }}>
          @{agentName}
        </span>

        {/* Phase badge */}
        <PhaseIndicator
          state={state}
          streamPhase={streamPhase}
          agentColor={agentColor}
          isThinking={isThinking}
          isTooling={!!isTooling}
          isStreaming={isStreaming}
          toolName={activeTool?.name}
        />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          {(isQueued || isRunning) && (
            <button onClick={onCancel} className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors">
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button onClick={onEdit} className="rounded p-1 text-white transition-colors" style={{ backgroundColor: agentColor }}>
            <PencilLine className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="px-3 py-2">
        {/* Prompt line */}
        <p className={`text-xs leading-relaxed ${isQueued ? "animate-pulse text-neutral-500" : "text-neutral-400"}`}>
          {prompt}
        </p>

        {/* Thinking section (collapsible) */}
        <AnimatePresence>
          {liveThinking && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <button
                onClick={() => setThinkingOpen((v) => !v)}
                className="mt-2 flex items-center gap-1 text-[11px] font-medium transition-colors"
                style={{ color: `${agentColor}90` }}
              >
                <Brain className="h-3 w-3" />
                Thinking…
                <ChevronDown className={`h-3 w-3 transition-transform ${thinkingOpen ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {thinkingOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-1 rounded-md border px-2.5 py-2 text-[11px] leading-relaxed text-neutral-500 max-h-28 overflow-y-auto font-mono"
                      style={{ borderColor: `${agentColor}20`, backgroundColor: `${agentColor}05` }}
                    >
                      {liveThinking}
                      {isThinking && <span className="animate-pulse">▌</span>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tool call badges */}
        {(activeTool || toolHistory.length > 0) && (
          <div className="mt-2 flex flex-wrap gap-1">
            {toolHistory.map((t, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] text-neutral-400"
                style={{ borderColor: `${agentColor}20` }}
              >
                <Wrench className="h-2.5 w-2.5" />
                {formatToolName(t.name)}
                <span className="text-neutral-300">
                  {t.durationMs < 1000 ? `${t.durationMs}ms` : `${(t.durationMs / 1000).toFixed(1)}s`}
                </span>
              </span>
            ))}
            {activeTool && (
              <span
                className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium animate-pulse"
                style={{ borderColor: `${agentColor}40`, color: agentColor }}
              >
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
                {formatToolName(activeTool.name)}
              </span>
            )}
          </div>
        )}

        {/* Live text preview */}
        <AnimatePresence>
          {isStreaming && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              className="overflow-hidden"
            >
              <div className="mt-2 text-sm leading-relaxed text-neutral-700 max-h-40 overflow-y-auto">
                {liveText}
                <span className="animate-pulse text-neutral-300">▌</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Status from Supabase (when no live stream data) */}
        {isRunning && !hasStream && currentAction && (
          <p className="mt-1 text-[11px] text-neutral-400 truncate">{currentAction}</p>
        )}

        {/* Error */}
        {isFailed && error && (
          <p className="mt-1 text-xs text-red-600">{error}</p>
        )}
      </div>

      {/* ── Progress bar ── */}
      {isRunning && !isStreaming && (
        <div className="mx-3 mb-2 h-0.5 bg-neutral-200/40 rounded-full overflow-hidden">
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

/* ── Sub-components ─────────────────────────────────────────────── */

function PhaseIndicator({
  state,
  streamPhase,
  agentColor,
  isThinking,
  isTooling,
  isStreaming,
  toolName,
}: {
  state: string;
  streamPhase: string | null;
  agentColor: string;
  isThinking: boolean;
  isTooling: boolean;
  isStreaming: boolean;
  toolName?: string;
}) {
  if (state === "failed") {
    return (
      <div className="flex items-center gap-1 text-[10px] text-red-600">
        <AlertCircle className="h-3 w-3" />
        <span>Failed</span>
      </div>
    );
  }

  if (state === "queued") {
    return (
      <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}80` }}>
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: agentColor }} />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: agentColor }} />
        </span>
        <span>Queued</span>
      </div>
    );
  }

  if (isThinking) {
    return (
      <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}90` }}>
        <Brain className="h-3 w-3 animate-pulse" />
        <span>Thinking</span>
      </div>
    );
  }

  if (isTooling) {
    return (
      <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}90` }}>
        <Wrench className="h-3 w-3 animate-pulse" />
        <span>Using {formatToolName(toolName ?? "tool")}</span>
      </div>
    );
  }

  if (isStreaming) {
    return (
      <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}90` }}>
        <Sparkles className="h-3 w-3" />
        <span>Writing</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 text-[10px]" style={{ color: `${agentColor}80` }}>
      <Loader2 className="h-3 w-3 animate-spin" style={{ color: agentColor }} />
      <span>Processing</span>
    </div>
  );
}

function formatToolName(name: string): string {
  return name
    .replace(/_/g, " ")
    .replace(/^./, (c) => c.toUpperCase())
    .replace(/\b(document|documents)\b/gi, "doc")
    .trim();
}
