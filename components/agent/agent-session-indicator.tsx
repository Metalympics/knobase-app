"use client";

import { motion } from "framer-motion";
import { MapPin, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useDocumentSessions } from "@/hooks/use-agent-sessions";
import type { AgentSession } from "@/lib/supabase/types";

/* ------------------------------------------------------------------ */
/* Status dot colours                                                  */
/* ------------------------------------------------------------------ */

const statusDot: Record<string, string> = {
  active: "bg-emerald-400",
  editing: "bg-blue-500",
  reviewing: "bg-amber-400",
  idle: "bg-neutral-300",
};

/* ------------------------------------------------------------------ */
/* Single session pill                                                 */
/* ------------------------------------------------------------------ */

function SessionPill({
  session,
  userId,
  onFollow,
  onNavigate,
}: {
  session: AgentSession;
  userId?: string;
  onFollow?: (sessionId: string, userId: string) => void;
  onNavigate?: (documentId: string, blockId?: string) => void;
}) {
  const isFollowing = userId
    ? (session.followed_by as string[] | null)?.includes(userId) ?? false
    : false;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="flex items-center gap-2 rounded-full border border-neutral-200 bg-white px-2.5 py-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-800"
    >
      {/* Status indicator */}
      <span className="relative flex size-2.5">
        <span
          className={`absolute inline-flex size-full rounded-full opacity-75 ${
            session.status === "editing" || session.status === "thinking"
              ? "animate-ping"
              : ""
          } ${statusDot[session.status] ?? statusDot.idle}`}
        />
        <span
          className={`relative inline-flex size-2.5 rounded-full ${
            statusDot[session.status] ?? statusDot.idle
          }`}
        />
      </span>

      {/* Agent name + location */}
      <button
        className="flex items-center gap-1 text-xs font-medium text-neutral-700 hover:text-neutral-900 dark:text-neutral-300 dark:hover:text-neutral-100"
        onClick={() =>
          onNavigate?.(session.document_id!, session.current_block_id ?? undefined)
        }
        title={`Go to ${session.agent_name}'s position`}
      >
        <span>{session.agent_name}</span>
        {session.current_section && (
          <>
            <MapPin className="size-3 text-neutral-400" />
            <span className="max-w-[100px] truncate text-neutral-500 dark:text-neutral-400">
              {session.current_section}
            </span>
          </>
        )}
      </button>

      {/* Follow / Unfollow */}
      {userId && onFollow && (
        <Button
          variant="ghost"
          size="icon-xs"
          className={isFollowing ? "text-blue-500" : "text-neutral-400"}
          onClick={() => onFollow(session.id, userId)}
          title={isFollowing ? "Unfollow agent" : "Follow agent"}
        >
          {isFollowing ? (
            <Eye className="size-3" />
          ) : (
            <EyeOff className="size-3" />
          )}
        </Button>
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* AgentSessionIndicator — main export                                 */
/* ------------------------------------------------------------------ */

interface AgentSessionIndicatorProps {
  documentId: string;
  userId?: string;
  onNavigate?: (documentId: string, blockId?: string) => void;
  className?: string;
}

export function AgentSessionIndicator({
  documentId,
  userId,
  onNavigate,
  className,
}: AgentSessionIndicatorProps) {
  const { activeSessions, follow } = useDocumentSessions(documentId);

  if (activeSessions.length === 0) return null;

  return (
    <div
      className={`flex flex-wrap items-center gap-1.5 ${className ?? ""}`}
    >
      {activeSessions.map((session) => (
        <SessionPill
          key={session.id}
          session={session}
          userId={userId}
          onFollow={follow}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}
