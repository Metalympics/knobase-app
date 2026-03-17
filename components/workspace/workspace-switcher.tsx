"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Check, Settings, School } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { setActiveWorkspaceId } from "@/lib/schools/store";
import type { Workspace } from "@/lib/schools/types";

interface WorkspaceSwitcherProps {
  currentWorkspace: Workspace;
  onSwitch?: (workspace: Workspace) => void;
}

const ACCENT_COLORS = [
  "#4F46E5",
  "#7C3AED",
  "#10B981",
  "#F59E0B",
  "#EC4899",
];

function seedColor(id: string): string {
  const hash = id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  return ACCENT_COLORS[hash % ACCENT_COLORS.length];
}

/** Renders the org icon: custom image if available, else colored initial */
function OrgIcon({
  workspace,
  size,
}: {
  workspace: Workspace;
  size: "sm" | "md";
}) {
  const [imgError, setImgError] = useState(false);
  const dim = size === "sm" ? "h-6 w-6" : "h-9 w-9";
  const rounded = size === "sm" ? "rounded" : "rounded-md";
  const bg = seedColor(workspace.id);

  if (workspace.useCustomIcon && workspace.iconUrl && !imgError) {
    return (
      <div className={`${dim} ${rounded} overflow-hidden shrink-0`}>
        <Image
          src={workspace.iconUrl}
          alt={workspace.name}
          width={size === "sm" ? 24 : 36}
          height={size === "sm" ? 24 : 36}
          className="h-full w-full object-cover"
          unoptimized
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`${dim} ${rounded} shrink-0 flex items-center justify-center`}
      style={{ backgroundColor: bg }}
    >
      <School
        className="text-white"
        style={{ width: size === "sm" ? 12 : 18, height: size === "sm" ? 12 : 18 }}
      />
    </div>
  );
}

/** Role badge matching the reference component's style */
function RoleBadge({ userType }: { userType?: string | null }) {
  if (!userType) return null;
  const styles: Record<string, string> = {
    admin: "bg-red-100 text-red-700",
    owner: "bg-purple-100 text-purple-700",
    teacher: "bg-emerald-100 text-emerald-700",
    human: "bg-blue-100 text-blue-700",
  };
  const cls = styles[userType.toLowerCase()] ?? styles.human;
  const label =
    userType.charAt(0).toUpperCase() + userType.slice(1).toLowerCase();

  return (
    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${cls}`}>
      {label}
    </span>
  );
}

async function fetchWorkspaces(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<Workspace[]> {
  const { data: memberRows } = await supabase
    .from("users")
    .select("school_id, type")
    .eq("auth_id", userId)
    .not("school_id", "is", null);

  const schoolIds = (memberRows ?? [])
    .map((r: any) => r.school_id as string)
    .filter(Boolean);
  if (!schoolIds.length) return [];

  const typeBySchool = Object.fromEntries(
    (memberRows ?? []).map((r: any) => [r.school_id, r.type ?? null])
  );

  const [{ data: schoolRows }, { data: orgSettings }] = await Promise.all([
    supabase.from("schools").select("id, name, admin_user_id, created_at").in("id", schoolIds),
    supabase
      .from("organization_settings")
      .select("school_id, site_title, subdomain_id, updated_at, default_bot_id, use_custom_icon")
      .in("school_id", schoolIds),
  ]);

  const settingsBySchool = Object.fromEntries(
    (orgSettings ?? []).map((os: any) => [os.school_id, os])
  );

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

  return (schoolRows ?? []).map((s: any) => {
    const os = settingsBySchool[s.id] ?? {};
    const useCustomIcon = os.use_custom_icon === true;
    return {
      id: s.id,
      name: os.site_title ?? s.name ?? "School",
      slug: os.subdomain_id ?? s.id,
      ownerId: s.admin_user_id ?? "",
      createdAt: s.created_at ?? new Date().toISOString(),
      updatedAt: os.updated_at ?? new Date().toISOString(),
      settings: { isPublic: false, allowGuests: false, defaultAgent: os.default_bot_id ?? null },
      inviteCode: "",
      icon: null,
      color: null,
      useCustomIcon,
      iconUrl: useCustomIcon
        ? `${supabaseUrl}/storage/v1/object/public/organization-custom-styles/${s.id}/icon-logo.png`
        : null,
      userType: typeBySchool[s.id] ?? null,
    } as Workspace;
  });
}

export function WorkspaceSwitcher({
  currentWorkspace,
  onSwitch,
}: WorkspaceSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  // Enriched version of currentWorkspace with iconUrl/useCustomIcon from Supabase
  const [enrichedCurrent, setEnrichedCurrent] = useState<Workspace>(currentWorkspace);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      const loaded = await fetchWorkspaces(supabase, user.id);
      setWorkspaces(loaded);
      // Upgrade the trigger button with fresh icon data
      const fresh = loaded.find((w) => w.id === currentWorkspace.id);
      if (fresh) setEnrichedCurrent(fresh);
      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentWorkspace.id]);

  const refreshWorkspaces = useCallback(async () => {
    setLoading(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }
    setWorkspaces(await fetchWorkspaces(supabase, user.id));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const updateLastActiveWorkspace = useCallback(async (schoolId: string) => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("auth_profiles")
        .update({ last_active_school_id: schoolId })
        .eq("auth_id", user.id);
    } catch (err) {
      console.error("Failed to update last active workspace:", err);
    }
  }, []);

  const handleSwitch = useCallback(
    async (ws: Workspace) => {
      setActiveWorkspaceId(ws.id);
      setEnrichedCurrent(ws);
      await updateLastActiveWorkspace(ws.id);
      setOpen(false);
      onSwitch?.(ws);
      router.push(`/s/${ws.id}`);
    },
    [onSwitch, router, updateLastActiveWorkspace]
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-md px-1 py-0.5 transition-colors hover:bg-neutral-100"
        aria-label="Switch workspace"
        aria-expanded={open}
      >
        <OrgIcon workspace={enrichedCurrent} size="sm" />
        <span className="max-w-[120px] truncate text-sm font-semibold text-neutral-900">
          {enrichedCurrent.name}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-neutral-200 bg-white py-1 shadow-lg"
          >
            <div className="px-3 py-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                Workspaces
              </p>
            </div>

            <div className="max-h-72 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-6">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-700" />
                </div>
              ) : workspaces.length === 0 ? (
                <p className="px-4 py-5 text-center text-sm text-neutral-400">
                  No workspaces found
                </p>
              ) : (
                workspaces.map((ws) => (
                  <button
                    key={ws.id}
                    onClick={() => handleSwitch(ws)}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 ${
                      ws.id === enrichedCurrent.id ? "bg-purple-50" : ""
                    }`}
                  >
                    <OrgIcon workspace={ws} size="md" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-neutral-800">
                        {ws.name}
                      </p>
                      <div className="mt-0.5 flex items-center gap-1.5">
                        <RoleBadge userType={ws.userType} />
                      </div>
                    </div>
                    {ws.id === enrichedCurrent.id && (
                      <Check className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                    )}
                  </button>
                ))
              )}
            </div>

            <div className="border-t border-neutral-100 px-1 py-1">
              <button
                onClick={() => { setOpen(false); router.push("/settings/workspace"); }}
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
