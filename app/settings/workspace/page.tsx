"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import {
  ArrowLeft,
  Users,
  Settings,
  BarChart3,
  Trash2,
  Download,
  Camera,
  X,
  Check,
  Globe,
  School,
  Loader2,
  Link as LinkIcon,
} from "lucide-react";
import {
  loadSchool,
  updateSchool,
  deleteSchool,
  regenerateSchoolInviteCode,
  uploadWorkspaceIcon,
  removeWorkspaceIcon,
} from "@/lib/schools/store";
import type { School as SchoolType } from "@/lib/schools/types";
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
  "#64748B",
  "#0F172A",
];

const WORKSPACE_ICONS = [
  "📚", "🏢", "🚀", "💡", "🔬",
  "📐", "🎨", "📝", "🧪", "⚡",
  "🌍", "🎯", "💼", "🏗️", "🔧",
];

const ACCENT_COLORS = ["#4F46E5", "#7C3AED", "#10B981", "#F59E0B", "#EC4899"];
function seedColor(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

/** Renders the workspace avatar: custom image > emoji > colored initial */
function WorkspaceAvatar({
  school,
  size = "lg",
}: {
  school: SchoolType;
  size?: "sm" | "lg";
}) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "lg" ? "h-20 w-20" : "h-8 w-8";
  const rounded = size === "lg" ? "rounded-2xl" : "rounded-lg";
  const bg = school.color ?? seedColor(school.id);
  const iconSize = size === "lg" ? 36 : 16;
  const textSize = size === "lg" ? "text-3xl" : "text-sm";

  if (school.useCustomIcon && school.iconUrl && !imgError) {
    return (
      <div className={`${dim} ${rounded} shrink-0 overflow-hidden`}>
        <Image
          src={`${school.iconUrl}?t=${Date.now()}`}
          alt={school.name}
          width={size === "lg" ? 80 : 32}
          height={size === "lg" ? 80 : 32}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  if (school.icon) {
    return (
      <div
        className={`${dim} ${rounded} shrink-0 flex items-center justify-center`}
        style={{ backgroundColor: bg }}
      >
        <span className={textSize}>{school.icon}</span>
      </div>
    );
  }

  return (
    <div
      className={`${dim} ${rounded} shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: bg }}
    >
      <School className="text-white" style={{ width: iconSize, height: iconSize }} />
    </div>
  );
}

function WorkspaceSettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<Tab>("general");
  const [school, setSchool] = useState<SchoolType | null>(null);

  // Form fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");

  // Save state
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Icon upload state
  const [iconUploading, setIconUploading] = useState(false);
  const [iconPreview, setIconPreview] = useState<string | null>(null);
  const [pendingIconFile, setPendingIconFile] = useState<File | null>(null);

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
        setDescription(data.description ?? "");
        setWebsite(data.website ?? "");
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
      setDescription(updated.description ?? "");
      setWebsite(updated.website ?? "");
    }
  }, [school]);

  // ── Save all text fields ──────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!school || !name.trim()) return;
    setSaving(true);
    setSaveError(null);

    try {
      // 1. Upload pending icon if there is one
      if (pendingIconFile) {
        setIconUploading(true);
        const result = await uploadWorkspaceIcon(school.id, pendingIconFile);
        setIconUploading(false);
        if (!result) {
          setSaveError("Failed to upload icon. Please try again.");
          setSaving(false);
          return;
        }
        setPendingIconFile(null);
        setIconPreview(null);
      }

      // 2. Save text fields
      const updated = await updateSchool(school.id, {
        name: name.trim(),
        description: description.trim() || null,
        website: website.trim() || null,
      });

      if (updated) {
        setSchool(updated);
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      } else {
        setSaveError("Failed to save changes. Please try again.");
      }
    } catch {
      setSaveError("An unexpected error occurred.");
    } finally {
      setSaving(false);
    }
  }, [school, name, description, website, pendingIconFile]);

  // ── Icon picker ───────────────────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      if (file.size > 2 * 1024 * 1024) {
        setSaveError("Image must be smaller than 2 MB.");
        return;
      }
      const preview = URL.createObjectURL(file);
      setIconPreview(preview);
      setPendingIconFile(file);
      setSaveError(null);
    },
    [],
  );

  const handleRemoveCustomIcon = useCallback(async () => {
    if (!school) return;
    setIconUploading(true);
    await removeWorkspaceIcon(school.id);
    setIconUploading(false);
    setIconPreview(null);
    setPendingIconFile(null);
    await refresh();
  }, [school, refresh]);

  const handleColorChange = useCallback(
    async (color: string) => {
      if (!school) return;
      const updated = await updateSchool(school.id, { color });
      if (updated) setSchool(updated);
    },
    [school],
  );

  const handleIconEmojiChange = useCallback(
    async (icon: string) => {
      if (!school) return;
      const updated = await updateSchool(school.id, { icon });
      if (updated) setSchool(updated);
    },
    [school],
  );

  const handleToggleSetting = useCallback(
    async (key: "isPublic" | "allowGuests") => {
      if (!school) return;
      const updated = await updateSchool(school.id, {
        settings: { ...school.settings, [key]: !school.settings[key] },
      });
      if (updated) setSchool(updated);
    },
    [school],
  );

  const handleDelete = useCallback(async () => {
    if (!school) return;
    const success = await deleteSchool(school.id);
    if (success) router.push("/s/default");
  }, [school, router]);

  const handleRegenerateCode = useCallback(async () => {
    if (!school) return;
    const newCode = await regenerateSchoolInviteCode(school.id);
    if (newCode) await refresh();
  }, [school, refresh]);

  const handleExport = useCallback(() => {
    if (!school) return;
    const blob = new Blob([JSON.stringify(school, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${school.slug ?? school.id}-workspace.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [school]);

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "general", label: "General", icon: <Settings className="h-4 w-4" /> },
    { id: "members", label: "Members", icon: <Users className="h-4 w-4" /> },
    { id: "analytics", label: "Analytics", icon: <BarChart3 className="h-4 w-4" /> },
  ];

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!school) return null;

  // Preview school object with local overrides for the avatar
  const previewSchool: SchoolType = {
    ...school,
    ...(iconPreview
      ? { iconUrl: iconPreview, useCustomIcon: true }
      : {}),
  };

  return (
    <div className="flex min-h-screen bg-[#fafafa]">
      {/* ── Sidebar nav ── */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-neutral-200 bg-white">
        <div className="flex items-center gap-2 border-b border-neutral-200 px-4 py-4">
          <button
            onClick={() => router.back()}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold text-neutral-900">Workspace Settings</h1>
        </div>

        <nav className="flex flex-col gap-0.5 p-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors ${
                activeTab === tab.id
                  ? "bg-neutral-900 font-medium text-white"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-2xl px-8 py-8">
          <AnimatePresence mode="wait">

            {/* ══════════════════════ GENERAL TAB ══════════════════════ */}
            {activeTab === "general" && (
              <motion.div
                key="general"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">General</h2>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    Manage your workspace identity and settings.
                  </p>
                </div>

                {/* ── Profile card ─────────────────────────────────────── */}
                <div className="rounded-xl border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-5 py-3.5">
                    <h3 className="text-sm font-medium text-neutral-800">Profile</h3>
                  </div>
                  <div className="px-5 py-5">
                    <div className="flex items-start gap-5">
                      {/* Clickable avatar */}
                      <div className="relative shrink-0">
                        <WorkspaceAvatar school={previewSchool} size="lg" />
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          disabled={iconUploading}
                          className="absolute inset-0 flex items-center justify-center rounded-2xl bg-black/0 transition-all hover:bg-black/40 group"
                          aria-label="Upload workspace icon"
                        >
                          <Camera className="h-6 w-6 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
                        </button>
                        {/* Remove icon button — only show when a custom image is active */}
                        {(school.useCustomIcon || iconPreview) && (
                          <button
                            onClick={pendingIconFile ? () => { setIconPreview(null); setPendingIconFile(null); } : handleRemoveCustomIcon}
                            disabled={iconUploading}
                            className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-400 shadow-sm transition-colors hover:bg-red-50 hover:text-red-500"
                            aria-label="Remove custom icon"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          className="hidden"
                          onChange={handleFileSelect}
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <p className="text-sm font-medium text-neutral-800">{school.name}</p>
                        <p className="text-xs text-neutral-400">
                          Click the icon to upload a logo. PNG, JPG, WebP · max 2 MB
                        </p>
                        {pendingIconFile && (
                          <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-amber-600">
                            <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            New icon pending — click Save to apply
                          </span>
                        )}
                        {iconUploading && (
                          <span className="mt-1 inline-flex items-center gap-1.5 text-xs text-neutral-400">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Uploading…
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Name + Description + Website ─────────────────────── */}
                <div className="rounded-xl border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-5 py-3.5">
                    <h3 className="text-sm font-medium text-neutral-800">Identity</h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {/* Name */}
                    <div className="px-5 py-4">
                      <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                        Workspace name
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => { setName(e.target.value); setSaved(false); }}
                        onKeyDown={(e) => { if (e.key === "Enter") handleSave(); }}
                        placeholder="My Workspace"
                        className="h-9 w-full rounded-lg border border-neutral-200 px-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                      />
                    </div>

                    {/* Description */}
                    <div className="px-5 py-4">
                      <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                        Description
                        <span className="ml-1 font-normal text-neutral-400">(optional)</span>
                      </label>
                      <textarea
                        value={description}
                        onChange={(e) => { setDescription(e.target.value); setSaved(false); }}
                        placeholder="What does this workspace do? Who is it for?"
                        rows={3}
                        className="w-full resize-none rounded-lg border border-neutral-200 px-3 py-2 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                      />
                      <p className="mt-1 text-right text-[11px] text-neutral-300">
                        {description.length} / 500
                      </p>
                    </div>

                    {/* Website */}
                    <div className="px-5 py-4">
                      <label className="mb-1.5 block text-xs font-medium text-neutral-500">
                        Website
                        <span className="ml-1 font-normal text-neutral-400">(optional)</span>
                      </label>
                      <div className="relative">
                        <LinkIcon className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-300" />
                        <input
                          type="url"
                          value={website}
                          onChange={(e) => { setWebsite(e.target.value); setSaved(false); }}
                          placeholder="https://yoursite.com"
                          className="h-9 w-full rounded-lg border border-neutral-200 pl-8 pr-3 text-sm text-neutral-900 outline-none transition-colors placeholder:text-neutral-300 focus:border-neutral-400 focus:ring-2 focus:ring-neutral-100"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Save button ───────────────────────────────────────── */}
                <div className="flex items-center justify-between">
                  {saveError && (
                    <p className="text-xs text-red-500">{saveError}</p>
                  )}
                  {!saveError && (
                    <span />
                  )}
                  <button
                    onClick={handleSave}
                    disabled={saving || !name.trim()}
                    className="flex items-center gap-2 rounded-lg bg-neutral-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Saving…
                      </>
                    ) : saved ? (
                      <>
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                        Saved
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </button>
                </div>

                {/* ── Appearance ───────────────────────────────────────── */}
                <div className="rounded-xl border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-5 py-3.5">
                    <h3 className="text-sm font-medium text-neutral-800">Appearance</h3>
                    <p className="mt-0.5 text-xs text-neutral-400">
                      Choose a fallback emoji and accent color (shown when no logo is uploaded).
                    </p>
                  </div>
                  <div className="space-y-5 px-5 py-5">
                    {/* Emoji icons */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-neutral-500">
                        Emoji icon
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {WORKSPACE_ICONS.map((icon) => (
                          <button
                            key={icon}
                            onClick={() => handleIconEmojiChange(icon)}
                            className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-all ${
                              school.icon === icon
                                ? "bg-neutral-900 ring-2 ring-neutral-900 ring-offset-1"
                                : "bg-neutral-50 hover:bg-neutral-100"
                            }`}
                          >
                            {icon}
                          </button>
                        ))}
                      </div>
                    </div>
                    {/* Colors */}
                    <div>
                      <label className="mb-2 block text-xs font-medium text-neutral-500">
                        Accent color
                      </label>
                      <div className="flex flex-wrap gap-2.5">
                        {WORKSPACE_COLORS.map((color) => (
                          <button
                            key={color}
                            onClick={() => handleColorChange(color)}
                            className={`h-7 w-7 rounded-full border-2 transition-transform hover:scale-110 ${
                              school.color === color
                                ? "scale-110 border-white shadow-[0_0_0_2px] shadow-neutral-900"
                                : "border-transparent"
                            }`}
                            style={{ backgroundColor: color }}
                            aria-label={`Set color ${color}`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── Workspace options ─────────────────────────────────── */}
                <div className="rounded-xl border border-neutral-200 bg-white">
                  <div className="border-b border-neutral-100 px-5 py-3.5">
                    <h3 className="text-sm font-medium text-neutral-800">Options</h3>
                  </div>
                  <div className="divide-y divide-neutral-100">
                    {(
                      [
                        {
                          key: "isPublic" as const,
                          label: "Public workspace",
                          desc: "Anyone can discover and view this workspace",
                          icon: <Globe className="h-4 w-4 text-neutral-400" />,
                        },
                        {
                          key: "allowGuests" as const,
                          label: "Allow guests",
                          desc: "Enable time-limited guest access tokens",
                          icon: <Users className="h-4 w-4 text-neutral-400" />,
                        },
                      ] as const
                    ).map(({ key, label, desc, icon }) => (
                      <label key={key} className="flex cursor-pointer items-center justify-between px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          {icon}
                          <div>
                            <p className="text-sm text-neutral-700">{label}</p>
                            <p className="text-xs text-neutral-400">{desc}</p>
                          </div>
                        </div>
                        <button
                          role="switch"
                          aria-checked={school.settings[key]}
                          onClick={() => handleToggleSetting(key)}
                          className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${
                            school.settings[key] ? "bg-neutral-900" : "bg-neutral-200"
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
                              school.settings[key] ? "translate-x-4" : ""
                            }`}
                          />
                        </button>
                      </label>
                    ))}
                  </div>
                </div>

                {/* ── Danger zone ───────────────────────────────────────── */}
                <div className="space-y-3">
                  <button
                    onClick={handleExport}
                    className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
                  >
                    <Download className="h-4 w-4" />
                    Export workspace data
                  </button>

                  <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                    <h3 className="text-sm font-medium text-red-700">Danger zone</h3>
                    <p className="mt-1 text-xs text-red-500">
                      Permanently delete this workspace and all its data. This action cannot be undone.
                    </p>
                    {confirmDelete ? (
                      <div className="mt-3 flex gap-2">
                        <button
                          onClick={handleDelete}
                          className="rounded-lg bg-red-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-red-600"
                        >
                          Yes, delete workspace
                        </button>
                        <button
                          onClick={() => setConfirmDelete(false)}
                          className="rounded-lg px-4 py-1.5 text-xs font-medium text-neutral-500 transition-colors hover:bg-red-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(true)}
                        className="mt-3 flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-100"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete workspace
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            )}

            {/* ══════════════════════ MEMBERS TAB ══════════════════════ */}
            {activeTab === "members" && (
              <motion.div
                key="members"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Members</h2>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    Manage workspace members and their roles.
                  </p>
                </div>
                <WorkspaceMembers workspaceId={school.id} onUpdate={refresh} />
              </motion.div>
            )}

            {/* ══════════════════════ ANALYTICS TAB ════════════════════ */}
            {activeTab === "analytics" && (
              <motion.div
                key="analytics"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-6"
              >
                <div>
                  <h2 className="text-lg font-semibold text-neutral-900">Analytics</h2>
                  <p className="mt-0.5 text-sm text-neutral-500">
                    Workspace activity and usage statistics.
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
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-[#fafafa]">
        <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
      </div>
    }>
      <WorkspaceSettingsContent />
    </Suspense>
  );
}
