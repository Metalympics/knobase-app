"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Plus,
  Check,
  X,
  UserPlus,
  Settings,
  Trash2,
} from "lucide-react";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import {
  listAgents,
  getDocumentAgents,
  getActiveDocumentAgent,
  setActiveDocumentAgent,
  assignAgentToDocument,
  removeAgentFromDocument,
  type Agent,
} from "@/lib/agents/store";

/* ------------------------------------------------------------------ */
/* Agent Switcher (toolbar dropdown)                                   */
/* ------------------------------------------------------------------ */

interface AgentSwitcherProps {
  documentId: string;
  onAgentChange?: (agent: Agent) => void;
  onOpenSettings?: () => void;
}

export function AgentSwitcher({
  documentId,
  onAgentChange,
  onOpenSettings,
}: AgentSwitcherProps) {
  const [open, setOpen] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [activeAgent, setActiveAgent] = useState<Agent | null>(null);
  const [assignedAgents, setAssignedAgents] = useState<Agent[]>([]);
  const [allAgents, setAllAgents] = useState<Agent[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActiveAgent(getActiveDocumentAgent(documentId));
    setAssignedAgents(getDocumentAgents(documentId));
    setAllAgents(listAgents());
  }, [documentId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setShowInvite(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleSelect = useCallback(
    (agent: Agent) => {
      setActiveDocumentAgent(documentId, agent.id);
      // Also assign if not already assigned
      if (!assignedAgents.find((a) => a.id === agent.id)) {
        assignAgentToDocument(documentId, agent.id);
        setAssignedAgents((prev) => [...prev, agent]);
      }
      setActiveAgent(agent);
      onAgentChange?.(agent);
      setOpen(false);
    },
    [documentId, assignedAgents, onAgentChange],
  );

  const handleRemove = useCallback(
    (agentId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      removeAgentFromDocument(documentId, agentId);
      setAssignedAgents((prev) => prev.filter((a) => a.id !== agentId));
      // If removing the active agent, switch to next available
      if (activeAgent?.id === agentId) {
        const remaining = assignedAgents.filter((a) => a.id !== agentId);
        if (remaining.length > 0) {
          setActiveDocumentAgent(documentId, remaining[0].id);
          setActiveAgent(remaining[0]);
          onAgentChange?.(remaining[0]);
        }
      }
    },
    [documentId, activeAgent, assignedAgents, onAgentChange],
  );

  const unassignedAgents = allAgents.filter(
    (a) => !assignedAgents.find((assigned) => assigned.id === a.id),
  );

  if (!activeAgent) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-2 py-1 transition-colors hover:bg-neutral-50"
      >
        <AgentAvatar
          name={activeAgent.name}
          avatar={activeAgent.avatar}
          color={activeAgent.color}
          status={activeAgent.status}
          size="sm"
        />
        <span className="text-xs font-medium text-neutral-700">
          {activeAgent.name}
        </span>
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Agent count badge */}
      {assignedAgents.length > 1 && (
        <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 text-[9px] font-bold text-white">
          {assignedAgents.length}
        </div>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
          >
            {/* Assigned agents */}
            {assignedAgents.length > 0 && (
              <>
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Active in document
                  </p>
                </div>
                {assignedAgents.map((agent) => (
                  <button
                    key={agent.id}
                    onClick={() => handleSelect(agent)}
                    className={`flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-neutral-50 ${
                      activeAgent.id === agent.id ? "bg-purple-50" : ""
                    }`}
                  >
                    <AgentAvatar
                      name={agent.name}
                      avatar={agent.avatar}
                      color={agent.color}
                      status={agent.status}
                      size="sm"
                    />
                    <span className="flex-1 truncate text-xs font-medium text-neutral-700">
                      {agent.name}
                    </span>
                    {activeAgent.id === agent.id && (
                      <Check className="h-3.5 w-3.5 text-purple-500" />
                    )}
                    {assignedAgents.length > 1 && (
                      <button
                        onClick={(e) => handleRemove(agent.id, e)}
                        className="rounded p-0.5 text-neutral-300 hover:bg-red-50 hover:text-red-400"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    )}
                  </button>
                ))}
                <div className="my-1 border-t border-neutral-100" />
              </>
            )}

            {/* Add more agents */}
            {showInvite ? (
              <>
                <div className="px-3 py-1.5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">
                    Available agents
                  </p>
                </div>
                {unassignedAgents.length > 0 ? (
                  unassignedAgents.map((agent) => (
                    <button
                      key={agent.id}
                      onClick={() => {
                        handleSelect(agent);
                        setShowInvite(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-1.5 text-left transition-colors hover:bg-neutral-50"
                    >
                      <AgentAvatar
                        name={agent.name}
                        avatar={agent.avatar}
                        color={agent.color}
                        status={agent.status}
                        size="sm"
                      />
                      <span className="flex-1 truncate text-xs text-neutral-600">
                        {agent.name}
                      </span>
                      <Plus className="h-3 w-3 text-neutral-400" />
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-xs text-neutral-400">
                    All agents already assigned
                  </p>
                )}
                <button
                  onClick={() => setShowInvite(false)}
                  className="flex w-full items-center gap-1.5 px-3 py-1.5 text-xs text-neutral-400 hover:bg-neutral-50"
                >
                  <X className="h-3 w-3" />
                  Cancel
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setShowInvite(true)}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-50"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add Agent to Document
                </button>
                {onOpenSettings && (
                  <button
                    onClick={() => {
                      onOpenSettings();
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-neutral-500 transition-colors hover:bg-neutral-50"
                  >
                    <Settings className="h-3.5 w-3.5" />
                    Agent Settings
                  </button>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Agent Presence Bar (shows all agents in document)                   */
/* ------------------------------------------------------------------ */

interface AgentPresenceBarProps {
  documentId: string;
}

export function AgentPresenceBar({ documentId }: AgentPresenceBarProps) {
  const [agents, setAgents] = useState<Agent[]>([]);

  useEffect(() => {
    setAgents(getDocumentAgents(documentId));
    // Poll for changes
    const interval = setInterval(() => {
      setAgents(getDocumentAgents(documentId));
    }, 5000);
    return () => clearInterval(interval);
  }, [documentId]);

  if (agents.length === 0) return null;

  return (
    <div className="flex items-center -space-x-1.5">
      {agents.map((agent) => (
        <div key={agent.id} className="relative">
          <AgentAvatar
            name={agent.name}
            avatar={agent.avatar}
            color={agent.color}
            status={agent.status}
            size="sm"
          />
        </div>
      ))}
      {agents.length > 3 && (
        <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[9px] font-bold text-neutral-600">
          +{agents.length - 3}
        </div>
      )}
    </div>
  );
}
