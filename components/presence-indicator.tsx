"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface CursorPosition {
  x: number;
  y: number;
}

interface PresenceUser {
  id: string;
  name: string;
  avatar?: string;
  isTyping?: boolean;
  cursorPosition?: CursorPosition;
}

interface PresenceIndicatorProps {
  users: PresenceUser[];
  currentUserId: string;
  maxAvatars?: number;
  className?: string;
}

const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-emerald-500",
  "bg-cyan-500",
  "bg-fuchsia-500",
  "bg-orange-500",
];

const CURSOR_COLORS = [
  "#3b82f6",
  "#8b5cf6",
  "#f59e0b",
  "#f43f5e",
  "#10b981",
  "#06b6d4",
  "#d946ef",
  "#f97316",
];

function getColorIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % AVATAR_COLORS.length;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function UserAvatar({
  user,
  size = "sm",
  showStatus = false,
}: {
  user: PresenceUser;
  size?: "sm" | "md";
  showStatus?: boolean;
}) {
  const colorIndex = getColorIndex(user.id);
  const sizeClasses = size === "sm" ? "h-7 w-7 text-[10px]" : "h-8 w-8 text-xs";

  return (
    <div className="relative">
      {user.avatar ? (
        <img
          src={user.avatar}
          alt={user.name}
          className={cn(
            "rounded-full border-2 border-white object-cover",
            sizeClasses,
          )}
        />
      ) : (
        <div
          className={cn(
            "flex items-center justify-center rounded-full border-2 border-white font-medium text-white",
            sizeClasses,
            AVATAR_COLORS[colorIndex],
          )}
        >
          {getInitials(user.name)}
        </div>
      )}
      {showStatus && (
        <span className="absolute -bottom-0.5 -right-0.5 block h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
      )}
    </div>
  );
}

function TypingIndicator({ userName }: { userName: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="flex items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span className="font-medium text-foreground">{userName}</span>
      <span>is typing</span>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            className="block h-1 w-1 rounded-full bg-muted-foreground/60"
            animate={{ y: [0, -3, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.15,
              ease: "easeInOut",
            }}
          />
        ))}
      </span>
    </motion.div>
  );
}

function CursorOverlay({
  user,
}: {
  user: PresenceUser;
}) {
  if (!user.cursorPosition) return null;

  const colorIndex = getColorIndex(user.id);
  const color = CURSOR_COLORS[colorIndex];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="pointer-events-none absolute z-40"
      style={{
        left: user.cursorPosition.x,
        top: user.cursorPosition.y,
      }}
    >
      <svg
        width="16"
        height="20"
        viewBox="0 0 16 20"
        fill="none"
        className="drop-shadow-sm"
      >
        <path
          d="M0.5 0.5L15.5 11.5H7L3.5 19.5L0.5 0.5Z"
          fill={color}
          stroke="white"
          strokeWidth="1"
        />
      </svg>
      <div
        className="ml-3 -mt-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-[10px] font-medium text-white shadow-sm"
        style={{ backgroundColor: color }}
      >
        {user.name}
      </div>
    </motion.div>
  );
}

export function PresenceIndicator({
  users,
  currentUserId,
  maxAvatars = 3,
  className,
}: PresenceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const otherUsers = useMemo(
    () => users.filter((u) => u.id !== currentUserId),
    [users, currentUserId],
  );

  const visibleUsers = otherUsers.slice(0, maxAvatars);
  const overflowCount = Math.max(otherUsers.length - maxAvatars, 0);
  const typingUsers = otherUsers.filter((u) => u.isTyping);
  const usersWithCursor = otherUsers.filter((u) => u.cursorPosition);

  if (otherUsers.length === 0) return null;

  return (
    <>
      {/* Avatar stack + typing indicator */}
      <div className={cn("flex items-center gap-3", className)}>
        {/* Stacked avatars */}
        <div
          className="relative flex items-center"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
        >
          <AnimatePresence mode="popLayout">
            {visibleUsers.map((user, index) => (
              <motion.div
                key={user.id}
                layout
                initial={{ opacity: 0, x: -8, scale: 0.8 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -8, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className={cn(index > 0 && "-ml-2")}
                style={{ zIndex: visibleUsers.length - index }}
              >
                <UserAvatar user={user} showStatus />
              </motion.div>
            ))}

            {overflowCount > 0 && (
              <motion.div
                key="overflow"
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="-ml-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-neutral-200 text-[10px] font-semibold text-neutral-600"
                style={{ zIndex: 0 }}
              >
                +{overflowCount}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Full user list tooltip */}
          <AnimatePresence>
            {showTooltip && (
              <motion.div
                initial={{ opacity: 0, y: 4, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 4, scale: 0.95 }}
                transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
                className="absolute left-0 top-full z-50 mt-2 min-w-[180px] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1.5 shadow-lg"
              >
                <div className="px-2 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  Viewing now
                </div>
                {otherUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-2.5 rounded-lg px-2 py-1.5"
                  >
                    <UserAvatar user={user} size="sm" showStatus />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-neutral-900">
                        {user.name}
                      </div>
                      {user.isTyping && (
                        <div className="text-[10px] text-emerald-600">
                          Typing...
                        </div>
                      )}
                    </div>
                    <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" />
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Typing indicator */}
        <AnimatePresence mode="wait">
          {typingUsers.length === 1 && (
            <TypingIndicator
              key={typingUsers[0].id}
              userName={typingUsers[0].name}
            />
          )}
          {typingUsers.length > 1 && (
            <motion.div
              key="multiple-typing"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground"
            >
              <span className="font-medium text-foreground">
                {typingUsers.length} people
              </span>
              <span>are typing</span>
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="block h-1 w-1 rounded-full bg-muted-foreground/60"
                    animate={{ y: [0, -3, 0] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      delay: i * 0.15,
                      ease: "easeInOut",
                    }}
                  />
                ))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cursor overlays rendered in document space */}
      <AnimatePresence>
        {usersWithCursor.map((user) => (
          <CursorOverlay key={user.id} user={user} />
        ))}
      </AnimatePresence>
    </>
  );
}
