"use client";

import { motion } from "framer-motion";
import type { AgentStatus } from "@/lib/agents/types";

interface AgentAvatarProps {
  name: string;
  avatar: string;
  color: string;
  status: AgentStatus;
  size?: "sm" | "md" | "lg";
}

const sizes = {
  sm: { container: "h-6 w-6", text: "text-xs", dot: "h-2 w-2 -bottom-0.5 -right-0.5" },
  md: { container: "h-8 w-8", text: "text-sm", dot: "h-2.5 w-2.5 -bottom-0.5 -right-0.5" },
  lg: { container: "h-10 w-10", text: "text-base", dot: "h-3 w-3 bottom-0 right-0" },
};

const statusColors: Record<AgentStatus, string> = {
  online: "bg-emerald-400",
  offline: "bg-neutral-300",
  typing: "bg-purple-400",
  thinking: "bg-amber-400",
};

export function AgentAvatar({ name, avatar, color, status, size = "md" }: AgentAvatarProps) {
  const s = sizes[size];

  return (
    <div className="relative inline-flex" title={`${name} (${status})`}>
      <div
        className={`${s.container} flex items-center justify-center rounded-full border-2 border-white shadow-sm`}
        style={{ backgroundColor: color }}
      >
        <span className={s.text}>{avatar}</span>
      </div>
      <motion.div
        className={`absolute ${s.dot} rounded-full border border-white ${statusColors[status]}`}
        animate={
          status === "typing" || status === "thinking"
            ? { scale: [1, 1.3, 1], opacity: [1, 0.7, 1] }
            : {}
        }
        transition={
          status === "typing" || status === "thinking"
            ? { duration: 1.2, repeat: Infinity }
            : {}
        }
      />
    </div>
  );
}
