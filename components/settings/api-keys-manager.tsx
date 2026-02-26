"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Clock,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  tier: "free" | "pro" | "enterprise";
  scopes: string[];
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ApiKeysManager({ workspaceId }: { workspaceId: string | null }) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  // Newly created key (shown once)
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showRawKey, setShowRawKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);

  const fetchKeys = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error: fetchErr } = await supabase
        .from("agent_api_keys")
        .select("id, name, key_prefix, tier, scopes, last_used_at, expires_at, created_at")
        .eq("workspace_id", workspaceId)
        .is("revoked_at", null)
        .order("created_at", { ascending: false });
      if (fetchErr) throw fetchErr;
      setKeys((data ?? []) as unknown as ApiKeyRow[]);
    } catch {
      setError("Failed to load API keys");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = useCallback(async () => {
    if (!workspaceId || !newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: "manual",
          workspaceId,
          name: newName.trim(),
          scopes: ["read", "write", "task"],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create key");
      }

      const result = await res.json();
      setNewlyCreatedKey(result.apiKey);
      setShowRawKey(true);
      setNewName("");
      setShowCreate(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }, [workspaceId, newName, fetchKeys]);

  const handleRevoke = useCallback(
    async (keyId: string) => {
      if (!confirm("Revoke this API key? This action cannot be undone.")) return;
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase
          .from("agent_api_keys")
          .update({ revoked_at: new Date().toISOString() })
          .eq("id", keyId);
        fetchKeys();
      } catch {
        setError("Failed to revoke key");
      }
    },
    [fetchKeys],
  );

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  }, []);

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
          <h2 className="text-lg font-semibold text-neutral-900">API Key Management</h2>
          <p className="mt-1 text-sm text-neutral-500">
            Generate API keys for external agents to authenticate with Knobase.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchKeys}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-md bg-purple-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600"
          >
            <Plus className="h-3.5 w-3.5" />
            New Key
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

      {/* Newly created key banner */}
      {newlyCreatedKey && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-sm font-medium text-emerald-800">
                API Key Created
              </h3>
              <p className="mt-0.5 text-xs text-emerald-600">
                Copy this key now — it will not be shown again.
              </p>
            </div>
            <button
              onClick={() => setNewlyCreatedKey(null)}
              className="text-emerald-400 hover:text-emerald-600"
            >
              &times;
            </button>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <code className="flex-1 rounded-md bg-white px-3 py-2 font-mono text-xs text-neutral-800 border border-emerald-200">
              {showRawKey ? newlyCreatedKey : "••••••••••••••••••••••••"}
            </code>
            <button
              onClick={() => setShowRawKey(!showRawKey)}
              className="rounded p-1.5 text-emerald-500 hover:bg-emerald-100"
            >
              {showRawKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
            <button
              onClick={() => handleCopy(newlyCreatedKey)}
              className="rounded p-1.5 text-emerald-500 hover:bg-emerald-100"
            >
              {copiedKey ? (
                <Check className="h-4 w-4 text-emerald-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* Create form */}
      {showCreate && (
        <div className="rounded-lg border border-neutral-200 bg-white p-4">
          <h3 className="text-sm font-medium text-neutral-800">Create API Key</h3>
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Key name (e.g. OpenClaw Agent)"
              className="h-9 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <button
              onClick={handleCreate}
              disabled={creating || !newName.trim()}
              className="flex items-center gap-1.5 rounded-md bg-purple-500 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-purple-600 disabled:opacity-50"
            >
              {creating ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Key className="h-3.5 w-3.5" />
              )}
              Generate
            </button>
            <button
              onClick={() => setShowCreate(false)}
              className="rounded-md border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
            >
              Cancel
            </button>
          </div>
          <p className="mt-2 text-xs text-neutral-400">
            The full key will be shown only once after creation. Store it securely.
          </p>
        </div>
      )}

      {/* Loading */}
      {loading && keys.length === 0 && (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-lg border border-neutral-200 bg-neutral-50" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && keys.length === 0 && !showCreate && (
        <div className="rounded-lg border border-dashed border-neutral-300 bg-white px-6 py-12 text-center">
          <Key className="mx-auto h-10 w-10 text-neutral-300" />
          <h3 className="mt-3 text-sm font-medium text-neutral-700">No API keys</h3>
          <p className="mt-1 text-xs text-neutral-500">
            Create an API key to allow external agents (e.g. OpenClaw) to connect.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md bg-purple-500 px-4 py-2 text-xs font-medium text-white hover:bg-purple-600"
          >
            <Plus className="h-3.5 w-3.5" />
            Create your first API key
          </button>
        </div>
      )}

      {/* Key list */}
      <div className="space-y-3">
        {keys.map((k) => (
          <div
            key={k.id}
            className="rounded-lg border border-neutral-200 bg-white"
          >
            <div className="flex items-center gap-4 px-4 py-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50">
                <Key className="h-4 w-4 text-amber-600" />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-medium text-neutral-900">
                    {k.name}
                  </h4>
                  <span className="inline-flex rounded-full bg-neutral-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                    {k.tier}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center gap-3 text-xs text-neutral-400">
                  <code className="rounded bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-500">
                    {k.key_prefix}••••••
                  </code>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Used: {relativeTime(k.last_used_at)}
                  </span>
                  {k.scopes.length > 0 && (
                    <span>
                      Scopes: {k.scopes.join(", ")}
                    </span>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleRevoke(k.id)}
                className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-500"
                title="Revoke key"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Usage info */}
      <div className="rounded-lg border border-neutral-200 bg-white px-4 py-3">
        <h3 className="text-sm font-medium text-neutral-800">Quick Start</h3>
        <p className="mt-1 text-xs text-neutral-500">
          Use your API key to register an agent and receive webhook notifications:
        </p>
        <pre className="mt-2 overflow-x-auto rounded-md bg-neutral-900 p-3 text-xs leading-relaxed text-neutral-300">
{`# 1. Register an agent
curl -X POST https://your-app.vercel.app/api/v1/agents/register \\
  -H "Authorization: Bearer kb_YOUR_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"agent_id": "my_agent_1", "name": "claw", "type": "openclaw"}'

# 2. Health check
curl https://your-app.vercel.app/api/v1/health`}
        </pre>
      </div>
    </div>
  );
}
