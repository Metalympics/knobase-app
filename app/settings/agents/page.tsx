"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  Wifi,
  WifiOff,
  Clock,
  ShieldX,
  RefreshCw,
  AlertCircle,
  Plus,
  X,
  ChevronRight,
  Send,
  Copy,
  Check,
} from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SettingsSubNav } from "@/components/settings/settings-sub-nav";
import { getActiveWorkspaceId, getOrCreateDefaultWorkspace } from "@/lib/schools/store";

type DetailTab = "overview" | "files" | "settings";

interface AgentItem {
  id: string;
  bot_id: string | null;
  name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  description: string | null;
  capabilities: string[] | null;
  expertise: string[] | null;
  availability: string | null;
  agent_type: string | null;
  total_invocations: number;
  last_invoked_at: string | null;
  created_at: string;
}

interface AgentApiKey {
  id: string;
  agent_id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
  revoked_at: string | null;
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

function isOnline(agent: AgentItem): boolean {
  return agent.availability === "online" || agent.availability === "busy";
}

function statusLabel(agent: AgentItem): string {
  if (agent.availability === "busy") return "Busy";
  if (isOnline(agent)) return "Online";
  return "Offline";
}

function statusColor(agent: AgentItem): string {
  if (agent.availability === "busy") return "bg-amber-400";
  if (isOnline(agent)) return "bg-emerald-400";
  return "bg-neutral-300";
}

function agentDisplayName(agent: AgentItem): string {
  return agent.display_name || agent.name || agent.bot_id || "Unnamed Agent";
}

function agentInitials(agent: AgentItem): string {
  const n = agentDisplayName(agent);
  return n
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

export default function AgentsPage() {
  const router = useRouter();
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [agents, setAgents] = useState<AgentItem[]>([]);
  const [apiKeys, setApiKeys] = useState<Record<string, AgentApiKey[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  const [selectedAgent, setSelectedAgent] = useState<AgentItem | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("overview");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  useEffect(() => {
    const wsId = getActiveWorkspaceId();
    if (wsId) {
      setWorkspaceId(wsId);
    } else {
      setWorkspaceId(getOrCreateDefaultWorkspace().id);
    }
  }, []);

  const fetchAgents = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { data, error: fetchErr } = await supabase
        .from("users")
        .select(
          "id, bot_id, name, display_name, avatar_url, description, capabilities, expertise, availability, agent_type, total_invocations, last_invoked_at, created_at"
        )
        .eq("school_id", workspaceId)
        .eq("type", "agent")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false });

      if (fetchErr) throw fetchErr;
      const agentList = (data ?? []) as unknown as AgentItem[];
      setAgents(agentList);

      if (agentList.length > 0) {
        const { data: keyData } = await supabase
          .from("agent_api_keys")
          .select("id, agent_id, name, key_prefix, scopes, is_active, last_used_at, expires_at, created_at, revoked_at")
          .eq("school_id", workspaceId)
          .in(
            "agent_id",
            agentList.map((a) => a.id)
          );

        const keyMap: Record<string, AgentApiKey[]> = {};
        for (const key of (keyData ?? []) as unknown as AgentApiKey[]) {
          if (!keyMap[key.agent_id]) keyMap[key.agent_id] = [];
          keyMap[key.agent_id].push(key);
        }
        setApiKeys(keyMap);
      }
    } catch (err) {
      console.error("[AgentsPage] Fetch error:", err);
      setError("Failed to load agents");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleRevoke = useCallback(
    async (agent: AgentItem) => {
      if (!confirm(`Revoke access for "${agentDisplayName(agent)}"? This will delete its API keys and suspend the agent.`))
        return;
      setRevoking(agent.id);
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();

        const agentKeys = apiKeys[agent.id] ?? [];
        if (agentKeys.length > 0) {
          await supabase
            .from("agent_api_keys")
            .update({ is_active: false, revoked_at: new Date().toISOString() })
            .in(
              "id",
              agentKeys.map((k) => k.id)
            );
        }

        await supabase
          .from("users")
          .update({ is_suspended: true, availability: "offline" })
          .eq("id", agent.id);

        await fetchAgents();
      } catch {
        setError("Failed to revoke agent access");
      } finally {
        setRevoking(null);
      }
    },
    [apiKeys, fetchAgents]
  );

