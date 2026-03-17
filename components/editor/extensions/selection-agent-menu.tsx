"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Editor } from "@tiptap/react";
import { Bot, Sparkles, X, Send, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { listAgents, createAgent, type Agent } from "@/lib/agents/store";
import { useDemoSafe } from "@/lib/demo/context";
import { DEMO_AGENTS } from "@/lib/demo/simulated-agents";
import { createClient } from "@/lib/supabase/client";
import Image from "next/image";

interface AgentOption {
  id: string;
  model: string;
  provider: string;
  icon: React.ReactNode;
  description: string;
  avatarSrc?: string;
  color?: string;
  agent?: Agent;
}

const DEMO_AGENT_OPTIONS: Omit<AgentOption, "agent">[] = DEMO_AGENTS.map(
  (a) => ({
    id: a.id,
    model: a.id,
    provider: a.name,
    icon: (
      <Image
        src={a.avatar}
        alt={a.name}
        width={24}
        height={24}
        className="h-full w-full rounded-md object-cover"
      />
    ),
    avatarSrc: a.avatar,
    color: a.color,
    description: a.description,
  }),
);

export interface SelectionAgentMenuProps {
  editor: Editor;
  isOpen: boolean;
  position: { top: number; left: number };
  selectedText: string;
  selectionRange: { from: number; to: number };
  documentId: string;
  documentTitle: string;
  workspaceId: string;
  userId?: string;
  onClose: () => void;
  onSubmit: (
    agent: Agent,
    instruction: string,
    selectedText: string,
    range: { from: number; to: number },
  ) => void;
}

function getOrCreateAgentForModel(model: string): Agent {
  const agents = listAgents();
  let agent = agents.find((a) =>
    a.name.toLowerCase().includes(model.toLowerCase()),
  );
  if (!agent) {
    const nameMap: Record<string, string> = {
      openclaw: "OpenClaw",
      chatgpt: "ChatGPT",
      claude: "Claude",
      cursor: "Cursor",
    };
    agent = createAgent({
      name: nameMap[model] ?? "Assistant",
      avatar: "🤖",
      color: "#8B5CF6",
    });
  }
  return agent;
}

export function SelectionAgentMenu({
  isOpen,
  position,
  selectedText,
  selectionRange,
  workspaceId,
  onClose,
  onSubmit,
}: SelectionAgentMenuProps) {
  const [step, setStep] = useState<"agent" | "instruction">("agent");
  const [chosenAgent, setChosenAgent] = useState<AgentOption | null>(null);
  const [instruction, setInstruction] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [agentIndex, setAgentIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const demoCtx = useDemoSafe();
  const isDemo = !!demoCtx;
  const [dbAgentOptions, setDbAgentOptions] = useState<AgentOption[]>([]);

  useEffect(() => {
    if (isDemo || !workspaceId) return;
    let cancelled = false;
    async function fetchDbAgents() {
      try {
        const supabase = createClient();
        const { data } = await supabase
          .from("users")
          .select("id, name, avatar_url, description, agent_type")
          .eq("type", "agent")
          .eq("school_id", workspaceId)
          .eq("is_deleted", false)
          .order("name", { ascending: true })
          .limit(20);
        if (cancelled || !data?.length) return;
        const opts: AgentOption[] = data.map((row: any) => {
          const name = row.name ?? "Agent";
          const existing = listAgents().find((a) => a.id === row.id);
          const agent =
            existing ?? createAgent({ name, avatar: "🤖", color: "#8B5CF6" });
          return {
            id: row.id,
            model: row.agent_type ?? "custom",
            provider: name,
            icon: row.avatar_url ? (
              <Image
                src={row.avatar_url}
                alt={name}
                width={24}
                height={24}
                className="h-full w-full rounded-md object-cover"
                unoptimized
              />
            ) : (
              <Bot className="h-4 w-4" />
            ),
            avatarSrc: row.avatar_url ?? undefined,
            description: row.description ?? "Workspace agent",
            agent,
          };
        });
        setDbAgentOptions(opts);
      } catch {
        /* best effort */
      }
    }
    fetchDbAgents();
    return () => {
      cancelled = true;
    };
  }, [isDemo, workspaceId]);

  const AGENT_OPTIONS: AgentOption[] = isDemo
    ? DEMO_AGENT_OPTIONS.map((base) => ({
        ...base,
        agent: getOrCreateAgentForModel(base.model),
      }))
    : dbAgentOptions;

  const filteredAgents = useMemo(
    () =>
      AGENT_OPTIONS.filter((a) => {
        const q = agentFilter.toLowerCase();
        if (!q) return true;
        const name = isDemo ? a.provider : a.agent?.name ?? "";
        return (
          name.toLowerCase().includes(q) ||
          a.description.toLowerCase().includes(q)
        );
      }),
    [AGENT_OPTIONS, agentFilter, isDemo],
  );

  // Reset state when menu opens/closes
  useEffect(() => {
    if (isOpen) {
      setStep("agent");
      setChosenAgent(null);
      setInstruction("");
      setAgentFilter("");
      setAgentIndex(0);
    }
  }, [isOpen]);

  // Focus input when step changes
  useEffect(() => {
    if (step === "agent") {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else if (step === "instruction") {
      setTimeout(() => textareaRef.current?.focus(), 50);
    }
  }, [step]);

  // Click-outside dismissal
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  const handleSelectAgent = useCallback(
    (agentOption: AgentOption) => {
      const agent = isDemo
        ? getOrCreateAgentForModel(agentOption.model)
        : agentOption.agent!;
      setChosenAgent({ ...agentOption, agent });
      setStep("instruction");
    },
    [isDemo],
  );

  const handleSubmit = useCallback(() => {
    if (!chosenAgent?.agent) return;
    const prompt = instruction.trim() || "Process this selection";
    onSubmit(chosenAgent.agent, prompt, selectedText, selectionRange);
    onClose();
  }, [chosenAgent, instruction, selectedText, selectionRange, onSubmit, onClose]);

  // Keyboard nav
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        if (step === "instruction") {
          setStep("agent");
        } else {
          onClose();
        }
        return;
      }

      if (step === "agent") {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          setAgentIndex((prev) =>
            Math.min(prev + 1, filteredAgents.length - 1),
          );
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          setAgentIndex((prev) => Math.max(prev - 1, 0));
        } else if (e.key === "Enter" || e.key === "Tab") {
          e.preventDefault();
          const agent = filteredAgents[agentIndex];
          if (agent) handleSelectAgent(agent);
        }
      } else if (step === "instruction") {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          handleSubmit();
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    step,
    agentIndex,
    filteredAgents,
    handleSelectAgent,
    handleSubmit,
    onClose,
  ]);

  // Keep agentIndex in range
  useEffect(() => {
    if (agentIndex >= filteredAgents.length) {
      setAgentIndex(Math.max(0, filteredAgents.length - 1));
    }
  }, [filteredAgents.length, agentIndex]);

  if (!isOpen) return null;

  const truncatedText =
    selectedText.length > 120
      ? selectedText.slice(0, 120) + "..."
      : selectedText;

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, y: -8, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="fixed z-50 w-[340px] overflow-hidden rounded-xl border border-purple-200/60 bg-white shadow-xl shadow-purple-100/40"
        style={{
          top: Math.min(position.top + 28, window.innerHeight - 400),
          left: Math.min(position.left, window.innerWidth - 360),
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 bg-gradient-to-r from-purple-50/80 to-violet-50/60 px-3 py-2">
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-purple-500/10">
              <Sparkles className="h-3 w-3 text-purple-600" />
            </div>
            <span className="text-xs font-semibold text-neutral-700">
              Ask Agent
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Selected text preview */}
        <div className="border-b border-neutral-100 bg-neutral-50/50 px-3 py-2">
          <div className="text-[10px] font-medium uppercase tracking-wider text-neutral-400">
            Selected text
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-neutral-500">
            {truncatedText}
          </p>
        </div>

        {step === "agent" && (
          <div className="p-2">
            {/* Search filter */}
            <input
              ref={inputRef}
              type="text"
              placeholder="Search agents..."
              value={agentFilter}
              onChange={(e) => {
                setAgentFilter(e.target.value);
                setAgentIndex(0);
              }}
              className="mb-2 w-full rounded-lg border border-neutral-200 bg-white px-3 py-1.5 text-xs text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            />

            {/* Agent list */}
            <div className="max-h-52 space-y-0.5 overflow-y-auto">
              {filteredAgents.length === 0 ? (
                <div className="px-3 py-4 text-center text-xs text-neutral-400">
                  No agents found
                </div>
              ) : (
                filteredAgents.map((agentOption, index) => (
                  <button
                    key={agentOption.id}
                    data-active={index === agentIndex}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                      index === agentIndex
                        ? "bg-purple-50 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                    onClick={() => handleSelectAgent(agentOption)}
                    onMouseEnter={() => setAgentIndex(index)}
                  >
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-neutral-200 bg-white">
                      {agentOption.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium">
                        {isDemo ? agentOption.provider : agentOption.agent?.name}
                      </div>
                      <div className="truncate text-[10px] text-neutral-400">
                        {agentOption.description}
                      </div>
                    </div>
                    <ChevronRight className="h-3 w-3 shrink-0 text-neutral-300" />
                  </button>
                ))
              )}
            </div>

            <div className="mt-1.5 border-t border-neutral-100 pt-1.5">
              <div className="text-center text-[10px] text-neutral-400">
                <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">
                  Enter
                </kbd>{" "}
                select{" "}
                <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">
                  Esc
                </kbd>{" "}
                cancel
              </div>
            </div>
          </div>
        )}

        {step === "instruction" && chosenAgent && (
          <div className="p-3">
            {/* Chosen agent indicator */}
            <div className="mb-2.5 flex items-center gap-2">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center overflow-hidden rounded-md border border-neutral-200 bg-white">
                {chosenAgent.icon}
              </div>
              <span className="text-xs font-medium text-neutral-700">
                {isDemo ? chosenAgent.provider : chosenAgent.agent?.name}
              </span>
              <button
                onClick={() => setStep("agent")}
                className="ml-auto text-[10px] text-purple-500 hover:text-purple-700"
              >
                Change
              </button>
            </div>

            {/* Instruction input */}
            <textarea
              ref={textareaRef}
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Give instructions... (e.g. 'Summarize this', 'Fix grammar', 'Translate to French')"
              rows={3}
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs leading-relaxed text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-200"
            />

            {/* Actions */}
            <div className="mt-2 flex items-center justify-between">
              <button
                onClick={() => setStep("agent")}
                className="rounded-md px-2 py-1 text-[11px] text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                className="flex items-center gap-1.5 rounded-lg bg-purple-500 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-purple-600"
              >
                <Send className="h-3 w-3" />
                Run
              </button>
            </div>

            <div className="mt-2 text-center text-[10px] text-neutral-400">
              <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">
                Enter
              </kbd>{" "}
              to run{" "}
              <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">
                Esc
              </kbd>{" "}
              back
            </div>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
