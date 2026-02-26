"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Pencil, ChevronDown, ChevronUp, Bot } from "lucide-react";
import { AgentAvatar } from "./agent-avatar";
import type { Agent } from "@/lib/agents/types";

export type InlineSuggestionStatus = "pending" | "accepted" | "rejected" | "modified";

export interface InlineSuggestionData {
  id: string;
  agentId: string;
  originalText: string;
  suggestedText: string;
  explanation?: string;
  range: { from: number; to: number };
  status: InlineSuggestionStatus;
  createdAt: string;
}

interface InlineSuggestionProps {
  suggestion: InlineSuggestionData;
  agent: Agent;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onModify: (id: string, newText: string) => void;
}

export function InlineSuggestion({
  suggestion,
  agent,
  onAccept,
  onReject,
  onModify,
}: InlineSuggestionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedText, setEditedText] = useState(suggestion.suggestedText);
  const [expanded, setExpanded] = useState(true);

  const handleAccept = useCallback(() => {
    onAccept(suggestion.id);
  }, [suggestion.id, onAccept]);

  const handleReject = useCallback(() => {
    onReject(suggestion.id);
  }, [suggestion.id, onReject]);

  const handleModify = useCallback(() => {
    if (isEditing && editedText.trim()) {
      onModify(suggestion.id, editedText.trim());
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  }, [suggestion.id, editedText, isEditing, onModify]);

  if (suggestion.status === "accepted" || suggestion.status === "rejected") {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -4, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4, scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 30 }}
      className="my-2 rounded-lg border border-purple-200 bg-white shadow-sm"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-purple-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <AgentAvatar
            name={agent.name}
            avatar={agent.avatar}
            color={agent.color}
            status="online"
            size="sm"
          />
          <span className="text-xs font-medium text-neutral-700">
            {agent.name}&apos;s suggestion
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleReject}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
            title="Reject suggestion"
          >
            <X className="h-3 w-3" />
            Reject
          </button>
          <button
            onClick={handleModify}
            className="flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-blue-50 hover:text-blue-600"
            title="Edit suggestion"
          >
            <Pencil className="h-3 w-3" />
            Edit
          </button>
          <button
            onClick={handleAccept}
            className="flex items-center gap-1 rounded-md bg-purple-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-purple-600"
            title="Accept suggestion"
          >
            <Check className="h-3 w-3" />
            Accept
          </button>
        </div>
      </div>

      {/* Explanation */}
      {suggestion.explanation && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between bg-purple-50/40 px-3 py-1.5 text-left transition-colors hover:bg-purple-50/60"
        >
          <span className="text-[11px] text-neutral-500 line-clamp-1">
            {suggestion.explanation}
          </span>
          {expanded ? (
            <ChevronUp className="h-3 w-3 shrink-0 text-neutral-400" />
          ) : (
            <ChevronDown className="h-3 w-3 shrink-0 text-neutral-400" />
          )}
        </button>
      )}

      {/* Diff view */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="space-y-0 px-3 py-2">
              {/* Original (removed) */}
              {suggestion.originalText && (
                <div className="rounded-md bg-red-50 px-2.5 py-1.5">
                  <span className="mr-1.5 text-[10px] font-medium text-red-400">
                    −
                  </span>
                  <span className="text-xs text-red-700 line-through">
                    {suggestion.originalText}
                  </span>
                </div>
              )}

              {/* Suggested (added) */}
              {isEditing ? (
                <div className="mt-1 rounded-md border border-blue-200 bg-blue-50 p-1">
                  <textarea
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full resize-none rounded bg-white px-2 py-1.5 text-xs text-neutral-700 outline-none focus:ring-1 focus:ring-blue-300"
                    rows={3}
                    autoFocus
                  />
                  <div className="mt-1 flex justify-end gap-1">
                    <button
                      onClick={() => {
                        setIsEditing(false);
                        setEditedText(suggestion.suggestedText);
                      }}
                      className="rounded px-2 py-0.5 text-[10px] text-neutral-500 hover:bg-neutral-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleModify}
                      className="rounded bg-blue-500 px-2 py-0.5 text-[10px] text-white hover:bg-blue-600"
                    >
                      Apply Edit
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-1 rounded-md bg-emerald-50 px-2.5 py-1.5">
                  <span className="mr-1.5 text-[10px] font-medium text-emerald-400">
                    +
                  </span>
                  <span className="text-xs text-emerald-700">
                    {suggestion.suggestedText}
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Suggestions Panel — Floating summary for multiple inline suggestions */
/* ------------------------------------------------------------------ */

interface SuggestionsPanelProps {
  suggestions: InlineSuggestionData[];
  agent: Agent;
  onAcceptAll: () => void;
  onRejectAll: () => void;
  onNavigate: (suggestion: InlineSuggestionData) => void;
}

export function SuggestionsPanel({
  suggestions,
  agent,
  onAcceptAll,
  onRejectAll,
  onNavigate,
}: SuggestionsPanelProps) {
  const pending = suggestions.filter((s) => s.status === "pending");

  if (pending.length === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="fixed bottom-6 right-6 z-40 w-72 rounded-xl border border-purple-200 bg-white shadow-xl"
    >
      <div className="flex items-center justify-between border-b border-purple-100 px-3 py-2.5">
        <div className="flex items-center gap-2">
          <AgentAvatar
            name={agent.name}
            avatar={agent.avatar}
            color={agent.color}
            status="online"
            size="sm"
          />
          <div>
            <p className="text-xs font-semibold text-neutral-800">
              {pending.length} suggestion{pending.length !== 1 ? "s" : ""}
            </p>
            <p className="text-[10px] text-neutral-400">
              by {agent.name}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRejectAll}
            className="rounded-md px-2 py-1 text-[11px] font-medium text-neutral-500 transition-colors hover:bg-red-50 hover:text-red-600"
          >
            <X className="h-3 w-3" />
          </button>
          <button
            onClick={onAcceptAll}
            className="rounded-md bg-purple-500 px-2.5 py-1 text-[11px] font-medium text-white transition-colors hover:bg-purple-600"
          >
            Accept All
          </button>
        </div>
      </div>

      <div className="max-h-48 overflow-y-auto p-2">
        {pending.map((s, i) => (
          <button
            key={s.id}
            onClick={() => onNavigate(s)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors hover:bg-neutral-50"
          >
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-100 text-[10px] font-bold text-purple-600">
              {i + 1}
            </span>
            <span className="line-clamp-1 text-neutral-600">
              {s.suggestedText.slice(0, 60)}
              {s.suggestedText.length > 60 ? "..." : ""}
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline Edit Handler — Manages suggestion state & operations        */
/* ------------------------------------------------------------------ */

export class InlineEditHandler {
  private suggestions: Map<string, InlineSuggestionData> = new Map();
  private listeners = new Set<() => void>();

  getSuggestions(): InlineSuggestionData[] {
    return Array.from(this.suggestions.values()).sort(
      (a, b) => a.range.from - b.range.from,
    );
  }

  getPendingSuggestions(): InlineSuggestionData[] {
    return this.getSuggestions().filter((s) => s.status === "pending");
  }

  addSuggestion(suggestion: InlineSuggestionData): void {
    this.suggestions.set(suggestion.id, suggestion);
    this.notify();
  }

  acceptSuggestion(id: string): InlineSuggestionData | null {
    const s = this.suggestions.get(id);
    if (!s) return null;
    s.status = "accepted";
    this.suggestions.set(id, s);
    this.notify();
    return s;
  }

  rejectSuggestion(id: string): void {
    const s = this.suggestions.get(id);
    if (!s) return;
    s.status = "rejected";
    this.suggestions.set(id, s);
    this.notify();
  }

  modifySuggestion(id: string, newText: string): InlineSuggestionData | null {
    const s = this.suggestions.get(id);
    if (!s) return null;
    s.suggestedText = newText;
    s.status = "modified";
    this.suggestions.set(id, s);
    this.notify();
    return s;
  }

  acceptAll(): InlineSuggestionData[] {
    const accepted: InlineSuggestionData[] = [];
    for (const s of this.suggestions.values()) {
      if (s.status === "pending") {
        s.status = "accepted";
        accepted.push(s);
      }
    }
    this.notify();
    return accepted;
  }

  rejectAll(): void {
    for (const s of this.suggestions.values()) {
      if (s.status === "pending") {
        s.status = "rejected";
      }
    }
    this.notify();
  }

  clearResolved(): void {
    for (const [id, s] of this.suggestions) {
      if (s.status === "accepted" || s.status === "rejected") {
        this.suggestions.delete(id);
      }
    }
    this.notify();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }
}
