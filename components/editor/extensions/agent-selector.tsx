"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Bot, Sparkles, Zap } from "lucide-react";
import { createInlineAgentTask } from "./inline-agent";

interface AgentOption {
  id: string;
  model: string;
  provider: string;
  icon: React.ReactNode;
  description: string;
}

const AGENT_OPTIONS: AgentOption[] = [
  {
    id: "gpt-4",
    model: "GPT-4",
    provider: "OpenAI",
    icon: <Sparkles className="h-4 w-4" />,
    description: "Advanced reasoning and generation",
  },
  {
    id: "claude-3",
    model: "Claude 3",
    provider: "Anthropic",
    icon: <Bot className="h-4 w-4" />,
    description: "Long context understanding",
  },
  {
    id: "gemini-pro",
    model: "Gemini Pro",
    provider: "Google",
    icon: <Zap className="h-4 w-4" />,
    description: "Fast and efficient",
  },
];

interface AgentSelectorProps {
  editor: Editor;
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  query: string;
  documentId: string;
  documentTitle: string;
}

export function AgentSelector({
  editor,
  isOpen,
  position,
  onClose,
  query,
  documentId,
  documentTitle,
}: AgentSelectorProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [prompt, setPrompt] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const filtered = AGENT_OPTIONS.filter((agent) => {
    const q = query.toLowerCase();
    return (
      agent.model.toLowerCase().includes(q) ||
      agent.provider.toLowerCase().includes(q)
    );
  });

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const executeCommand = useCallback(
    (index: number) => {
      const agent = filtered[index];
      if (!agent || !prompt.trim()) return;

      createInlineAgentTask(
        editor,
        agent.model,
        prompt.trim(),
        documentId,
        documentTitle
      );

      setPrompt("");
      onClose();
    },
    [editor, filtered, prompt, documentId, documentTitle, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeCommand(selectedIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, filtered.length, executeCommand, onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const active = menuRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-80 rounded-lg border border-[#e5e5e5] bg-white shadow-lg"
      style={{ top: position.top + 24, left: position.left }}
    >
      <div className="px-3 py-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">
          Select Agent
        </div>
        <div className="space-y-1 max-h-48 overflow-y-auto mb-2">
          {filtered.map((agent, index) => (
            <button
              key={agent.id}
              data-active={index === selectedIndex}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                index === selectedIndex
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50"
              }`}
              onClick={() => setSelectedIndex(index)}
              onMouseEnter={() => setSelectedIndex(index)}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e5e5e5] bg-white">
                {agent.icon}
              </div>
              <div className="flex-1">
                <div className="font-medium text-neutral-900">{agent.model}</div>
                <div className="text-xs text-neutral-400">{agent.description}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="border-t border-[#e5e5e5] pt-2">
          <input
            ref={inputRef}
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="What would you like the agent to do?"
            className="w-full px-3 py-2 text-sm border border-[#e5e5e5] rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && prompt.trim()) {
                e.preventDefault();
                executeCommand(selectedIndex);
              }
            }}
          />
          <div className="mt-2 text-xs text-neutral-400">
            Press Enter to submit, Esc to cancel
          </div>
        </div>
      </div>
    </div>
  );
}
