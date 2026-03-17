"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import { Bot, Edit2, AlertCircle } from "lucide-react";
import { insertHumanMention } from "./inline-agent";
import { getInitial, hashToColor } from "@/lib/mentions/store";
import type { MentionableUser } from "@/lib/mentions/types";
import { listAgents, createAgent, updateAgentName, type Agent } from "@/lib/agents/store";
import { useDemoSafe } from "@/lib/demo/context";
import { DEMO_AGENTS, DEMO_PEOPLE } from "@/lib/demo/simulated-agents";
import { createClient } from "@/lib/supabase/client";
import { useResolvedAvatars } from "@/lib/ui/use-resolved-avatars";
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

const DEMO_AGENT_OPTIONS: Omit<AgentOption, 'agent'>[] = DEMO_AGENTS.map((a) => ({
  id: a.id,
  model: a.id,
  provider: a.name,
  icon: (
    <Image
      src={a.avatar}
      alt={a.name}
      width={32}
      height={32}
      className="h-full w-full rounded-md object-cover"
    />
  ),
  avatarSrc: a.avatar,
  color: a.color,
  description: a.description,
}));

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
  userId?: string;
  userName?: string;
}

function getOrCreateAgentForModel(model: string, _provider: string): Agent {
  const agents = listAgents();
  let agent = agents.find((a) => a.name.toLowerCase().includes(model.toLowerCase()));

  if (!agent) {
    const nameMap: Record<string, string> = {
      openclaw: "OpenClaw",
      chatgpt: "ChatGPT",
      claude: "Claude",
      cursor: "Cursor",
      "gpt-4": "GPT-4",
      "claude-3": "Claude",
      "gemini-pro": "Gemini",
      summarizer: "Summarizer",
    };
    const avatarMap: Record<string, string> = {
      openclaw: "🐾",
      chatgpt: "✨",
      claude: "🤖",
      cursor: "⚡",
      "gpt-4": "✨",
      "claude-3": "🤖",
      "gemini-pro": "⚡",
      summarizer: "📄",
    };
    const colorMap: Record<string, string> = {
      openclaw: "#E94560",
      chatgpt: "#10a37f",
      claude: "#8B5CF6",
      cursor: "#2563EB",
      "gpt-4": "#10a37f",
      "claude-3": "#8B5CF6",
      "gemini-pro": "#4285f4",
      summarizer: "#F59E0B",
    };

    agent = createAgent({
      name: nameMap[model] ?? "Assistant",
      avatar: avatarMap[model] ?? "🐾",
      color: colorMap[model] ?? "#8B5CF6",
    });
  }

  return agent;
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
  userId,
  userName,
}: AgentSelectorProps) {
  const [selected, setSelected] = useState<SelectedItem>({ type: 'ai', index: 0 });
  const [editingAgentId, setEditingAgentId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const demoCtx = useDemoSafe();
  const isDemo = !!demoCtx;
  const [dbAgentOptions, setDbAgentOptions] = useState<AgentOption[]>([]);
  const [dbUserOptions, setDbUserOptions] = useState<MentionableUser[]>([]);
  const [dbUserAvatarSources, setDbUserAvatarSources] = useState<{ id: string; avatar_url: string | null }[]>([]);
  const [agentFetchStatus, setAgentFetchStatus] = useState<"idle" | "loading" | "error" | "empty" | "loaded">("idle");

  useEffect(() => {
    if (isDemo || !workspaceId) return;
    let cancelled = false;
    setAgentFetchStatus("loading");

    async function fetchWorkspaceMembers() {
      try {
        const supabase = createClient();
        console.log("[AgentSelector] Fetching members for workspace:", workspaceId);

        let { data: agentData, error: agentError } = await supabase
          .from("users")
          .select("id, name, avatar_url, description, agent_type, type")
          .eq("type", "agent")
          .eq("school_id", workspaceId)
          .eq("is_deleted", false)
          .order("name", { ascending: true })
          .limit(20);

        if (agentError) {
          console.error("[AgentSelector] Failed to fetch agents:", agentError.message, agentError.details);
        }

        if (!agentError && (!agentData || agentData.length === 0)) {
          console.log("[AgentSelector] No agents for workspace, trying global fallback");
          const fallback = await supabase
            .from("users")
            .select("id, name, avatar_url, description, agent_type, type")
            .eq("type", "agent")
            .eq("is_deleted", false)
            .order("name", { ascending: true })
            .limit(10);

          if (fallback.error) {
            console.error("[AgentSelector] Global agent fallback failed:", fallback.error.message);
          } else {
            agentData = fallback.data;
            console.log("[AgentSelector] Global fallback returned", fallback.data?.length ?? 0, "agents");
          }
        }

        if (agentError && !cancelled) {
          setAgentFetchStatus("error");
        } else if (!cancelled && agentData?.length) {
          const opts: AgentOption[] = agentData.map((row: any) => {
            const name = row.name ?? "Agent";
            const agent = (() => {
              const existing = listAgents().find((a) => a.id === row.id);
              if (existing) return existing;
              return createAgent({ name, avatar: "🤖", color: "#8B5CF6" });
            })();
            if (agent.name !== name) updateAgentName(agent.id, name);
            return {
              id: row.id,
              model: row.agent_type ?? "custom",
              provider: name,
              icon: row.avatar_url
                ? <Image src={row.avatar_url} alt={name} width={32} height={32} className="h-full w-full rounded-md object-cover" unoptimized />
                : <Bot className="h-4 w-4" />,
              avatarSrc: row.avatar_url ?? undefined,
              color: row.avatar_url ? undefined : "#8B5CF6",
              description: row.description ?? "Workspace agent",
              agent,
            };
          });
          setDbAgentOptions(opts);
          setAgentFetchStatus("loaded");
        } else if (!cancelled) {
          setAgentFetchStatus("empty");
          console.warn("[AgentSelector] No agents found (workspace + global)");
        }

        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, name, avatar_url")
          .eq("school_id", workspaceId)
          .in("type", ["human", "teacher", "admin"])
          .eq("is_deleted", false)
          .order("name", { ascending: true })
          .limit(30);

        if (userError) {
          console.error("[AgentSelector] Failed to fetch users:", userError.message, userError.details);
        }

        if (!cancelled && userData?.length) {
          const users: MentionableUser[] = userData.map((row: any) => ({
            userId: row.id,
            displayName: row.name ?? "User",
            color: hashToColor(row.id),
          }));
          setDbUserOptions(users);
          setDbUserAvatarSources(userData.map((row: any) => ({ id: row.id, avatar_url: row.avatar_url })));
        }
      } catch (err) {
        console.error("[AgentSelector] Unexpected error fetching workspace members:", err);
        if (!cancelled) setAgentFetchStatus("error");
      }
    }

    fetchWorkspaceMembers();
    return () => { cancelled = true; };
  }, [isDemo, workspaceId]);

  const resolvedUserAvatars = useResolvedAvatars(dbUserAvatarSources);

  const AGENT_OPTIONS: AgentOption[] = isDemo
    ? DEMO_AGENT_OPTIONS.map(base => ({ ...base, agent: getOrCreateAgentForModel(base.model, base.provider) }))
    : dbAgentOptions;

  const filteredAgents = AGENT_OPTIONS.filter((agent) => {
    const q = query.toLowerCase();
    const displayName = isDemo ? agent.provider : agent.agent!.name;
    return (
      displayName.toLowerCase().includes(q) ||
      agent.model.toLowerCase().includes(q) ||
      agent.provider.toLowerCase().includes(q) ||
      agent.description.toLowerCase().includes(q)
    );
  });

  const demoUsers: MentionableUser[] = isDemo
    ? DEMO_PEOPLE.filter((p) => {
        const q = query.toLowerCase();
        return p.displayName.toLowerCase().includes(q) || p.role.toLowerCase().includes(q);
      }).map((p) => ({
        userId: p.userId,
        displayName: p.displayName,
        color: p.color,
        role: p.role,
      }))
    : [];

  const filteredUsers = isDemo
    ? demoUsers
    : dbUserOptions.filter((u) => {
        if (!query) return true;
        return u.displayName.toLowerCase().includes(query.toLowerCase());
      });
  const hasResults = filteredAgents.length > 0 || filteredUsers.length > 0;

  useEffect(() => {
    if (editingAgentId && nameInputRef.current) {
      nameInputRef.current.focus();
      nameInputRef.current.select();
    }
  }, [editingAgentId]);

  const handleSaveName = useCallback((agentId: string) => {
    if (editName.trim()) {
      updateAgentName(agentId, editName.trim());
    }
    setEditingAgentId(null);
    setEditName("");
  }, [editName]);

  /**
   * When an AI agent is selected: delete the @query text from the editor,
   * insert an inlineAgent node in "prompt" mode so the user can type their
   * instruction directly inline. No modal, no separate input — the block
   * appears right where the @ was.
   */
  const selectAIAgent = useCallback(
    (agentOption: AgentOption) => {
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - 40),
        from,
        "",
      );
      const mentionMatch = textBefore.match(/@([a-zA-Z0-9_-]*)$/);

      const deleteFrom = mentionMatch ? from - mentionMatch[0].length : from;

      editor
        .chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent({
          type: "inlineAgent",
          attrs: {
            taskId: null,
            mention: null,
            promptMode: true,
            agentId: isDemo ? agentOption.id : agentOption.agent!.id,
            agentName: isDemo ? agentOption.provider : agentOption.agent!.name,
            agentModel: agentOption.model,
            agentAvatar: agentOption.avatarSrc ?? agentOption.agent!.avatar,
            agentColor: agentOption.color ?? agentOption.agent!.color,
            documentId,
            documentTitle,
            schoolId: workspaceId,
            userId: userId ?? "",
          },
        })
        .run();

      onClose();
    },
    [editor, documentId, documentTitle, workspaceId, userId, onClose, isDemo],
  );

  const executeCommand = useCallback(
    (selection: SelectedItem) => {
      if (selection.type === 'ai') {
        const agentOption = filteredAgents[selection.index];
        if (!agentOption) return;
        selectAIAgent(agentOption); // also calls onClose internally
      } else {
        const user = filteredUsers[selection.index];
        if (!user) return;
        insertHumanMention(editor, user, documentId, documentTitle, workspaceId, userName);
        onClose();
      }
    },
    [editor, filteredAgents, filteredUsers, selectAIAgent, documentId, documentTitle, workspaceId, onClose],
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (editingAgentId) {
        if (e.key === "Enter") {
          e.preventDefault();
          handleSaveName(editingAgentId);
        } else if (e.key === "Escape") {
          e.preventDefault();
          setEditingAgentId(null);
          setEditName("");
        }
        return;
      }

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
      } else if (e.key === "Tab" || e.key === "Enter") {
        e.preventDefault();
        executeCommand(selected);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selected, filteredAgents.length, filteredUsers.length, executeCommand, onClose, editingAgentId, handleSaveName]);

  useEffect(() => {
    if (menuRef.current) {
      const active = menuRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [selected]);

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

  // Auto-dismiss when no results and user continues typing past the query
  useEffect(() => {
    if (isOpen && !hasResults && query.length > 0) {
      const timer = setTimeout(() => {
        if (!hasResults) onClose();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOpen, hasResults, query, onClose]);

  if (!isOpen) return null;

  if (!hasResults) {
    const hint =
      agentFetchStatus === "error"
        ? "Failed to load agents — check console for details"
        : agentFetchStatus === "loading"
          ? "Loading workspace members\u2026"
          : agentFetchStatus === "empty"
            ? "No agents registered in this workspace"
            : "No agents or collaborators found";
    return (
      <div
        ref={menuRef}
        className="fixed z-50 w-80 rounded-lg border border-[#e5e5e5] bg-white shadow-lg"
        style={{ top: position.top + 24, left: position.left }}
      >
        <div className="flex items-center justify-center gap-2 px-4 py-3 text-sm text-neutral-400 text-center">
          {agentFetchStatus === "error" && <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />}
          {hint}
        </div>
      </div>
    );
  }

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
          <div className="mb-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <Bot className="h-3 w-3 text-purple-400" />
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                AI Agents
              </span>
              <span className="rounded-full bg-purple-50 px-1.5 text-[10px] font-medium text-purple-400">
                {filteredAgents.length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-60 overflow-y-auto">
              {filteredAgents.map((agentOption, index) => {
                const agentColor = agentOption.color ?? agentOption.agent?.color ?? "#8B5CF6";
                return (
                  <div
                    key={agentOption.id}
                    data-active={isAISelected(index)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors cursor-pointer ${
                      isAISelected(index)
                        ? "bg-purple-50/60 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                    onClick={() => selectAIAgent(agentOption)}
                    onMouseEnter={() => setSelected({ type: 'ai', index })}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border-2 bg-white"
                      style={{ borderColor: agentColor }}
                    >
                      {agentOption.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      {!isDemo && editingAgentId === agentOption.agent!.id ? (
                        <input
                          ref={nameInputRef}
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onBlur={() => handleSaveName(agentOption.agent!.id)}
                          className="w-full px-1 py-0.5 text-sm font-medium border border-blue-500 rounded focus:outline-none"
                        />
                      ) : (
                        <>
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-neutral-900">
                              {isDemo ? agentOption.provider : agentOption.agent!.name}
                            </span>
                            <span
                              className="rounded-full px-1.5 py-0.5 text-[9px] font-semibold leading-none text-white"
                              style={{ backgroundColor: agentColor }}
                            >
                              AI
                            </span>
                          </div>
                          <div className="text-xs text-neutral-400 truncate">{agentOption.description}</div>
                        </>
                      )}
                    </div>
                    {!isDemo && !editingAgentId && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingAgentId(agentOption.agent!.id);
                          setEditName(agentOption.agent!.name);
                        }}
                        className="p-1 hover:bg-neutral-200 rounded text-neutral-400 hover:text-neutral-600"
                        title="Rename agent"
                      >
                        <Edit2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Agent error/empty hints */}
        {!isDemo && filteredAgents.length === 0 && agentFetchStatus === "error" && (
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-red-400">
            <AlertCircle className="h-3 w-3 shrink-0" />
            Failed to load agents
          </div>
        )}
        {!isDemo && filteredAgents.length === 0 && agentFetchStatus === "empty" && (
          <div className="flex items-center gap-1.5 px-3 py-2 text-xs text-neutral-400">
            <Bot className="h-3 w-3 shrink-0" />
            No agents in this workspace
          </div>
        )}

        {/* Divider between sections */}
        {filteredAgents.length > 0 && filteredUsers.length > 0 && (
          <div className="my-1.5 border-t border-[#e5e5e5]" />
        )}

        {/* Human Collaborators Section */}
        {filteredUsers.length > 0 && (
          <div className="mb-1">
            <div className="flex items-center gap-1.5 mb-1.5">
              <div className="flex h-3 w-3 items-center justify-center rounded-full bg-neutral-300">
                <span className="text-[6px] font-bold text-white">P</span>
              </div>
              <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                People
              </span>
              <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-medium text-neutral-400">
                {filteredUsers.length}
              </span>
            </div>
            <div className="space-y-0.5 max-h-48 overflow-y-auto">
              {filteredUsers.map((user, index) => {
                const avatarSrc = resolvedUserAvatars[user.userId];
                return (
                  <button
                    key={user.userId}
                    data-active={isHumanSelected(index)}
                    className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm rounded-md transition-colors ${
                      isHumanSelected(index)
                        ? "bg-neutral-100 text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50"
                    }`}
                    onClick={() => executeCommand({ type: 'human', index })}
                    onMouseEnter={() => setSelected({ type: 'human', index })}
                  >
                    <div
                      className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: avatarSrc ? undefined : (user.color ?? "#9CA3AF") }}
                    >
                      {avatarSrc ? (
                        <img src={avatarSrc} alt={user.displayName} className="h-full w-full object-cover" />
                      ) : (
                        getInitial(user.displayName)
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-neutral-900">{user.displayName}</div>
                      {user.role && (
                        <div className="text-xs text-neutral-400 capitalize">{user.role}</div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="border-t border-[#e5e5e5] pt-1.5 pb-0.5">
          <div className="text-[10px] text-neutral-400 text-center">
            <kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">Enter</kbd> to select
            {" "}<kbd className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[9px]">Esc</kbd> to dismiss
          </div>
        </div>
      </div>
    </div>
  );
}
