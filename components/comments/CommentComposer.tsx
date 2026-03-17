"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageSquareText, Send, X, Bot } from "lucide-react";
import { useDemoSafe } from "@/lib/demo/context";
import { DEMO_AGENTS, DEMO_PEOPLE } from "@/lib/demo/simulated-agents";
import { searchWorkspaceUsers } from "@/lib/mentions/store";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface MentionOption {
  id: string;
  name: string;
  type: "user" | "agent";
  avatar?: React.ReactNode;
  color?: string;
  description?: string;
}

export interface CommentComposerProps {
  isOpen: boolean;
  position: { top: number; left: number };
  selectedText: string;
  selectionRange: { from: number; to: number };
  workspaceId: string;
  onClose: () => void;
  onSubmit: (
    text: string,
    selectedText: string,
    range: { from: number; to: number },
    mentionedAgents: { id: string; name: string }[],
  ) => void;
}

export function CommentComposer({
  isOpen,
  position,
  selectedText,
  selectionRange,
  workspaceId,
  onClose,
  onSubmit,
}: CommentComposerProps) {
  const [text, setText] = useState("");
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [agentOptions, setAgentOptions] = useState<MentionOption[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const composerRef = useRef<HTMLDivElement>(null);
  const demoCtx = useDemoSafe();
  const isDemo = !!demoCtx;

  // Fetch agents from Supabase or use demo
  useEffect(() => {
    if (isDemo) {
      setAgentOptions(
        DEMO_AGENTS.map((a) => ({
          id: a.id,
          name: a.name,
          type: "agent" as const,
          avatar: (
            <Image
              src={a.avatar}
              alt={a.name}
              width={20}
              height={20}
              className="h-full w-full rounded-full object-cover"
            />
          ),
          color: a.color,
          description: a.description,
        })),
      );
      return;
    }
    if (!workspaceId) return;
    let cancelled = false;
    async function fetch() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("users")
          .select("id, name, avatar_url, description")
          .eq("type", "agent")
          .eq("school_id", workspaceId)
          .eq("is_deleted", false)
          .order("name")
          .limit(20);
        if (cancelled || !data?.length) return;
        setAgentOptions(
          data.map((row: any) => ({
            id: row.id,
            name: row.name ?? "Agent",
            type: "agent" as const,
            avatar: row.avatar_url ? (
              <Image
                src={row.avatar_url}
                alt={row.name ?? "Agent"}
                width={20}
                height={20}
                className="h-full w-full rounded-full object-cover"
                unoptimized
              />
            ) : (
              <Bot className="h-3 w-3" />
            ),
            description: row.description ?? "Agent",
          })),
        );
      } catch {
        /* best effort */
      }
    }
    fetch();
    return () => {
      cancelled = true;
    };
  }, [isDemo, workspaceId]);

  // People options
  const userOptions: MentionOption[] = useMemo(() => {
    if (isDemo) {
      return DEMO_PEOPLE.map((p) => ({
        id: p.userId,
        name: p.displayName,
        type: "user" as const,
        color: p.color,
        description: p.role,
      }));
    }
    return searchWorkspaceUsers(workspaceId, "").map((u) => ({
      id: u.userId,
      name: u.displayName,
      type: "user" as const,
      color: u.color,
      description: u.role,
    }));
  }, [isDemo, workspaceId]);

  const allMentionOptions = useMemo(
    () => [...agentOptions, ...userOptions],
    [agentOptions, userOptions],
  );

  const filteredMentions = useMemo(() => {
    if (mentionQuery === null) return [];
    const q = mentionQuery.toLowerCase();
    return allMentionOptions.filter(
      (o) =>
        o.name.toLowerCase().includes(q) ||
        (o.description?.toLowerCase().includes(q) ?? false),
    );
  }, [mentionQuery, allMentionOptions]);

  useEffect(() => {
    if (isOpen) {
      setText("");
      setMentionQuery(null);
      setTimeout(() => textareaRef.current?.focus(), 80);
    }
  }, [isOpen]);

  // Click outside
  useEffect(() => {
    if (!isOpen) return;
    function handleClick(e: MouseEvent) {
      if (
        composerRef.current &&
        !composerRef.current.contains(e.target as Node)
      ) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen, onClose]);

  const insertMention = useCallback(
    (option: MentionOption) => {
      if (mentionQuery === null) return;
      const before = text.slice(0, text.lastIndexOf("@" + mentionQuery));
      const after = text.slice(
        text.lastIndexOf("@" + mentionQuery) + mentionQuery.length + 1,
      );
      setText(before + `@${option.name} ` + after);
      setMentionQuery(null);
      setMentionIndex(0);
      textareaRef.current?.focus();
    },
    [text, mentionQuery],
  );

  const handleTextChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      setText(val);

      const cursor = e.target.selectionStart;
      const textUpToCursor = val.slice(0, cursor);
      const mentionMatch = textUpToCursor.match(/@(\w*)$/);
      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionIndex(0);
      } else {
        setMentionQuery(null);
      }
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return;
    const mentionedAgents = allMentionOptions
      .filter((o) => o.type === "agent" && text.includes(`@${o.name}`))
      .map((o) => ({ id: o.id, name: o.name }));
    onSubmit(text.trim(), selectedText, selectionRange, mentionedAgents);
    setText("");
    onClose();
  }, [
    text,
    selectedText,
    selectionRange,
    allMentionOptions,
    onSubmit,
    onClose,
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (mentionQuery !== null && filteredMentions.length > 0) {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setMentionIndex((i) => Math.min(i + 1, filteredMentions.length - 1));
          return;
        }
        if (e.key === "ArrowUp") {
          e.preventDefault();
          setMentionIndex((i) => Math.max(i - 1, 0));
          return;
        }
        if (e.key === "Tab" || e.key === "Enter") {
          e.preventDefault();
          insertMention(filteredMentions[mentionIndex]);
          return;
        }
      }
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
      if (e.key === "Escape") {
        e.preventDefault();
        if (mentionQuery !== null) {
          setMentionQuery(null);
        } else {
          onClose();
        }
      }
    },
    [
      mentionQuery,
      filteredMentions,
      mentionIndex,
      insertMention,
      handleSubmit,
      onClose,
    ],
  );

  if (!isOpen) return null;

  const truncatedText =
    selectedText.length > 80
      ? selectedText.slice(0, 80) + "..."
      : selectedText;

  const safeTop = Math.min(position.top + 28, window.innerHeight - 300);
  const safeLeft = Math.min(position.left, window.innerWidth - 380);

  return (
    <AnimatePresence>
      <motion.div
        ref={composerRef}
        initial={{ opacity: 0, y: -6, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -6, scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed z-50 w-[360px] overflow-hidden rounded-xl border border-blue-200/60 bg-white shadow-xl shadow-blue-100/30"
        style={{ top: safeTop, left: safeLeft }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-gradient-to-r from-blue-50/80 to-sky-50/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10">
              <MessageSquareText className="h-3 w-3 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-neutral-700">
              Add Comment
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Quoted text */}
        {truncatedText && (
          <div className="border-b border-neutral-100 bg-amber-50/40 px-3 py-2">
            <p className="line-clamp-2 text-xs italic leading-relaxed text-neutral-500">
              &ldquo;{truncatedText}&rdquo;
            </p>
          </div>
        )}

        {/* Textarea */}
        <div className="relative p-3">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="Add a comment... (@ to mention agents or people)"
            rows={3}
            className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs leading-relaxed text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-blue-300 focus:ring-1 focus:ring-blue-200"
          />

          {/* Mention autocomplete dropdown */}
          <AnimatePresence>
            {mentionQuery !== null && filteredMentions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="absolute bottom-full left-3 right-3 z-10 mb-1 max-h-44 overflow-y-auto rounded-lg border border-neutral-200 bg-white shadow-lg"
              >
                {filteredMentions.map((option, idx) => (
                  <button
                    key={`${option.type}-${option.id}`}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-xs transition-colors ${
                      idx === mentionIndex
                        ? "bg-blue-50 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                    onMouseEnter={() => setMentionIndex(idx)}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      insertMention(option);
                    }}
                  >
                    {option.avatar ? (
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full border border-neutral-200 bg-white">
                        {option.avatar}
                      </div>
                    ) : (
                      <div
                        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                        style={{
                          backgroundColor: option.color ?? "#9333ea",
                        }}
                      >
                        {option.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium">{option.name}</span>
                      {option.type === "agent" && (
                        <span className="ml-1.5 rounded bg-purple-100 px-1 py-0.5 text-[9px] font-medium text-purple-600">
                          Agent
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Actions */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[10px] text-neutral-400">
              <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">
                @
              </kbd>{" "}
              to mention
            </span>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="flex items-center gap-1.5 rounded-lg bg-blue-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-blue-600 disabled:opacity-40"
            >
              <Send className="h-3 w-3" />
              Comment
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
