"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus,
  Users,
  ArrowRight,
  LogIn,
  Trash2,
  LogOut,
  Copy,
  Check,
} from "lucide-react";
import {
  listWorkspaces,
  createWorkspace,
  joinWorkspaceByCode,
  deleteWorkspace,
  leaveWorkspace,
  setActiveWorkspaceId,
  getCurrentUserId,
} from "@/lib/workspaces/store";
import type { Workspace } from "@/lib/workspaces/types";

export default function WorkspacesPage() {
  const router = useRouter();
  const [workspaces, setWorkspaces] = useState<Workspace[]>(listWorkspaces);
  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);
  const [newName, setNewName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const userId = getCurrentUserId();

  const refresh = useCallback(() => setWorkspaces(listWorkspaces()), []);

  const handleCreate = useCallback(() => {
    if (!newName.trim()) return;
    createWorkspace(newName.trim());
    setNewName("");
    setShowCreate(false);
    refresh();
  }, [newName, refresh]);

  const handleJoin = useCallback(() => {
    if (!joinCode.trim()) return;
    const ws = joinWorkspaceByCode(joinCode.trim());
    if (!ws) {
      setJoinError("Invalid invite code");
      return;
    }
    setJoinCode("");
    setJoinError("");
    setShowJoin(false);
    refresh();
  }, [joinCode, refresh]);

  const handleSelect = useCallback(
    (ws: Workspace) => {
      setActiveWorkspaceId(ws.id);
      router.push("/knowledge");
    },
    [router]
  );

  const handleDelete = useCallback(
    (id: string) => {
      deleteWorkspace(id);
      refresh();
    },
    [refresh]
  );

  const handleLeave = useCallback(
    (id: string) => {
      leaveWorkspace(id);
      refresh();
    },
    [refresh]
  );

  const handleCopyCode = useCallback((code: string, wsId: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(wsId);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const WORKSPACE_COLORS = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
    "bg-cyan-500",
  ];

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#fafafa] p-4">
      <div className="w-full max-w-xl">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-neutral-900">Workspaces</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Switch between workspaces or create a new one
          </p>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {workspaces.map((ws, i) => (
              <motion.div
                key={ws.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: i * 0.05 }}
                className="group flex items-center gap-4 rounded-xl border border-neutral-200 bg-white p-4 transition-shadow hover:shadow-sm"
              >
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm font-bold text-white ${
                    WORKSPACE_COLORS[i % WORKSPACE_COLORS.length]
                  }`}
                >
                  {ws.icon ?? ws.name.charAt(0).toUpperCase()}
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-neutral-900">
                    {ws.name}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {ws.members.length}{" "}
                      {ws.members.length === 1 ? "member" : "members"}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyCode(ws.inviteCode, ws.id);
                      }}
                      className="flex items-center gap-1 transition-colors hover:text-neutral-600"
                      title="Copy invite code"
                    >
                      {copiedId === ws.id ? (
                        <Check className="h-3 w-3 text-emerald-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      {ws.inviteCode}
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  {ws.ownerId === userId ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ws.id);
                      }}
                      className="rounded-md p-1.5 text-neutral-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                      aria-label="Delete workspace"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleLeave(ws.id);
                      }}
                      className="rounded-md p-1.5 text-neutral-300 opacity-0 transition-all hover:bg-amber-50 hover:text-amber-500 group-hover:opacity-100"
                      aria-label="Leave workspace"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleSelect(ws)}
                    className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
                    aria-label="Open workspace"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() => {
              setShowCreate(true);
              setShowJoin(false);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-white hover:text-neutral-700"
          >
            <Plus className="h-4 w-4" />
            New Workspace
          </button>
          <button
            onClick={() => {
              setShowJoin(true);
              setShowCreate(false);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-dashed border-neutral-300 py-3 text-sm font-medium text-neutral-500 transition-colors hover:border-neutral-400 hover:bg-white hover:text-neutral-700"
          >
            <LogIn className="h-4 w-4" />
            Join by Code
          </button>
        </div>

        <AnimatePresence>
          {showCreate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Create Workspace
                </h3>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Workspace name"
                  className="mt-3 h-9 w-full rounded-md border border-neutral-200 px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreate();
                    if (e.key === "Escape") setShowCreate(false);
                  }}
                />
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleCreate}
                    className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    Create
                  </button>
                  <button
                    onClick={() => setShowCreate(false)}
                    className="rounded-md px-4 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {showJoin && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-4">
                <h3 className="text-sm font-semibold text-neutral-900">
                  Join Workspace
                </h3>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => {
                    setJoinCode(e.target.value);
                    setJoinError("");
                  }}
                  placeholder="Enter invite code"
                  className="mt-3 h-9 w-full rounded-md border border-neutral-200 px-3 font-mono text-sm uppercase tracking-wider outline-none placeholder:font-sans placeholder:normal-case placeholder:tracking-normal placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJoin();
                    if (e.key === "Escape") setShowJoin(false);
                  }}
                />
                {joinError && (
                  <p className="mt-1.5 text-xs text-red-500">{joinError}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={handleJoin}
                    className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    Join
                  </button>
                  <button
                    onClick={() => setShowJoin(false)}
                    className="rounded-md px-4 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-6 text-center">
          <button
            onClick={() => router.push("/knowledge")}
            className="text-xs text-neutral-400 transition-colors hover:text-neutral-600"
          >
            Back to Knowledge Base
          </button>
        </div>
      </div>
    </div>
  );
}
