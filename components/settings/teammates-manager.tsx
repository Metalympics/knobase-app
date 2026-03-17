"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  Bot,
  User,
  Mail,
  Clock,
  Trash2,
  RefreshCw,
  AlertCircle,
  Check,
  Loader2,
  UserPlus,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { InviteModal } from "@/components/invitation/invite-modal";
import { createClient } from "@/lib/supabase/client";

/* ------------------------------------------------------------------ */
/* Types & Constants                                                    */
/* ------------------------------------------------------------------ */

interface Teammate {
  id: string;
  name: string | null;
  email: string | null;
  type: "human" | "agent";
  role_id: string | null;
  avatar_url: string | null;
  bot_id: string | null;
  agent_type: string | null;
  capabilities: string[] | null;
  availability: string | null;
  last_invoked_at: string | null;
  created_at: string;
}

type Role = "admin" | "editor" | "viewer";

const ROLE_CONFIG: Record<Role, { label: string; color: string; dot: string; description: string }> = {
  admin: {
    label: "Admin",
    color: "text-rose-600",
    dot: "bg-rose-500",
    description: "Full workspace control",
  },
  editor: {
    label: "Editor",
    color: "text-blue-600",
    dot: "bg-blue-500",
    description: "Create and edit documents",
  },
  viewer: {
    label: "Viewer",
    color: "text-neutral-500",
    dot: "bg-neutral-400",
    description: "View and comment only",
  },
};

function normalizeRole(role: string | null): Role {
  if (role && role in ROLE_CONFIG) return role as Role;
  return "viewer";
}

function relativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  if (email) return email.slice(0, 2).toUpperCase();
  return "??";
}

function isFullUrl(url: string): boolean {
  return url.startsWith("http://") || url.startsWith("https://");
}

/**
 * Resolves avatar URLs: full URLs are used directly, storage paths are
 * downloaded from Supabase Storage and converted to blob URLs.
 * Returns a map of teammate id → resolved URL, and handles cleanup of
 * blob URLs when they are no longer needed.
 */
