"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bot,
  Wifi,
  WifiOff,
  Clock,
  Trash2,
  RefreshCw,
  Badge,
  AlertCircle,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types (client-compatible mirror of Agent row)                       */
/* ------------------------------------------------------------------ */

interface ConnectedAgent {
  id: string;
  agent_id: string;
  name: string;
  type: "openclaw" | "knobase_ai" | "custom";
  version: string;
  capabilities: string[];
  platform: string | null;
  hostname: string | null;
  is_active: boolean;
  last_seen_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ConnectedAgents({ workspaceId }: { workspaceId: string | null }) {
  const [agents, setAgents] = useState<ConnectedAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
        .from("agents")
        .select("*")
        .eq("workspace_id", workspaceId)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      setAgents((data ?? []) as unknown as ConnectedAgent[]);
    } catch (err) {
      console.error("[ConnectedAgents] Fetch error:", err);
      setError("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleToggle = useCallback(
    async (agent: ConnectedAgent) => {
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase
          .from("agents")
          .update({ is_active: !agent.is_active })
          .eq("id", agent.id);
        fetchAgents();
      } catch {
        setError("Failed to update agent");
      }
    },
    [fetchAgents],
  );

  const handleDelete = useCallback(
    async (agentId: string) => {
      if (!confirm("Disconnect this agent? It will need to re-register.")) return;
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.from("agents").delete().eq("id", agentId);
        fetchAgents();
      } catch {
        setError("Failed to delete agent");
      }
    },
    [fetchAgents],
  );

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

  if (!workspaceId) {
    return (
      <div className="rounded-lg border border-neutral-200 bg-white px-6 py-8 text-center">
        <p className="text-sm text-neutral-500">No workspace selected.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-neutral-900">Connected Agents</h2>
          <p className="mt-1 text-sm text-neutral-500">
            External agents registered with your workspace via API key.
          </p>
        </div>
        <button
          onClick={fetchAgents}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && agents.length === 0 && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg border border-neutral-200 bg-neutral-50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && agents.length === 0 && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <Bot className="mx-auto h-10 w-10 text-neutral-300" />
          <h3 className="mt-3 text-sm font-medium text-neutral-700">No agents connected</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Generate an API key and use the{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-[11px]">
              POST /api/v1/agents/register
            </code>{" "}
            endpoint to connect an agent.
          </p>
          <div className="mt-4 rounded-md bg-neutral-900 p-3 text-left">
            <pre className="text-xs leading-relaxed text-neutral-300">
{`curl -X POST https://your-app.vercel.app/api/v1/agents/register \\
  -H "Authorization: Bearer kb_YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "knobase_agent_claw",
    "name": "claw",
    "type": "openclaw"
  }'`}
            </pre>
          </div>
        </div>
      )}

      {/* Agent list */}
      <AnimatePresence>
        {agents.map((agent) => (
          <motion.div
            key={agent.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="rounded-lg border border-neutral-200 bg-white"
          >
            <div className="flex items-center gap-4 px-4 py-3">
              {/* Status dot */}
              <div className="relative flex-shrink-0">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-50">
                  <Bot className="h-5 w-5 text-purple-600" />
                </div>
                <div
                  className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white ${
                    agent.is_active ? "bg-emerald-400" : "bg-neutral-300"
                  }`}
                />
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-neutral-900">{agent.name}</h4>
                  <span className="inline-flex items-center rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    {agent.type}
                  </span>
                  <span className="text-[10px] text-neutral-400">v{agent.version}</span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                  <span className="flex items-center gap-1">
                    {agent.is_active ? (
                      <Wifi className="h-3 w-3 text-emerald-500" />
                    ) : (
                      <WifiOff className="h-3 w-3" />
                    )}
                    {agent.is_active ? "Active" : "Inactive"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Last seen: {relativeTime(agent.last_seen_at)}
                  </span>
                  {agent.platform && (
                    <span>
                      {agent.platform}{agent.hostname ? ` · ${agent.hostname}` : ""}
                    </span>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => handleToggle(agent)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    agent.is_active
                      ? "border border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                      : "bg-purple-500 text-white hover:bg-purple-600"
                  }`}
                >
                  {agent.is_active ? "Disable" : "Enable"}
                </button>
                <button
                  onClick={() => handleDelete(agent.id)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Capabilities */}
            {agent.capabilities.length > 0 && (
              <div className="border-t border-neutral-100 px-4 py-2">
                <div className="flex flex-wrap gap-1.5">
                  {agent.capabilities.map((cap) => (
                    <span
                      key={cap}
                      className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2 py-0.5 text-[10px] font-medium text-purple-600"
                    >
                      <Badge className="h-2.5 w-2.5" />
                      {cap}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
