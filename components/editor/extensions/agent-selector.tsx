"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Bot, Sparkles, Zap, User } from "lucide-react";
import { createInlineAgentTask, insertHumanMention } from "./inline-agent";
import { searchWorkspaceUsers } from "@/lib/mentions/store";
import { getInitial } from "@/lib/mentions/store";
import type { MentionableUser } from "@/lib/mentions/types";

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

type SelectionType = 'human' | 'ai';

interface SelectedItem {
  type: SelectionType;
  index: number;
}

interface AgentSelectorProps {
  editor: Editor;
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  query: string;
  documentId: string;
  documentTitle: string;
  workspaceId: string;
}

export function AgentSelector({
  editor,
  isOpen,
  position,
  onClose,
  query,
  documentId,
  documentTitle,
  workspaceId,
}: AgentSelectorProps) {
  const [selected, setSelected] = useState<SelectedItem>({ type: 'ai', index: 0 });
  const [prompt, setPrompt] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter AI agents
  const filteredAgents = AGENT_OPTIONS.filter((agent) => {
    const q = query.toLowerCase();
    return (
      agent.model.toLowerCase().includes(q) ||
      agent.provider.toLowerCase().includes(q)
    );
  });

  // Filter human collaborators
  const filteredUsers = searchWorkspaceUsers(workspaceId, query);

  const hasResults = filteredAgents.length > 0 || filteredUsers.length > 0;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const executeCommand = useCallback(
    (selection: SelectedItem) => {
      if (selection.type === 'ai') {
        const agent = filteredAgents[selection.index];
        if (!agent || !prompt.trim()) return;

        createInlineAgentTask(
          editor,
          agent.model,
          prompt.trim(),
          documentId,
          documentTitle
        );
      } else {
        const user = filteredUsers[selection.index];
        if (!user) return;

        insertHumanMention(
          editor,
          user,
          documentId,
          documentTitle,
          workspaceId
        );
      }

      setPrompt("");
      onClose();
    },
    [editor, filteredAgents, filteredUsers, prompt, documentId, documentTitle, workspaceId, onClose]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelected(prev => {
          if (prev.type === 'ai') {
            if (prev.index < filteredAgents.length - 1) {
              return { type: 'ai', index: prev.index + 1 };
            } else if (filteredUsers.length > 0) {
              return { type: 'human', index: 0 };
            }
          } else {
            if (prev.index < filteredUsers.length - 1) {
              return { type: 'human', index: prev.index + 1 };
            }
          }
          return prev;
        });
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelected(prev => {
          if (prev.type === 'human') {
            if (prev.index > 0) {
              return { type: 'human', index: prev.index - 1 };
            } else if (filteredAgents.length > 0) {
              return { type: 'ai', index: filteredAgents.length - 1 };
            }
          } else {
            if (prev.index > 0) {
              return { type: 'ai', index: prev.index - 1 };
            }
          }
          return prev;
        });
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (selected.type === 'ai' && prompt.trim()) {
          executeCommand(selected);
        } else if (selected.type === 'human') {
          executeCommand(selected);
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selected, filteredAgents.length, filteredUsers.length, executeCommand, prompt, onClose]);

  useEffect(() => {
    if (menuRef.current) {
      const active = menuRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

  if (!isOpen || !hasResults) return null;

  const isAISelected = (index: number) => selected.type === 'ai' && selected.index === index;
  const isHumanSelected = (index: number) => selected.type === 'human' && selected.index === index;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-80 rounded-lg border border-[#e5e5e5] bg-white shadow-lg"
      style={{ top: position.top + 24, left: position.left }}
    >
      <div className="px-3 py-2">
        {/* AI Agents Section */}
        {filteredAgents.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">
              AI Agents
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredAgents.map((agent, index) => (
                <button
                  key={agent.id}
                  data-active={isAISelected(index)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                    isAISelected(index)
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50"
                  }`}
                  onClick={() => {
                    setSelected({ type: 'ai', index });
                    if (inputRef.current) inputRef.current.focus();
                  }}
                  onMouseEnter={() => setSelected({ type: 'ai', index })}
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
          </div>
        )}

        {/* Human Collaborators Section */}
        {filteredUsers.length > 0 && (
          <div className="mb-3">
            <div className="text-[11px] font-medium uppercase tracking-wider text-neutral-400 mb-2">
              Human Collaborators
            </div>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {filteredUsers.map((user, index) => (
                <button
                  key={user.userId}
                  data-active={isHumanSelected(index)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                    isHumanSelected(index)
                      ? "bg-neutral-100 text-neutral-900"
                      : "text-neutral-600 hover:bg-neutral-50"
                  }`}
                  onClick={() => {
                    setSelected({ type: 'human', index });
                    executeCommand({ type: 'human', index });
                  }}
                  onMouseEnter={() => setSelected({ type: 'human', index })}
                >
                  <div
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
                    style={{ backgroundColor: user.color }}
                  >
                    {getInitial(user.displayName)}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium text-neutral-900">{user.displayName}</div>
                    {user.role && (
                      <div className="text-xs text-neutral-400 capitalize">{user.role}</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Prompt input for AI agents */}
        {selected.type === 'ai' && (
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
                  executeCommand(selected);
                }
              }}
            />
            <div className="mt-2 text-xs text-neutral-400">
              Press Enter to submit, Esc to cancel
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
