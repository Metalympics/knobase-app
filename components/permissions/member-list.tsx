"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Pencil,
  Eye,
  UserMinus,
  ChevronDown,
  Crown,
} from "lucide-react";
import type { SchoolWithMembers, WorkspaceRole } from "@/lib/schools/types";
import {
  removeMember,
  changeMemberRole,
  getCurrentUserId,
  getWorkspace,
} from "@/lib/schools/store";
import { canManageMembers, ROLE_LABELS, ROLE_DESCRIPTIONS } from "@/lib/permissions/acl";

interface MemberListProps {
  workspaceId: string;
  onUpdate?: () => void;
}

const ROLE_ICONS: Record<WorkspaceRole, React.ReactNode> = {
  admin: <Crown className="h-3 w-3" />,
  editor: <Pencil className="h-3 w-3" />,
  viewer: <Eye className="h-3 w-3" />,
};

const ROLE_COLORS: Record<WorkspaceRole, string> = {
  admin: "bg-purple-100 text-purple-700",
  editor: "bg-blue-100 text-blue-700",
  viewer: "bg-neutral-100 text-neutral-600",
};

export function MemberList({ workspaceId, onUpdate }: MemberListProps) {
  const [ws, setWs] = useState<SchoolWithMembers | null>(() =>
    getWorkspace(workspaceId) as SchoolWithMembers | null
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const userId = getCurrentUserId();
  const isAdmin = canManageMembers(workspaceId);

  const refresh = useCallback(() => {
    setWs(getWorkspace(workspaceId) as SchoolWithMembers | null);
    onUpdate?.();
  }, [workspaceId, onUpdate]);

  const handleRemove = useCallback(
    (memberId: string) => {
      removeMember(workspaceId, memberId);
      refresh();
    },
    [workspaceId, refresh]
  );

  const handleChangeRole = useCallback(
    (memberId: string, role: WorkspaceRole) => {
      changeMemberRole(workspaceId, memberId, role);
      setEditingUserId(null);
      refresh();
    },
    [workspaceId, refresh]
  );

  if (!ws) return null;

  return (
    <div className="space-y-1">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-xs font-medium uppercase tracking-wider text-neutral-400">
          Members ({ws.members?.length ?? 0})
        </h3>
      </div>

      {(ws.members ?? []).map((member) => {
        const displayName = member.user?.displayName ?? member.userId;
        return (
        <div
          key={member.userId}
          className="group flex items-center gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-neutral-50"
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-medium text-neutral-600">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-neutral-800">
              {displayName}
              {member.userId === userId && (
                <span className="ml-1.5 text-[10px] text-neutral-400">
                  (you)
                </span>
              )}
            </p>
            <p className="text-[11px] text-neutral-400">
              Joined{" "}
              {new Date(member.joinedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>
          </div>

          <div className="relative">
            {isAdmin && member.userId !== ws.ownerId ? (
              <button
                onClick={() =>
                  setEditingUserId(
                    editingUserId === member.userId ? null : member.userId
                  )
                }
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium transition-colors ${
                  ROLE_COLORS[member.role]
                }`}
                aria-label={`Change role for ${displayName}`}
              >
                {ROLE_ICONS[member.role]}
                {ROLE_LABELS[member.role]}
                <ChevronDown className="h-2.5 w-2.5" />
              </button>
            ) : (
              <span
                className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ${
                  ROLE_COLORS[member.role]
                }`}
              >
                {ROLE_ICONS[member.role]}
                {ROLE_LABELS[member.role]}
                {member.userId === ws.ownerId && (
                  <span className="text-[9px] opacity-60">Owner</span>
                )}
              </span>
            )}

            <AnimatePresence>
              {editingUserId === member.userId && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-0 top-full z-10 mt-1 w-44 rounded-lg border border-neutral-200 bg-white py-1 shadow-lg"
                >
                  {(["admin", "editor", "viewer"] as WorkspaceRole[]).map(
                    (role) => (
                      <button
                        key={role}
                        onClick={() => handleChangeRole(member.userId, role)}
                        className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-neutral-50 ${
                          member.role === role
                            ? "font-medium text-purple-700"
                            : "text-neutral-600"
                        }`}
                      >
                        {ROLE_ICONS[role]}
                        <div>
                          <p className="font-medium">{ROLE_LABELS[role]}</p>
                          <p className="text-[10px] text-neutral-400">
                            {ROLE_DESCRIPTIONS[role]}
                          </p>
                        </div>
                      </button>
                    )
                  )}
                  <div className="my-1 border-t border-neutral-100" />
                  <button
                    onClick={() => handleRemove(member.userId)}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-500 transition-colors hover:bg-red-50"
                  >
                    <UserMinus className="h-3 w-3" />
                    Remove from workspace
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
        );
      })}
    </div>
  );
}
