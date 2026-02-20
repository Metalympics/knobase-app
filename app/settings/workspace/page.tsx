"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Users,
  Settings,
  BarChart3,
  Trash2,
  Download,
  Palette,
} from "lucide-react";
import {
  getOrCreateDefaultWorkspace,
  updateWorkspace,
  deleteWorkspace,
  getWorkspace,
} from "@/lib/workspaces/store";
import type { Workspace } from "@/lib/workspaces/types";
import { WorkspaceMembers } from "@/components/settings/workspace-members";
import { WorkspaceAnalytics } from "@/components/settings/workspace-analytics";

type Tab = "general" | "members" | "analytics";

const WORKSPACE_COLORS = [
  "#8B5CF6",
  "#3B82F6",
  "#10B981",
  "#F59E0B",
  "#EF4444",
  "#EC4899",
  "#06B6D4",
  "#6366F1",
];

const WORKSPACE_ICONS = [
  "📚",
  "🏢",
  "🚀",
  "💡",
  "🔬",
  "📐",
  "🎨",
  "📝",
  "🧪",
  "⚡",
];

export default function WorkspaceSettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [workspace, setWorkspace] = useState<Workspace | null>(() => {
    if (typeof window === "undefined") return null;
    return getOrCreateDefaultWorkspace();
  });
  const [name, setName] = useState(() => {
    if (typeof window === "undefined") return "";
    return getOrCreateDefaultWorkspace().name;
  });
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const refresh = useCallback(() => {
    if (!workspace) return;
    const ws = getWorkspace(workspace.id);
    if (ws) setWorkspace(ws);
  }, [workspace]);

  const handleSave = useCallback(() => {
    if (!workspace || !name.trim()) return;
    updateWorkspace(workspace.id, { name: name.trim() });
    refresh();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [workspace, name, refresh]);

  const handleColorChange = useCallback(
    (color: string) => {
      if (!workspace) return;
      updateWorkspace(workspace.id, { color });
      refresh();
    },
    [workspace, refresh]
  );

  const handleIconChange = useCallback(
    (icon: string) => {
      if (!workspace) return;
      updateWorkspace(workspace.id, { icon });
      refresh();
    },
    [workspace, refresh]
  );

  const handleToggleSetting = useCallback(
    (key: "isPublic" | "allowGuests") => {
      if (!workspace) return;
      updateWorkspace(workspace.id, {
        settings: { ...workspace.settings, [key]: !workspace.settings[key] },
      });
      refresh();
    },
    [workspace, refresh]
  );

  const handleExport = useCallback(() => {
    if (!workspace) return;
    const data = JSON.stringify(workspace, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${workspace.slug}-workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [workspace]);

  const handleDelete = useCallback(() => {
    if (!workspace) return;
    deleteWorkspace(workspace.id);
    router.push("/workspaces");
  }, [workspace, router]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ];

  if (!workspace) return null;

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-4">
          <button
            onClick={() => router.push("/knowledge")}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold text-neutral-900">
            Workspace Settings
          </h1>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-purple-50 font-medium text-purple-700"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8">
          <AnimatePresence mode="wait">
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    General
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Customize your workspace appearance and settings
                  </p>
                </div>

                {/* Name */}
                <div className="rounded-lg border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <h3 className="text-sm font-medium text-neutral-800">
                      Workspace Name
                    </h3>
                  </div>
                  <div className="flex gap-2 px-4 py-4">
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-9 flex-1 rounded-md border border-neutral-200 px-3 text-sm outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                      }}
                    />
                    <button
                      onClick={handleSave}
                      className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                    >
                      {saved ? "Saved!" : "Save"}
                    </button>
                  </div>
                </div>

                {/* Icon & Color */}
                <div className="rounded-lg border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Palette className="h-4 w-4 text-neutral-400" />
                      <h3 className="text-sm font-medium text-neutral-800">
                        Appearance
                      </h3>
                    </div>
                  </div>
                  <div className="space-y-4 px-4 py-4">
                    <div>
                      <label className="mb-2 block text-xs font-medium text-neutral-500">
                        Icon
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WORKSPACE_ICONS.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => handleIconChange(icon)}
                            className={`flex h-8 w-8 items-center justify-center rounded-lg text-base transition-all ${
                              workspace.icon === icon
                                ? "bg-purple-100 ring-1 ring-purple-300"
                                : "bg-neutral-50 hover:bg-neutral-100"
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-xs font-medium text-neutral-500">
                        Color
                      </label>
                      <div className="flex gap-2">
                        {WORKSPACE_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorChange(color)}
                            className={`h-7 w-7 rounded-full transition-transform ${
                              workspace.color === color
                                ? "scale-110 ring-2 ring-offset-2"
                                : "hover:scale-105"
                            }`}
                            style={{
                              backgroundColor: color,
                              ...(workspace.color === color
                                ? { ringColor: color }
                                : {}),
                            }}
                            aria-label={`Set color to ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Settings toggles */}
                <div className="rounded-lg border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-4 py-3">
                    <h3 className="text-sm font-medium text-neutral-800">
                      Workspace Options
                    </h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    <label className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm text-neutral-700">
                          Public Workspace
                        </p>
                        <p className="text-xs text-neutral-400">
                          Anyone can discover and view this workspace
                        </p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={workspace.settings.isPublic}
                        onClick={() => handleToggleSetting("isPublic")}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          workspace.settings.isPublic
                            ? "bg-purple-500"
                            : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            workspace.settings.isPublic
                              ? "translate-x-4"
                              : ""
                          }`}
                        />
                      </button>
                    </label>
                    <label className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm text-neutral-700">
                          Allow Guests
                        </p>
                        <p className="text-xs text-neutral-400">
                          Enable time-limited guest access tokens
                        </p>
                      </div>
                      <button
                        role="switch"
                        aria-checked={workspace.settings.allowGuests}
                        onClick={() => handleToggleSetting("allowGuests")}
                        className={`relative h-5 w-9 rounded-full transition-colors ${
                          workspace.settings.allowGuests
                            ? "bg-purple-500"
                            : "bg-neutral-300"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                            workspace.settings.allowGuests
                              ? "translate-x-4"
                              : ""
                          }`}
                        />
                      </button>
                    </label>
                  </div>
                </div>

                {/* Export & Delete */}
                <div className="space-y-3">
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
                  >
                    <Download className="h-4 w-4" />
                    Export Workspace Data
                  </button>

                  <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                    <h3 className="text-sm font-medium text-red-700">
                      Danger Zone
                    </h3>
                    <p className="mt-1 text-xs text-red-500">
                      Permanently delete this workspace and all its data.
                    </p>
                    {confirmDelete ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleDelete}
                          className="rounded-md bg-red-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                        >
                          Yes, Delete Workspace
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="rounded-md px-4 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-neutral-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="mt-3 flex items-center gap-1.5 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete Workspace
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Members
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Manage workspace members and their roles
                  </p>
                </div>
                <WorkspaceMembers
                  workspaceId={workspace.id}
                  onUpdate={refresh}
                />
              </motion.div>
            )}

            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">
                    Analytics
                  </h2>
                  <p className="mt-1 text-sm text-neutral-500">
                    Workspace activity and usage statistics
                  </p>
                </div>
                <WorkspaceAnalytics workspaceId={workspace.id} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
