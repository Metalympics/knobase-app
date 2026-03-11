"use client";

import { useState, useEffect, useCallback } from "react";
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
  Shield,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* ------------------------------------------------------------------ */
/* Types & Constants                                                    */
/* ------------------------------------------------------------------ */

interface Teammate {
  id: string;
  name: string | null;
  email: string | null;
  type: "human" | "agent";
  role: string | null;
  avatar_url: string | null;
  bot_id: string | null;
  agent_type: string | null;
  capabilities: string[] | null;
  availability: string | null;
  last_invoked_at: string | null;
  joined_at: string | null;
  created_at: string;
}

type Role = "admin" | "editor" | "viewer";

const ROLE_CONFIG: Record<Role, { label: string; badge: string; description: string }> = {
  admin: {
    label: "Admin",
    badge: "bg-red-100 text-red-700 border-red-200",
    description: "Full workspace control, can invite anyone, manage billing",
  },
  editor: {
    label: "Editor",
    badge: "bg-blue-100 text-blue-700 border-blue-200",
    description: "Can create and edit documents, invite viewers",
  },
  viewer: {
    label: "Viewer",
    badge: "bg-neutral-100 text-neutral-600 border-neutral-200",
    description: "Can view and comment only",
  },
};

function normalizeRole(role: string | null): Role {
  if (role && role in ROLE_CONFIG) return role as Role;
  return "viewer";
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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchTeammates = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error: fetchErr } = await supabase
        .from("users")
        .select(`
          id,
          name,
          email,
          type,
          role,
          avatar_url,
          bot_id,
          agent_type,
          capabilities,
          availability,
          last_invoked_at,
          joined_at,
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
        const { createClient } = await import("@/lib/supabase/client");
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
          prev.map((t) => (t.id === teammateId ? { ...t, role: newRole } : t))
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

  const filteredTeammates = teammates.filter((t) => {
    if (filter === "all") return true;
    return t.type === filter;
  });

  const humans = teammates.filter((t) => t.type === "human");
  const agents = teammates.filter((t) => t.type === "agent");

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

  function getAvatarIcon(type: string) {
    if (type === "agent") return <Bot className="h-5 w-5 text-purple-600" />;
    return <User className="h-5 w-5 text-blue-600" />;
  }

  function getAvatarBg(type: string) {
    if (type === "agent") return "bg-purple-50";
    return "bg-blue-50";
  }

  if (!workspaceId) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white px-6 py-8 text-center">
        <p className="text-sm text-neutral-500">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <Users className="h-4 w-4 text-neutral-400" />
            <span className="text-sm font-medium">{teammates.length} total</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <User className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{humans.length} humans</span>
          </div>
          <div className="flex items-center gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2">
            <Bot className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">{agents.length} agents</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Filter tabs */}
          <div className="flex rounded-lg border border-neutral-200 bg-white p-1">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "all"
                  ? "bg-neutral-900 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("human")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "human"
                  ? "bg-blue-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              Humans
            </button>
            <button
              onClick={() => setFilter("agent")}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                filter === "agent"
                  ? "bg-purple-500 text-white"
                  : "text-neutral-600 hover:bg-neutral-100"
              }`}
            >
              Agents
            </button>
          </div>
          <button
            onClick={fetchTeammates}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && teammates.length === 0 && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-neutral-200 bg-neutral-50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredTeammates.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <Users className="mx-auto h-10 w-10 text-neutral-300" />
          <h3 className="mt-3 text-sm font-medium text-neutral-700">
            {filter === "all" ? "No teammates yet" : `No ${filter}s yet`}
          </h3>
          <p className="mt-1 text-xs text-neutral-500">
            Invite teammates from the document page using the Invite button.
          </p>
        </div>
      )}

      {/* Teammate list */}
      <AnimatePresence>
        {filteredTeammates.map((teammate) => {
          const role = normalizeRole(teammate.role);
          const config = ROLE_CONFIG[role];
          const isChanging = changingRoleId === teammate.id;
          const showSuccess = roleSuccessId === teammate.id;
          const isExpanded = expandedId === teammate.id;

          return (
            <motion.div
              key={teammate.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="group rounded-lg border border-neutral-200 bg-white transition-shadow hover:shadow-sm"
            >
              <div className="flex items-center gap-4 px-4 py-3">
                {/* Avatar */}
                <div className="relative flex-shrink-0">
                  {teammate.avatar_url ? (
                    <img
                      src={teammate.avatar_url}
                      alt={teammate.name || ""}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${getAvatarBg(teammate.type)}`}>
                      {getAvatarIcon(teammate.type)}
                    </div>
                  )}
                  {teammate.type === "agent" && teammate.availability !== "offline" && (
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-emerald-400" />
                  )}
                </div>

                {/* Info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-medium text-neutral-900">
                      {teammate.name || teammate.email || teammate.bot_id || "Unknown"}
                    </h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                        teammate.type === "agent"
                          ? "bg-purple-100 text-purple-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {teammate.type}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                    {teammate.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {teammate.email}
                      </span>
                    )}
                    {teammate.type === "agent" && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last active: {relativeTime(teammate.last_invoked_at)}
                      </span>
                    )}
                    {teammate.joined_at && (
                      <span>Joined {relativeTime(teammate.joined_at)}</span>
                    )}
                  </div>
                </div>

                {/* Role badge + selector */}
                <div className="flex items-center gap-2">
                  {isChanging ? (
                    <div className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5">
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-neutral-400" />
                      <span className="text-xs text-neutral-500">Updating…</span>
                    </div>
                  ) : showSuccess ? (
                    <div className="flex items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5">
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                      <span className="text-xs font-medium text-emerald-700">Updated</span>
                    </div>
                  ) : (
                    <>
                      {/* Prominent role badge — visible always */}
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-semibold group-hover:hidden ${config.badge}`}
                        title={config.description}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {config.label}
                      </span>

                      {/* Inline role selector — visible on hover */}
                      <div className="hidden group-hover:block">
                        <Select
                          value={role}
                          onValueChange={(v) => handleRoleChange(teammate.id, v as Role)}
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-8 gap-1.5 border-neutral-200 bg-white text-xs font-semibold"
                          >
                            <Shield className="h-3.5 w-3.5 text-neutral-500" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {(Object.entries(ROLE_CONFIG) as [Role, typeof config][]).map(
                              ([key, cfg]) => (
                                <SelectItem key={key} value={key}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{cfg.label}</span>
                                    <span className="text-[11px] text-neutral-400">
                                      {cfg.description}
                                    </span>
                                  </div>
                                </SelectItem>
                              )
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                    </>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() =>
                      setExpandedId(isExpanded ? null : teammate.id)
                    }
                    className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                    title="Show role details"
                  >
                    {isExpanded ? (
                      <ChevronUp className="h-3.5 w-3.5" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5" />
                    )}
                  </button>
                  <button
                    onClick={() => handleRemove(teammate.id, teammate.name)}
                    className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                    title="Remove from workspace"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              {/* Expandable role description */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="border-t border-neutral-100 px-4 py-3">
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg ${config.badge}`}
                        >
                          <Shield className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-800">
                            {config.label} Role
                          </p>
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {config.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Capabilities (for agents) */}
              {teammate.type === "agent" && (teammate.capabilities?.length ?? 0) > 0 && (
                <div className="border-t border-neutral-100 px-4 py-2">
                  <div className="flex flex-wrap gap-1.5">
                    {(teammate.capabilities ?? []).map((cap) => (
                      <span
                        key={cap}
                        className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
