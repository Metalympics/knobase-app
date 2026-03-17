"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Editor } from "@tiptap/react";
import { Sparkles, Wifi, WifiOff } from "lucide-react";
import { AgentAvatar } from "@/components/agent/agent-avatar";
import { AgentSuggestionPanel } from "@/components/agent/agent-suggestion";
import { OpenClawStatusBadge } from "@/components/openclaw/status-badge";
import { getDefaultAgent, updateAgent } from "@/lib/agents/store";
import { pushFullContextToOpenClaw } from "@/lib/sync/context-sync";
import type { Agent, AgentSuggestion, AgentStatus } from "@/lib/agents/types";
import type { OpenClawConnectionStatus } from "@/lib/sync/openclaw-bridge";

interface AiAgentProps {
  editor: Editor | null;
  documentId?: string;
  documentContent?: string;
  openClawStatus?: OpenClawConnectionStatus;
}

export function AiAgent({ editor, documentId, documentContent, openClawStatus = "disconnected" }: AiAgentProps) {
  const [agent, setAgent] = useState<Agent | null>(null);
  const [activeSuggestion, setActiveSuggestion] = useState<AgentSuggestion | null>(null);
  const [agentStatus, setAgentStatus] = useState<AgentStatus>("online");
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [showCursor, setShowCursor] = useState(false);
  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 });
  const cursorTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setAgent(getDefaultAgent());
  }, []);

  const updateAgentStatus = useCallback(
    (status: AgentStatus) => {
      setAgentStatus(status);
      if (agent) {
        updateAgent(agent.id, { status });
      }
    },
    [agent]
  );

  const showAgentCursor = useCallback(
    (durationMs = 3000) => {
      if (!editor) return;
      try {
        const { from } = editor.state.selection;
        const coords = editor.view.coordsAtPos(from);
        setCursorPos({ x: coords.left, y: coords.top });
        setShowCursor(true);
        if (cursorTimeoutRef.current) clearTimeout(cursorTimeoutRef.current);
        cursorTimeoutRef.current = setTimeout(() => setShowCursor(false), durationMs);
      } catch {
        // coords may not be available
      }
    },
    [editor]
  );

  const handleAgentTyping = useCallback(() => {
    updateAgentStatus("typing");
    showAgentCursor(30000);
  }, [updateAgentStatus, showAgentCursor]);

  const handleAgentDone = useCallback(() => {
    updateAgentStatus("online");
    setShowCursor(false);
  }, [updateAgentStatus]);

  const handleSuggestion = useCallback((suggestion: AgentSuggestion) => {
    setActiveSuggestion(suggestion);
  }, []);

  const handleAcceptSuggestion = useCallback(() => {
    if (!activeSuggestion || !editor) return;
    editor.commands.setContent(activeSuggestion.suggestedContent);
    setActiveSuggestion(null);
  }, [activeSuggestion, editor]);

  const handleRejectSuggestion = useCallback(() => {
    setActiveSuggestion(null);
  }, []);

  if (!agent) return null;

  return (
    <>
      {/* Floating agent cursor in the editor */}
      <AnimatePresence>
        {showCursor && (
          <motion.div
            className="pointer-events-none fixed z-50"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1, x: cursorPos.x, y: cursorPos.y }}
            exit={{ opacity: 0, scale: 0.5 }}
            transition={{ type: "spring", stiffness: 200, damping: 25, mass: 0.5 }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none" className="drop-shadow-md">
              <path d="M0 0L12 10L6 11L9 19L6.5 20L3.5 12L0 15V0Z" fill={agent.color} />
            </svg>
            <motion.div
              className="mt-0.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[10px] font-medium text-white shadow-md"
              style={{ backgroundColor: agent.color }}
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              {agent.name}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Typing indicator */}
      <AnimatePresence>
        {agentStatus === "typing" && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-full border border-purple-200 bg-white px-4 py-2 shadow-lg"
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AgentAvatar
              name={agent.name}
              avatar={agent.avatar}
              color={agent.color}
              status="typing"
              size="sm"
            />
            <span className="text-sm font-medium text-neutral-600">
              {agent.name} is typing
            </span>
            <motion.span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="inline-block h-1 w-1 rounded-full bg-purple-400"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </motion.span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thinking indicator */}
      <AnimatePresence>
        {agentStatus === "thinking" && (
          <motion.div
            className="fixed bottom-6 left-1/2 z-50 flex items-center gap-2 rounded-full border border-amber-200 bg-white px-4 py-2 shadow-lg"
            initial={{ opacity: 0, y: 20, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 20, x: "-50%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
          >
            <AgentAvatar
              name={agent.name}
              avatar={agent.avatar}
              color={agent.color}
              status="thinking"
              size="sm"
            />
            <span className="text-sm font-medium text-neutral-600">
              {agent.name} is thinking
            </span>
            <Sparkles className="h-3.5 w-3.5 animate-pulse text-amber-500" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* OpenClaw sync controls */}
      {openClawStatus === "connected" && (
        <motion.div
          className="fixed bottom-6 right-48 z-40 flex items-center gap-2"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <OpenClawStatusBadge status={openClawStatus} compact />
          {syncEnabled ? (
            <button
              onClick={() => {
                if (documentId) pushFullContextToOpenClaw(documentId);
              }}
              className="flex items-center gap-1.5 rounded-full border border-purple-200 bg-white px-3 py-1 text-[11px] font-medium text-purple-600 shadow-sm transition-colors hover:bg-purple-50"
            >
              <Wifi className="h-3 w-3" />
              Sync to OpenClaw
            </button>
          ) : (
            <button
              onClick={() => setSyncEnabled(true)}
              className="flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-3 py-1 text-[11px] font-medium text-neutral-500 shadow-sm transition-colors hover:border-purple-200 hover:text-purple-600"
            >
              <WifiOff className="h-3 w-3" />
              Enable Sync
            </button>
          )}
        </motion.div>
      )}

      {/* Suggestion diff panel */}
      <AnimatePresence>
        {activeSuggestion && (
          <AgentSuggestionPanel
            suggestion={activeSuggestion}
            agentName={agent.name}
            agentColor={agent.color}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
          />
        )}
      </AnimatePresence>
    </>
  );
}
