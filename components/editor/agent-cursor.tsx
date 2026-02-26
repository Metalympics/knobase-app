"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Navigation, Eye } from "lucide-react";
import type { Editor } from "@tiptap/react";
import {
  useAgentAwareness,
  type AgentPresence,
  type AgentCursorStatus,
} from "@/lib/yjs/agent-awareness";
import type { Awareness } from "y-protocols/awareness";

/* ------------------------------------------------------------------ */
/* Status labels & colors                                              */
/* ------------------------------------------------------------------ */

const STATUS_CONFIG: Record<
  AgentCursorStatus,
  { label: string; animation: string }
> = {
  idle: { label: "Idle", animation: "" },
  reading: { label: "Reading…", animation: "animate-pulse" },
  editing: { label: "Editing…", animation: "" },
  responding: { label: "Responding…", animation: "animate-pulse" },
  thinking: { label: "Thinking…", animation: "animate-bounce" },
};

/* ------------------------------------------------------------------ */
/* Single Agent Cursor                                                 */
/* ------------------------------------------------------------------ */

interface AgentCursorMarkerProps {
  agent: AgentPresence;
  editor: Editor | null;
  onJumpTo?: (agentId: string) => void;
}

function AgentCursorMarker({ agent, editor, onJumpTo }: AgentCursorMarkerProps) {
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [showTooltip, setShowTooltip] = useState(false);

  // Convert document position to screen coordinates
  useEffect(() => {
    if (!editor || !agent.cursor) {
      setPosition(null);
      return;
    }

    const view = editor.view;
    if (!view) return;

    function updatePosition() {
      try {
        const pos = Math.min(agent.cursor!.head, view.state.doc.content.size);
        const coords = view.coordsAtPos(pos);
        const editorRect = view.dom.getBoundingClientRect();

        setPosition({
          top: coords.top - editorRect.top,
          left: coords.left - editorRect.left,
        });
      } catch {
        setPosition(null);
      }
    }

    updatePosition();

    // Re-calculate on scroll and resize
    const observer = new ResizeObserver(updatePosition);
    observer.observe(view.dom);
    view.dom.addEventListener("scroll", updatePosition, { passive: true });

    return () => {
      observer.disconnect();
      view.dom.removeEventListener("scroll", updatePosition);
    };
  }, [editor, agent.cursor]);

  if (!position) return null;

  const status = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="pointer-events-auto absolute z-30"
      style={{ top: position.top, left: position.left }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Cursor line */}
      <div
        className="h-5 w-0.5 rounded-full"
        style={{ backgroundColor: agent.color }}
      />

      {/* Agent label */}
      <div
        className="absolute -top-5 left-0 flex items-center gap-1 whitespace-nowrap rounded-sm px-1.5 py-0.5"
        style={{ backgroundColor: agent.color }}
      >
        <span className="text-[10px]">{agent.avatar}</span>
        <span className="text-[10px] font-medium text-white">
          {agent.name}
        </span>
        {agent.status !== "idle" && (
          <span
            className={`ml-0.5 text-[9px] text-white/80 ${status.animation}`}
          >
            {status.label}
          </span>
        )}
      </div>

      {/* Tooltip with jump action */}
      <AnimatePresence>
        {showTooltip && onJumpTo && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute left-0 top-7 z-40 rounded-md border border-neutral-200 bg-white p-1.5 shadow-md"
          >
            <button
              onClick={() => onJumpTo(agent.id)}
              className="flex items-center gap-1 rounded px-2 py-1 text-[11px] text-neutral-600 transition-colors hover:bg-neutral-50"
            >
              <Navigation className="h-3 w-3" />
              Jump to cursor
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Selection Highlight for Agent                                       */
/* ------------------------------------------------------------------ */

interface AgentSelectionProps {
  agent: AgentPresence;
  editor: Editor | null;
}

function AgentSelection({ agent, editor }: AgentSelectionProps) {
  const [rects, setRects] = useState<DOMRect[]>([]);

  useEffect(() => {
    if (!editor || !agent.cursor) {
      setRects([]);
      return;
    }

    const { anchor, head } = agent.cursor;
    if (anchor === head) {
      setRects([]);
      return;
    }

    try {
      const from = Math.min(anchor, head);
      const to = Math.max(anchor, head);
      const docSize = editor.view.state.doc.content.size;
      const clampedFrom = Math.min(from, docSize);
      const clampedTo = Math.min(to, docSize);

      const domRange = editor.view.domAtPos(clampedFrom);
      const endDom = editor.view.domAtPos(clampedTo);

      if (!domRange || !endDom) {
        setRects([]);
        return;
      }

      const range = document.createRange();
      range.setStart(domRange.node, domRange.offset);
      range.setEnd(endDom.node, endDom.offset);

      const clientRects = Array.from(range.getClientRects());
      const editorRect = editor.view.dom.getBoundingClientRect();

      setRects(
        clientRects.map(
          (r) =>
            new DOMRect(
              r.left - editorRect.left,
              r.top - editorRect.top,
              r.width,
              r.height,
            ),
        ),
      );
    } catch {
      setRects([]);
    }
  }, [editor, agent.cursor]);

  if (rects.length === 0) return null;

  return (
    <>
      {rects.map((rect, i) => (
        <div
          key={i}
          className="pointer-events-none absolute"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            backgroundColor: `${agent.color}20`,
            borderRadius: 2,
          }}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Agent Cursor Overlay                                                */
/* ------------------------------------------------------------------ */

export interface AgentCursorOverlayProps {
  awareness: Awareness | null;
  editor: Editor | null;
}

export function AgentCursorOverlay({
  awareness,
  editor,
}: AgentCursorOverlayProps) {
  const agents = useAgentAwareness(awareness);

  const handleJumpTo = useCallback(
    (agentId: string) => {
      if (!editor) return;
      const agent = agents.find((a) => a.id === agentId);
      if (!agent?.cursor) return;

      const pos = Math.min(agent.cursor.head, editor.state.doc.content.size);
      editor.commands.focus();
      editor.commands.setTextSelection(pos);

      // Scroll the cursor position into view
      const view = editor.view;
      try {
        const coords = view.coordsAtPos(pos);
        view.dom.scrollTo({
          top: coords.top - view.dom.getBoundingClientRect().height / 2,
          behavior: "smooth",
        });
      } catch {
        // position might be out of range
      }
    },
    [editor, agents],
  );

  if (agents.length === 0) return null;

  return (
    <div className="pointer-events-none absolute inset-0">
      <AnimatePresence>
        {agents.map((agent) => (
          <div key={agent.id}>
            <AgentSelection agent={agent} editor={editor} />
            <AgentCursorMarker
              agent={agent}
              editor={editor}
              onJumpTo={handleJumpTo}
            />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Presence-bar integration: agent presence list                       */
/* ------------------------------------------------------------------ */

interface AgentPresenceListProps {
  awareness: Awareness | null;
  onJumpTo?: (agentId: string) => void;
  onFollow?: (agentId: string | null) => void;
  followingId?: string | null;
}

export function AgentPresenceList({
  awareness,
  onJumpTo,
  onFollow,
  followingId,
}: AgentPresenceListProps) {
  const agents = useAgentAwareness(awareness);

  if (agents.length === 0) return null;

  return (
    <div className="flex items-center gap-1">
      <div className="mx-1 h-3 w-px bg-neutral-200" />
      {agents.map((agent) => {
        const isFollowing = followingId === agent.id;
        const statusCfg = STATUS_CONFIG[agent.status] ?? STATUS_CONFIG.idle;

        return (
          <div key={agent.id} className="group relative">
            <button
              onClick={() => onJumpTo?.(agent.id)}
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] transition-transform hover:scale-110"
              style={{
                backgroundColor: agent.color,
                borderColor: isFollowing ? agent.color : "white",
              }}
              title={`${agent.name} · ${statusCfg.label}`}
            >
              {agent.avatar}
            </button>

            {/* Status dot */}
            {agent.status !== "idle" && (
              <div
                className={`absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-white ${
                  agent.status === "editing"
                    ? "bg-emerald-400"
                    : agent.status === "reading"
                      ? "bg-blue-400"
                      : "bg-amber-400"
                } ${statusCfg.animation}`}
              />
            )}

            {/* Hover actions */}
            <div className="pointer-events-none absolute right-0 top-full z-20 mt-1 hidden w-32 rounded-md border border-neutral-200 bg-white py-1 shadow-md group-hover:pointer-events-auto group-hover:block">
              <p className="border-b border-neutral-100 px-2 py-1 text-[10px] font-medium text-neutral-500">
                {agent.name}
              </p>
              <p className="px-2 py-0.5 text-[10px] text-neutral-400">
                {statusCfg.label}
              </p>
              {onJumpTo && (
                <button
                  onClick={() => onJumpTo(agent.id)}
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] text-neutral-600 hover:bg-neutral-50"
                >
                  <Navigation className="h-3 w-3" />
                  Jump to
                </button>
              )}
              {onFollow && (
                <button
                  onClick={() =>
                    onFollow(isFollowing ? null : agent.id)
                  }
                  className="flex w-full items-center gap-1.5 px-2 py-1 text-left text-[11px] text-neutral-600 hover:bg-neutral-50"
                >
                  <Eye className="h-3 w-3" />
                  {isFollowing ? "Stop following" : "Follow"}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
