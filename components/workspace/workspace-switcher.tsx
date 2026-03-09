"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Plus, Settings, Check, Users } from "lucide-react";
import {
  listWorkspaces,
  getActiveWorkspaceId,
  setActiveWorkspaceId,
} from "@/lib/workspaces/store";
import type { Workspace } from "@/lib/workspaces/types";

interface WorkspaceSwitcherProps {
  currentWorkspace: Workspace;
  onSwitch?: (workspace: Workspace) => void;
}

export function WorkspaceSwitcher({
  currentWorkspace,
  onSwitch,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setWorkspaces(listWorkspaces());
  }, []);

  const refreshWorkspaces = useCallback(() => {
    setWorkspaces(listWorkspaces());
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleSwitch = useCallback(
    (ws: Workspace) => {
      setActiveWorkspaceId(ws.id);
      setOpen(false);
      onSwitch?.(ws);
    },
    [onSwitch],
  );

  const COLORS = [
    "bg-violet-500",
    "bg-blue-500",
    "bg-emerald-500",
    "bg-amber-500",
    "bg-rose-500",
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-neutral-100"
        aria-label="Switch workspace"
        aria-expanded={open}
      >
        <div
          className={`flex h-6 w-6 items-center justify-center rounded text-[11px] font-bold text-white ${
            currentWorkspace.color
              ? ""
              : COLORS[currentWorkspace.name.charCodeAt(0) % COLORS.length]
          }`}
          style={
            currentWorkspace.color
              ? { backgroundColor: currentWorkspace.color }
              : undefined
          }
        >
          {currentWorkspace.icon ??
            currentWorkspace.name.charAt(0).toUpperCase()}
        </div>
        <span className="max-w-[120px] truncate text-sm font-semibold text-neutral-900">
          {currentWorkspace.name}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1 w-64 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
          >
            <div className="px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Workspaces
              </p>
            </div>

            <div className="max-h-56 overflow-y-auto">
              {workspaces.map((ws, i) => (
                <button
                  key={ws.id}
                  onClick={() => handleSwitch(ws)}
                  className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-neutral-50"
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold text-white ${
                      ws.color ? "" : COLORS[i % COLORS.length]
                    }`}
                    style={ws.color ? { backgroundColor: ws.color } : undefined}
                  >
                    {ws.icon ?? ws.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-neutral-800">
                      {ws.name}
                    </p>
                    <p className="flex items-center gap-1 text-[11px] text-neutral-400">
                      <Users className="h-2.5 w-2.5" />
                      {ws.members.length}
                    </p>
                  </div>
                  {ws.id === currentWorkspace.id && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-neutral-100 px-1 py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/settings/workspace");
                }}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-700"
              >
                <Settings className="h-3.5 w-3.5" />
                Workspace Settings
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
