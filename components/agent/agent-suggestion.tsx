"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Check, X, Brain } from "lucide-react";
import type { AgentSuggestion } from "@/lib/agents/types";
import { updateSuggestionStatus } from "@/lib/agents/store";

interface AgentSuggestionPanelProps {
  suggestion: AgentSuggestion;
  agentName: string;
  agentColor: string;
  onAccept: () => void;
  onReject: () => void;
}

export function AgentSuggestionPanel({
  suggestion,
  agentName,
  agentColor,
  onAccept,
  onReject,
}: AgentSuggestionPanelProps) {
  const diff = useMemo(
    () => computeSimpleDiff(suggestion.originalContent, suggestion.suggestedContent),
    [suggestion.originalContent, suggestion.suggestedContent]
  );

  const handleAccept = () => {
    updateSuggestionStatus(suggestion.id, "accepted");
    onAccept();
  };

  const handleReject = () => {
    updateSuggestionStatus(suggestion.id, "rejected");
    onReject();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed bottom-20 left-1/2 z-50 w-full max-w-xl -translate-x-1/2 rounded-xl border border-purple-200 bg-white shadow-2xl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-100 px-4 py-3">
        <div className="flex items-center gap-2">
          <div
            className="flex h-6 w-6 items-center justify-center rounded-full text-xs text-white"
            style={{ backgroundColor: agentColor }}
          >
            {agentName.charAt(0)}
          </div>
          <span className="text-sm font-semibold text-neutral-900">
            {agentName}&apos;s Suggestion
          </span>
          <span className="rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600">
            {suggestion.model}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleReject}
            className="flex items-center gap-1 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-3.5 w-3.5" />
            Reject
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 rounded-md border border-purple-200 bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
          >
            <Check className="h-3.5 w-3.5" />
            Accept
          </button>
        </div>
      </div>

      {/* Reasoning */}
      {suggestion.reasoning && (
        <div className="border-b border-purple-50 bg-purple-50/30 px-4 py-2.5">
          <div className="flex items-start gap-2">
            <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" />
            <p className="text-xs leading-relaxed text-neutral-600">
              {suggestion.reasoning}
            </p>
          </div>
        </div>
      )}

      {/* Diff view */}
      <div className="max-h-64 overflow-y-auto px-4 py-3">
        <div className="space-y-0 rounded-md border border-neutral-200 font-mono text-xs">
          {diff.map((line, i) => (
            <div
              key={i}
              className={`px-3 py-0.5 ${
                line.type === "added"
                  ? "bg-emerald-50 text-emerald-700"
                  : line.type === "removed"
                    ? "bg-red-50 text-red-700 line-through"
                    : "text-neutral-500"
              }`}
            >
              <span className="mr-2 inline-block w-4 text-right text-neutral-300">
                {line.type === "added" ? "+" : line.type === "removed" ? "-" : " "}
              </span>
              {line.text}
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

interface DiffLine {
  type: "added" | "removed" | "unchanged";
  text: string;
}

function computeSimpleDiff(original: string, suggested: string): DiffLine[] {
  const origLines = original.split("\n");
  const sugLines = suggested.split("\n");
  const result: DiffLine[] = [];

  const maxLen = Math.max(origLines.length, sugLines.length);

  for (let i = 0; i < maxLen; i++) {
    const origLine = i < origLines.length ? origLines[i] : undefined;
    const sugLine = i < sugLines.length ? sugLines[i] : undefined;

    if (origLine === sugLine) {
      result.push({ type: "unchanged", text: origLine ?? "" });
    } else {
      if (origLine !== undefined) {
        result.push({ type: "removed", text: origLine });
      }
      if (sugLine !== undefined) {
        result.push({ type: "added", text: sugLine });
      }
    }
  }

  return result;
}