  const copyInviteSnippet = useCallback(() => {
    const snippet = `curl -X POST https://your-app.com/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "knobase_agent_my-agent",
    "name": "my-agent",
    "type": "openclaw",
    "capabilities": ["mention_response"]
  }'`;
    navigator.clipboard.writeText(snippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <SettingsSubNav />

      {/* Header */}
      <div className="border-b border-neutral-100 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
              <Bot className="h-5 w-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-neutral-900">Agents</h1>
              <p className="text-xs text-neutral-500">
                Manage agents connected to your workspace
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAgents}
              disabled={loading}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setShowInviteModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Invite Agent
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-8">
        {error && (
          <div className="mb-6 flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {loading && agents.length === 0 ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[140px] animate-pulse rounded-xl border border-neutral-200 bg-white" />
            ))}
          </div>
        ) : agents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-neutral-300 bg-white px-6 py-16 text-center">
            <Bot className="mx-auto h-12 w-12 text-neutral-300" />
            <h3 className="mt-4 text-sm font-medium text-neutral-700">No agents connected</h3>
            <p className="mx-auto mt-1 max-w-sm text-xs text-neutral-500">
              Register an agent via the REST API, or click "Invite Agent" to get started.
            </p>
            <Button size="sm" className="mt-5" onClick={() => setShowInviteModal(true)}>
              <Plus className="h-3.5 w-3.5" />
              Invite Agent
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {agents.map((agent) => {
              const keys = apiKeys[agent.id] ?? [];
              const activeKeys = keys.filter((k) => k.is_active);
              const allScopes = [...new Set(keys.flatMap((k) => k.scopes))];

              return (
                <Card
                  key={agent.id}
                  className="cursor-pointer gap-0 overflow-hidden py-0 transition-shadow hover:shadow-md"
                  onClick={() => { setSelectedAgent(agent); setDetailTab("overview"); }}
                >
                  <CardHeader className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      {/* Avatar */}
                      <div className="relative shrink-0">
                        {agent.avatar_url ? (
                          <img
                            src={agent.avatar_url}
                            alt={agentDisplayName(agent)}
                            className="h-11 w-11 rounded-full object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-purple-100 text-sm font-semibold text-purple-700">
                            {agentInitials(agent)}
                          </div>
                        )}
                        <div
                          className={`absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white ${statusColor(agent)}`}
                          title={statusLabel(agent)}
                        />
                      </div>

                      {/* Name + meta */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="truncate text-sm">
                            {agentDisplayName(agent)}
                          </CardTitle>
                          {agent.agent_type && (
                            <Badge variant="secondary" className="shrink-0 text-[10px] uppercase tracking-wider">
                              {agent.agent_type}
                            </Badge>
                          )}
                          <Badge
                            variant={isOnline(agent) ? "default" : "outline"}
                            className={`shrink-0 text-[10px] ${
                              isOnline(agent)
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                : "text-neutral-500"
                            }`}
                          >
                            <span className={`mr-1 inline-block h-1.5 w-1.5 rounded-full ${statusColor(agent)}`} />
                            {statusLabel(agent)}
                          </Badge>
                        </div>
                        {agent.description && (
                          <p className="mt-0.5 truncate text-xs text-neutral-500">{agent.description}</p>
                        )}
                        <div className="mt-1.5 flex items-center gap-3 text-[11px] text-neutral-400">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Last seen {relativeTime(agent.last_invoked_at)}
                          </span>
                          <span>{agent.total_invocations} invocations</span>
                          <span>{activeKeys.length} active key{activeKeys.length !== 1 ? "s" : ""}</span>
                        </div>
                      </div>

                      {/* Revoke + chevron */}
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="xs"
                          className="text-red-500 hover:bg-red-50 hover:text-red-600"
                          disabled={revoking === agent.id}
                          onClick={() => handleRevoke(agent)}
                        >
                          <ShieldX className="h-3.5 w-3.5" />
                          {revoking === agent.id ? "Revoking..." : "Revoke"}
                        </Button>
                        <ChevronRight className="h-4 w-4 text-neutral-300" />
                      </div>
                    </div>
                  </CardHeader>

                  {/* Scopes / capabilities */}
                  {(allScopes.length > 0 || (agent.capabilities?.length ?? 0) > 0) && (
                    <CardContent className="border-t border-neutral-100 px-5 py-2.5">
                      <div className="flex flex-wrap gap-1.5">
                        {allScopes.map((scope) => (
                          <Badge key={`scope-${scope}`} variant="outline" className="text-[10px]">
                            {scope}
                          </Badge>
                        ))}
                        {(agent.capabilities ?? []).map((cap) => (
                          <Badge key={`cap-${cap}`} variant="secondary" className="text-[10px]">
                            {cap}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Agent Detail Sheet */}
      {selectedAgent && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedAgent(null)} />
          <div className="relative w-full max-w-md overflow-y-auto bg-white shadow-xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-4">
              <h2 className="text-sm font-semibold text-neutral-900">Agent Details</h2>
              <button
                onClick={() => setSelectedAgent(null)}
                className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-6 px-6 py-6">
              {/* Profile */}
              <div className="flex items-center gap-4">
                <div className="relative shrink-0">
                  {selectedAgent.avatar_url ? (
                    <img
                      src={selectedAgent.avatar_url}
                      alt={agentDisplayName(selectedAgent)}
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 text-base font-semibold text-purple-700">
                      {agentInitials(selectedAgent)}
                    </div>
                  )}
                  <div
                    className={`absolute -bottom-0.5 -right-0.5 h-4 w-4 rounded-full border-2 border-white ${statusColor(selectedAgent)}`}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-neutral-900">
                    {agentDisplayName(selectedAgent)}
                  </h3>
                  {selectedAgent.bot_id && selectedAgent.name !== selectedAgent.bot_id && (
                    <p className="text-xs font-mono text-neutral-400">{selectedAgent.bot_id}</p>
                  )}
                  <div className="mt-1 flex items-center gap-2">
                    {selectedAgent.agent_type && (
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                        {selectedAgent.agent_type}
                      </Badge>
                    )}
                    <Badge
                      variant={isOnline(selectedAgent) ? "default" : "outline"}
                      className={`text-[10px] ${
                        isOnline(selectedAgent)
                          ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                          : "text-neutral-500"
                      }`}
                    >
                      {isOnline(selectedAgent) ? (
                        <Wifi className="mr-1 h-2.5 w-2.5" />
                      ) : (
                        <WifiOff className="mr-1 h-2.5 w-2.5" />
                      )}
                      {statusLabel(selectedAgent)}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedAgent.description && (
                <div>
                  <h4 className="mb-1 text-xs font-medium text-neutral-500 uppercase tracking-wider">Description</h4>
                  <p className="text-sm text-neutral-700">{selectedAgent.description}</p>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-neutral-50 p-3 text-center">
                  <p className="text-lg font-semibold text-neutral-900">{selectedAgent.total_invocations}</p>
                  <p className="text-[10px] text-neutral-500">Invocations</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3 text-center">
                  <p className="text-sm font-medium text-neutral-700">{relativeTime(selectedAgent.last_invoked_at)}</p>
                  <p className="text-[10px] text-neutral-500">Last Seen</p>
                </div>
                <div className="rounded-lg bg-neutral-50 p-3 text-center">
                  <p className="text-sm font-medium text-neutral-700">
                    {new Date(selectedAgent.created_at).toLocaleDateString()}
                  </p>
                  <p className="text-[10px] text-neutral-500">Registered</p>
                </div>
              </div>

              {/* Capabilities */}
              {(selectedAgent.capabilities?.length ?? 0) > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Capabilities</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedAgent.capabilities ?? []).map((cap) => (
                      <Badge key={cap} variant="secondary" className="text-[10px]">
                        {cap}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Expertise */}
              {(selectedAgent.expertise?.length ?? 0) > 0 && (
                <div>
                  <h4 className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">Expertise</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {(selectedAgent.expertise ?? []).map((exp) => (
                      <Badge key={exp} variant="outline" className="text-[10px]">
                        {exp}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* API Keys */}
              <div>
                <h4 className="mb-2 text-xs font-medium text-neutral-500 uppercase tracking-wider">API Keys</h4>
                {(apiKeys[selectedAgent.id] ?? []).length === 0 ? (
                  <p className="text-xs text-neutral-400">No API keys found for this agent.</p>
                ) : (
                  <div className="space-y-2">
                    {(apiKeys[selectedAgent.id] ?? []).map((key) => (
                      <div
                        key={key.id}
                        className={`rounded-lg border px-3 py-2 text-xs ${
                          key.is_active
                            ? "border-neutral-200 bg-white"
                            : "border-neutral-100 bg-neutral-50 opacity-60"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-neutral-700">{key.key_prefix}...</span>
                          <Badge
                            variant={key.is_active ? "default" : "destructive"}
                            className={`text-[9px] ${
                              key.is_active ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100" : ""
                            }`}
                          >
                            {key.is_active ? "Active" : "Revoked"}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[10px] text-neutral-400">
                          <span>{key.name}</span>
                          {key.last_used_at && <span>Used {relativeTime(key.last_used_at)}</span>}
                        </div>
                        {key.scopes.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {key.scopes.map((s) => (
                              <Badge key={s} variant="outline" className="text-[9px]">
                                {s}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex gap-2 border-t border-neutral-200 pt-4">
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={revoking === selectedAgent.id}
                  onClick={() => {
                    handleRevoke(selectedAgent);
                    setSelectedAgent(null);
                  }}
                >
                  <ShieldX className="h-3.5 w-3.5" />
                  {revoking === selectedAgent.id ? "Revoking..." : "Revoke Access"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    router.push(`/settings?tab=analytics`);
                    setSelectedAgent(null);
                  }}
                >
                  View Analytics
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Agent Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowInviteModal(false)} />
          <Card className="relative z-10 w-full max-w-lg shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50">
                    <Send className="h-4 w-4 text-indigo-600" />
                  </div>
                  <CardTitle className="text-base">Invite Agent</CardTitle>
                </div>
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <p className="text-sm text-neutral-600">
                Register a new agent by calling the REST API with a valid API key. Follow the steps below.
              </p>

              <div className="space-y-3">
                <div className="rounded-md bg-neutral-50 p-3">
                  <p className="mb-1 text-xs font-medium text-neutral-700">1. Generate an API key</p>
                  <p className="text-[11px] text-neutral-500">
                    Go to{" "}
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        router.push("/settings/api-keys");
                      }}
                      className="font-medium text-purple-600 hover:underline"
                    >
                      Settings &rarr; API Keys
                    </button>{" "}
                    and create a new key with <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[10px]">agents:write</code> scope.
                  </p>
                </div>

                <div className="rounded-md bg-neutral-50 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-medium text-neutral-700">2. Register via API</p>
                    <button
                      onClick={copyInviteSnippet}
                      className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] text-neutral-500 transition-colors hover:bg-neutral-200 hover:text-neutral-700"
                    >
                      {copiedSnippet ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                      {copiedSnippet ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <pre className="overflow-x-auto rounded bg-neutral-900 px-3 py-2 text-[11px] leading-relaxed text-green-400">
{`curl -X POST https://your-app.com/api/v1/agents/register \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "agent_id": "knobase_agent_my-agent",
    "name": "my-agent",
    "type": "openclaw",
    "capabilities": ["mention_response"]
  }'`}
                  </pre>
                </div>

                <div className="rounded-md bg-neutral-50 p-3">
                  <p className="mb-1 text-xs font-medium text-neutral-700">3. Send heartbeats</p>
                  <p className="text-[11px] text-neutral-500">
                    Keep the agent online by sending periodic heartbeat requests to{" "}
                    <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[10px]">
                      POST /api/v1/agents/heartbeat
                    </code>
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-end gap-2 border-t border-neutral-100 pt-4">
              <Button variant="outline" size="sm" onClick={() => setShowInviteModal(false)}>
                Close
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setShowInviteModal(false);
                  router.push("/settings/api-keys");
                }}
              >
                Go to API Keys
              </Button>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
