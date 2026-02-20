"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Navigation } from "lucide-react";

interface Collaborator {
  id: string;
  name: string;
  color: string;
  cursorPosition?: { top: number; left: number };
}

interface FollowCursorProps {
  collaborators: Collaborator[];
  followingId: string | null;
  onFollow: (userId: string | null) => void;
  onJumpTo?: (userId: string) => void;
}

export function FollowCursor({
  collaborators,
  followingId,
  onFollow,
  onJumpTo,
}: FollowCursorProps) {
  const [expanded, setExpanded] = useState(false);
  const isFollowing = followingId !== null;

  const handleFollow = useCallback(
    (userId: string) => {
      if (followingId === userId) {
        onFollow(null);
      } else {
        onFollow(userId);
      }
      setExpanded(false);
    },
    [followingId, onFollow]
  );

  const handleJumpTo = useCallback(
    (userId: string) => {
      onJumpTo?.(userId);
    },
    [onJumpTo]
  );

  if (collaborators.length === 0) return null;

  const followedUser = collaborators.find((c) => c.id === followingId);

  return (
    <div className="relative">
      {isFollowing && followedUser ? (
        <button
          onClick={() => onFollow(null)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors"
          style={{
            backgroundColor: `${followedUser.color}15`,
            color: followedUser.color,
          }}
          aria-label="Stop following"
        >
          <Eye className="h-3 w-3" />
          Following {followedUser.name}
          <EyeOff className="h-3 w-3 opacity-50" />
        </button>
      ) : (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
          aria-label="Follow a collaborator"
        >
          <Eye className="h-3 w-3" />
          Follow
        </button>
      )}

      <AnimatePresence>
        {expanded && !isFollowing && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
          >
            <div className="px-3 py-2">
              <p className="text-[11px] font-medium text-neutral-400">
                Collaborators
              </p>
            </div>
            {collaborators.map((collab) => (
              <div
                key={collab.id}
                className="flex items-center gap-2 px-3 py-2 transition-colors hover:bg-neutral-50"
              >
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold text-white"
                  style={{ backgroundColor: collab.color }}
                >
                  {collab.name.charAt(0).toUpperCase()}
                </div>
                <span className="flex-1 truncate text-xs text-neutral-700">
                  {collab.name}
                </span>
                <div className="flex gap-0.5">
                  <button
                    onClick={() => handleJumpTo(collab.id)}
                    className="rounded p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
                    title={`Jump to ${collab.name}`}
                    aria-label={`Jump to ${collab.name}`}
                  >
                    <Navigation className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => handleFollow(collab.id)}
                    className="rounded p-1 text-neutral-300 transition-colors hover:bg-neutral-100 hover:text-neutral-500"
                    title={`Follow ${collab.name}`}
                    aria-label={`Follow ${collab.name}`}
                  >
                    <Eye className="h-3 w-3" />
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Live scroll sync toggle
interface ScrollSyncProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

export function ScrollSync({ enabled, onToggle }: ScrollSyncProps) {
  return (
    <button
      onClick={() => onToggle(!enabled)}
      className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors ${
        enabled
          ? "bg-purple-50 text-purple-600"
          : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
      }`}
      title={enabled ? "Disable scroll sync" : "Enable scroll sync"}
      aria-label={enabled ? "Disable scroll sync" : "Enable scroll sync"}
    >
      <Navigation className="h-3 w-3" />
      {enabled ? "Synced" : "Sync scroll"}
    </button>
  );
}
