"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  loadSchool,
  updateSchool,
  deleteSchool,
  regenerateSchoolInviteCode,
} from "@/lib/schools/store";
import type { School } from "@/lib/schools/types";
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

function WorkspaceSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [school, setSchool] = useState<School | null>(null);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const schoolId = searchParams.get("id");
    if (!schoolId) {
      router.push("/s/default");
      return;
    }

    loadSchool(schoolId).then((data) => {
      if (data) {
        setSchool(data);
        setName(data.name);
      }
      setLoading(false);
    });
  }, [searchParams, router]);

  const refresh = useCallback(async () => {
    if (!school) return;
    const updated = await loadSchool(school.id);
    if (updated) {
      setSchool(updated);
      setName(updated.name);
    }
  }, [school]);

  const handleSave = useCallback(async () => {
    if (!school || !name.trim()) return;
    const updated = await updateSchool(school.id, { name: name.trim() });
    if (updated) {
      setSchool(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }, [school, name]);

  const handleColorChange = useCallback(
    async (color: string) => {
      if (!school) return;
      const updated = await updateSchool(school.id, { color });
      if (updated) setSchool(updated);
    },
    [school]
  );

  const handleIconChange = useCallback(
    async (icon: string) => {
      if (!school) return;
      const updated = await updateSchool(school.id, { icon });
      if (updated) setSchool(updated);
    },
    [school]
  );

  const handleToggleSetting = useCallback(
    async (key: "isPublic" | "allowGuests") => {
      if (!school) return;
      const updated = await updateSchool(school.id, {
        settings: { ...school.settings, [key]: !school.settings[key] },
      });
      if (updated) setSchool(updated);
    },
    [school]
  );

  const handleExport = useCallback(() => {
    if (!school) return;
    const data = JSON.stringify(school, null, 2);
    const blob = new Blob([data], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${school.slug}-school.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [school]);

  const handleDelete = useCallback(async () => {
    if (!school) return;
    const success = await deleteSchool(school.id);
    if (success) {
      router.push("/s/default");
    }
  }, [school, router]);

  const handleRegenerateCode = useCallback(async () => {
    if (!school) return;
    const newCode = await regenerateSchoolInviteCode(school.id);
    if (newCode) {
      await refresh();
    }
  }, [school, refresh]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    {
      id: "analytics",
      label: "Analytics",
      icon: <BarChart3 className="h-4 w-4" />,
    },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <p className="text-sm text-neutral-500">Loading...</p>
      </div>
    );
  }

  if (!school) return null;

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-4">
          <button
            onClick={() => router.push("/s/default")}
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
                                              school.icon === icon
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
                                              school.color === color
                                                ? "scale-110 ring-2 ring-offset-2"
                                                : "hover:scale-105"
                                            }`}
                                            style={{
                                              backgroundColor: color,
                                              ...(school.color === color
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
                                        aria-checked={school.settings.isPublic}
                                        onClick={() => handleToggleSetting("isPublic")}
                                        className={`relative h-5 w-9 rounded-full transition-colors ${
                                          school.settings.isPublic
                                            ? "bg-purple-500"
                                            : "bg-neutral-300"
                                        }`}
                                      >
                                        <span
                                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                                            school.settings.isPublic
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
                                        aria-checked={school.settings.allowGuests}
                                        onClick={() => handleToggleSetting("allowGuests")}
                                        className={`relative h-5 w-9 rounded-full transition-colors ${
                                          school.settings.allowGuests
                                            ? "bg-purple-500"
                                            : "bg-neutral-300"
                                        }`}
                                      >
                                        <span
                                          className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white transition-transform ${
                                            school.settings.allowGuests
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
                                  workspaceId={school.id}
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
                                <WorkspaceAnalytics workspaceId={school.id} />
                              </motion.div>
                            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}

export default function WorkspaceSettingsPage() {
  return (
    <Suspense fallback={null}>
      <WorkspaceSettingsContent />
    </Suspense>
  );
}