function useResolvedAvatars(teammates: Teammate[]) {
  const [resolved, setResolved] = useState<Record<string, string>>({});
  const blobUrlsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const newBlobUrls = new Set<string>();

    async function resolve() {
      const supabase = createClient();
      const result: Record<string, string> = {};

      await Promise.all(
        teammates.map(async (t) => {
          if (!t.avatar_url) return;

          if (isFullUrl(t.avatar_url)) {
            result[t.id] = t.avatar_url;
            return;
          }

          try {
            const { data, error } = await supabase.storage
              .from("avatars")
              .download(t.avatar_url);
            if (error || !data) return;
            const url = URL.createObjectURL(data);
            newBlobUrls.add(url);
            result[t.id] = url;
          } catch {
            // Storage download failed — fall back to initials
          }
        }),
      );

      if (cancelled) {
        newBlobUrls.forEach((u) => URL.revokeObjectURL(u));
        return;
      }

      // Revoke previous blob URLs that are no longer in use
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current = newBlobUrls;
      setResolved(result);
    }

    resolve();
    return () => {
      cancelled = true;
    };
  }, [teammates]);

  // Clean up all blob URLs on unmount
  useEffect(() => {
    return () => {
      blobUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
      blobUrlsRef.current.clear();
    };
  }, []);

  return resolved;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function TeammatesManager({ workspaceId }: { workspaceId: string | null }) {
  const [teammates, setTeammates] = useState<Teammate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "human" | "agent">("all");
  const [changingRoleId, setChangingRoleId] = useState<string | null>(null);
  const [roleSuccessId, setRoleSuccessId] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);

  const fetchTeammates = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();

      const { data, error: fetchErr } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          type,
          role_id,
          avatar_url,
          bot_id,
          agent_type,
          capabilities,
          availability,
          last_invoked_at,
          created_at
        `)
        .eq("school_id", workspaceId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setTeammates((data ?? []) as unknown as Teammate[]);
    } catch (err) {
      console.error("[TeammatesManager] Fetch error:", err);
      setError("Failed to load teammates");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTeammates();
  }, [fetchTeammates]);

  const handleRemove = useCallback(
    async (teammateId: string, name: string | null) => {
      if (!confirm(`Remove ${name || "this teammate"} from the workspace?`)) return;
      try {
        const supabase = createClient();
        await supabase.from("users").update({ is_deleted: true }).eq("id", teammateId);
        fetchTeammates();
      } catch {
        setError("Failed to remove teammate");
      }
    },
    [fetchTeammates]
  );

  const handleRoleChange = useCallback(
    async (teammateId: string, newRole: Role) => {
      setChangingRoleId(teammateId);
      setError(null);
      try {
        const res = await fetch("/api/collaborators", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ teammate_id: teammateId, role: newRole }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to change role");

        setTeammates((prev) =>
          prev.map((t) => (t.id === teammateId ? { ...t, role_id: newRole } : t))
        );
        setRoleSuccessId(teammateId);
        setTimeout(() => setRoleSuccessId(null), 2000);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to change role");
      } finally {
        setChangingRoleId(null);
      }
    },
    []
  );

  const resolvedAvatars = useResolvedAvatars(teammates);

  const filteredTeammates = teammates.filter((t) => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const humans = teammates.filter((t) => t.type === "human");
  const agents = teammates.filter((t) => t.type === "agent");

  if (!workspaceId) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-10 text-center">
        <p className="text-sm text-neutral-500">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex items-center justify-between gap-4">
        {/* Stats */}
        <div className="flex items-center gap-1.5 text-xs text-neutral-500">
          <span className="tabular-nums font-medium text-neutral-800">{teammates.length}</span>
          members
          <span className="mx-1 text-neutral-200">·</span>
          <User className="h-3 w-3 text-blue-400" />
          <span className="tabular-nums">{humans.length}</span>
          <span className="mx-1 text-neutral-200">·</span>
          <Bot className="h-3 w-3 text-purple-400" />
          <span className="tabular-nums">{agents.length}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Filter pills */}
          <div className="flex rounded-full border border-neutral-200 bg-white p-0.5">
            {(["all", "human", "agent"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`rounded-full px-3 py-1 text-[11px] font-medium capitalize transition-all ${
                  filter === f
                    ? "bg-neutral-900 text-white shadow-sm"
                    : "text-neutral-500 hover:text-neutral-700"
                }`}
              >
                {f === "all" ? "All" : f === "human" ? "Humans" : "Agents"}
              </button>
            ))}
          </div>

          <button
            onClick={fetchTeammates}
            disabled={loading}
            className="rounded-full border border-neutral-200 p-1.5 text-neutral-400 transition-colors hover:bg-neutral-50 hover:text-neutral-600 disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>

          <button
            onClick={() => setInviteOpen(true)}
            className="flex items-center gap-1.5 rounded-full bg-purple-600 px-3.5 py-1.5 text-[11px] font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2.5 text-sm text-red-600">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Loading skeletons */}
      {loading && teammates.length === 0 && (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-neutral-100 bg-white p-4">
              <div className="h-9 w-9 animate-pulse rounded-full bg-neutral-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-32 animate-pulse rounded bg-neutral-100" />
                <div className="h-3 w-48 animate-pulse rounded bg-neutral-50" />
              </div>
              <div className="h-7 w-20 animate-pulse rounded-md bg-neutral-50" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTeammates.length === 0 && (
        <div className="rounded-xl border border-dashed border-neutral-200 bg-neutral-50/50 px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100">
            <Users className="h-5 w-5 text-neutral-400" />
          </div>
          <h3 className="mt-4 text-sm font-medium text-neutral-700">
            {filter === "all" ? "No teammates yet" : `No ${filter}s yet`}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Add humans or connect agents to collaborate in this workspace.
          </p>
          <button
            onClick={() => setInviteOpen(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-purple-600 px-4 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:bg-purple-700"
          >
            <UserPlus className="h-3.5 w-3.5" />
            Invite teammate
          </button>
        </div>
      )}

      {/* Teammate list */}
      {filteredTeammates.length > 0 && (
      <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-white">
        <AnimatePresence initial={false}>
          {filteredTeammates.map((teammate) => {
            const role = normalizeRole(teammate.role_id);
            const roleConfig = ROLE_CONFIG[role];
            const isChanging = changingRoleId === teammate.id;
            const showSuccess = roleSuccessId === teammate.id;
            const isAgent = teammate.type === "agent";
            const displayName = teammate.name || teammate.email || teammate.bot_id || "Unknown";

            return (
              <motion.div
                key={teammate.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                layout
                className="group relative flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-neutral-50/60"
              >
                {/* Avatar */}
                <div className="relative shrink-0">
                  {resolvedAvatars[teammate.id] ? (
                    <img
                      src={resolvedAvatars[teammate.id]}
                      alt={displayName}
                      className="h-9 w-9 rounded-full object-cover ring-1 ring-neutral-100"
                    />
                  ) : (
                    <div
                      className={`flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                        isAgent
                          ? "bg-purple-50 text-purple-600 ring-purple-100"
                          : "bg-blue-50 text-blue-600 ring-blue-100"
                      }`}
                    >
                      {isAgent ? <Bot className="h-4 w-4" /> : getInitials(teammate.name, teammate.email)}
                    </div>
                  )}
                  {isAgent && teammate.availability !== "offline" && (
                    <span className="absolute -bottom-px -right-px block h-2.5 w-2.5 rounded-full border-[1.5px] border-white bg-emerald-400" />
                  )}
                </div>

                {/* Name + meta */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[13px] font-medium text-neutral-900">
                      {displayName}
                    </span>
                    {isAgent && (
                      <span className="shrink-0 rounded bg-purple-50 px-1.5 py-px text-[10px] font-medium text-purple-500">
                        Agent
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-400">
                    {teammate.email && teammate.name && (
                      <>
                        <Mail className="h-3 w-3 shrink-0" />
                        <span className="truncate">{teammate.email}</span>
                        <span className="text-neutral-200">·</span>
                      </>
                    )}
                    {isAgent && teammate.last_invoked_at && (
                      <>
                        <Clock className="h-3 w-3 shrink-0" />
                        <span>{relativeTime(teammate.last_invoked_at)}</span>
                        <span className="text-neutral-200">·</span>
                      </>
                    )}
                    <span>Joined {relativeTime(teammate.created_at)}</span>
                  </div>
                  {/* Capabilities */}
                  {isAgent && (teammate.capabilities?.length ?? 0) > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(teammate.capabilities ?? []).slice(0, 4).map((cap) => (
                        <span
                          key={cap}
                          className="rounded bg-neutral-100 px-1.5 py-px text-[10px] font-medium text-neutral-500"
                        >
                          {cap}
                        </span>
                      ))}
                      {(teammate.capabilities?.length ?? 0) > 4 && (
                        <span className="rounded bg-neutral-100 px-1.5 py-px text-[10px] text-neutral-400">
                          +{(teammate.capabilities?.length ?? 0) - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role selector */}
                <div className="w-[110px] shrink-0">
                  {isChanging ? (
                    <div className="flex h-8 items-center justify-center gap-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                    </div>
                  ) : showSuccess ? (
                    <div className="flex h-8 items-center justify-center gap-1.5 rounded-md bg-emerald-50">
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                      <span className="text-[11px] font-medium text-emerald-600">Saved</span>
                    </div>
                  ) : (
                    <Select
                      value={role}
                      onValueChange={(v) => handleRoleChange(teammate.id, v as Role)}
                    >
                      <SelectTrigger
                        size="sm"
                        className="h-8 w-full border-transparent bg-transparent px-2 text-xs font-medium shadow-none hover:border-neutral-200 hover:bg-white data-[state=open]:border-neutral-200 data-[state=open]:bg-white"
                      >
                        <span className="flex items-center gap-1.5">
                          <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${roleConfig.dot}`} />
                          <span className={roleConfig.color}>{roleConfig.label}</span>
                        </span>
                      </SelectTrigger>
                      <SelectContent align="end">
                        {(Object.entries(ROLE_CONFIG) as [Role, typeof roleConfig][]).map(
                          ([key, cfg]) => (
                            <SelectItem key={key} value={key}>
                              <span className="flex items-center gap-2">
                                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${cfg.dot}`} />
                                <span className="font-medium">{cfg.label}</span>
                                <span className="text-[11px] text-neutral-400">
                                  {cfg.description}
                                </span>
                              </span>
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}
                </div>

                {/* Remove button — always in layout, visible on hover via opacity */}
                <button
                  onClick={() => handleRemove(teammate.id, teammate.name)}
                  className="shrink-0 rounded-md p-1.5 text-neutral-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                  title="Remove from workspace"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      )}

      {workspaceId && (
        <InviteModal
          open={inviteOpen}
          onOpenChange={setInviteOpen}
          workspaceId={workspaceId}
        />
      )}
    </div>
  );
}
