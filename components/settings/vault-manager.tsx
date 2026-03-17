"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus,
  Trash2,
  AlertCircle,
  RefreshCw,
  Shield,
  Clock,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

interface VaultKey {
  id: string;
  env_name: string;
  description: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  last_used_at: string | null;
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return "Never used";
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? "s" : ""} ago`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const ENV_NAME_PRESETS = [
  { label: "OpenAI", value: "OPENAI_API_KEY", desc: "OpenAI GPT API for text generation" },
  { label: "Anthropic", value: "ANTHROPIC_API_KEY", desc: "Claude API for long context tasks" },
  { label: "Google AI", value: "GOOGLE_AI_API_KEY", desc: "Google AI / Gemini API" },
  { label: "GitHub", value: "GITHUB_TOKEN", desc: "GitHub personal access token" },
  { label: "Notion", value: "NOTION_TOKEN", desc: "Notion integration token" },
];

export function VaultManager({ workspaceId }: { workspaceId: string | null }) {
  const [keys, setKeys] = useState<VaultKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [envName, setEnvName] = useState("");
  const [description, setDescription] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState("");
  const [editValue, setEditValue] = useState("");
  const [updating, setUpdating] = useState(false);

  const [creatorNames, setCreatorNames] = useState<Record<string, string>>({});

  const fetchKeys = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from("api_key_vault")
        .select("id, env_name, description, created_by, created_at, updated_at, last_used_at")
        .eq("school_id", workspaceId)
        .order("created_at", { ascending: true });

      if (fetchError) throw new Error(fetchError.message);
      setKeys(data ?? []);

      const creatorIds = [...new Set((data ?? []).map((k) => k.created_by).filter(Boolean))] as string[];
      if (creatorIds.length > 0) {
        const { data: users } = await supabase
          .from("users")
          .select("id, name")
          .in("id", creatorIds);
        if (users) {
          const map: Record<string, string> = {};
          for (const u of users) {
            map[u.id] = u.name ?? "Unknown";
          }
          setCreatorNames(map);
        }
      }
    } catch {
      setError("Failed to load vault keys");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchKeys();
  }, [fetchKeys]);

  const handleCreate = useCallback(async () => {
    if (!workspaceId || !envName.trim() || !secretValue.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/vault/internal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          school_id: workspaceId,
          env_name: envName.trim(),
          description: description.trim() || undefined,
          value: secretValue.trim(),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create vault key");
      }
      setEnvName("");
      setDescription("");
      setSecretValue("");
      setShowCreate(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create vault key");
    } finally {
      setCreating(false);
    }
  }, [workspaceId, envName, description, secretValue, fetchKeys]);

  const handleDelete = useCallback(
    async (keyId: string, keyName: string) => {
      if (!workspaceId) return;
      if (!confirm(`Delete "${keyName}" from the vault? This cannot be undone.`)) return;
      try {
        const res = await fetch(`/api/vault/internal/${keyId}?school_id=${workspaceId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete");
        fetchKeys();
      } catch {
        setError("Failed to delete vault key");
      }
    },
    [workspaceId, fetchKeys],
  );

  const startEdit = useCallback((key: VaultKey) => {
    setEditingId(key.id);
    setEditDescription(key.description ?? "");
    setEditValue("");
  }, []);

  const handleUpdate = useCallback(async () => {
    if (!workspaceId || !editingId) return;
    setUpdating(true);
    setError(null);
    try {
      const body: Record<string, string> = {};
      if (editDescription.trim()) body.description = editDescription.trim();
      if (editValue.trim()) body.value = editValue.trim();
      if (Object.keys(body).length === 0) {
        setEditingId(null);
        return;
      }
      body.school_id = workspaceId;

      const res = await fetch(`/api/vault/internal/${editingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update");
      setEditingId(null);
      fetchKeys();
    } catch {
      setError("Failed to update vault key");
    } finally {
      setUpdating(false);
    }
  }, [workspaceId, editingId, editDescription, editValue, fetchKeys]);

  const applyPreset = useCallback((preset: typeof ENV_NAME_PRESETS[number]) => {
    setEnvName(preset.value);
    setDescription(preset.desc);
  }, []);

  if (!workspaceId) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-sm text-muted-foreground">No workspace selected.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-600"
          >
            &times;
          </button>
        </div>
      )}

      {showCreate && (
        <Card className="border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Add API Key to Vault</CardTitle>
            <CardDescription className="text-xs">
              Agents will reference this key by its environment variable name.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-1.5">
              {ENV_NAME_PRESETS.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => applyPreset(preset)}
                  className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    envName === preset.value
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-neutral-200 bg-white text-neutral-600 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Environment Variable Name
              </label>
              <input
                type="text"
                value={envName}
                onChange={(e) => setEnvName(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
                placeholder="OPENAI_API_KEY"
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 font-mono text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
              <p className="mt-0.5 text-[11px] text-neutral-400">
                This is how agents will reference this key
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                Description (visible to agents)
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="OpenAI GPT-4 API for text generation"
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-neutral-600">
                API Key Value (secret)
              </label>
              <input
                type="password"
                value={secretValue}
                onChange={(e) => setSecretValue(e.target.value)}
                placeholder="sk-..."
                className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 font-mono text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                autoComplete="off"
              />
              <p className="mt-0.5 text-[11px] text-neutral-400">
                Encrypted with AES-256-GCM before storage
              </p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !envName.trim() || !secretValue.trim()}
              >
                {creating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Shield className="h-3.5 w-3.5" />
                )}
                Save Securely
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowCreate(false);
                  setEnvName("");
                  setDescription("");
                  setSecretValue("");
                }}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">API Key Vault</CardTitle>
              <CardDescription className="text-xs">
                Securely stored API keys that agents can retrieve on demand.
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchKeys}
                disabled={loading}
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button size="sm" onClick={() => setShowCreate(true)}>
                <Plus className="h-3.5 w-3.5" />
                Add Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && keys.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-16 animate-pulse rounded-md bg-neutral-100"
                />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center">
              <Shield className="mx-auto h-10 w-10 text-neutral-300" />
              <h3 className="mt-3 text-sm font-medium text-neutral-700">
                No API keys in vault
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Add API keys so agents can securely access third-party
                services.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Add your first key
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100">
              {keys.map((key) => (
                <div key={key.id} className="py-3 first:pt-0 last:pb-0">
                  {editingId === key.id ? (
                    <div className="space-y-2 rounded-lg border border-purple-200 bg-purple-50/50 p-3">
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                          Description
                        </label>
                        <input
                          type="text"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 text-xs text-neutral-700 outline-none focus:border-purple-300"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-medium text-neutral-500">
                          New Value (leave blank to keep current)
                        </label>
                        <input
                          type="password"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          placeholder="Leave blank to keep existing value"
                          className="h-8 w-full rounded-md border border-neutral-200 bg-white px-2.5 font-mono text-xs text-neutral-700 outline-none focus:border-purple-300"
                          autoComplete="off"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={handleUpdate}
                          disabled={updating}
                          className="h-7 text-xs"
                        >
                          {updating ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : null}
                          Save
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setEditingId(null)}
                          className="h-7 text-xs"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <code className="rounded bg-neutral-100 px-1.5 py-0.5 font-mono text-xs font-semibold text-neutral-800">
                            {key.env_name}
                          </code>
                        </div>
                        {key.description && (
                          <p className="mt-0.5 text-xs text-neutral-500">
                            {key.description}
                          </p>
                        )}
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-neutral-400">
                          <span>
                            Added{" "}
                            {key.created_by && creatorNames[key.created_by]
                              ? `by ${creatorNames[key.created_by]} `
                              : ""}
                            {formatDate(key.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatRelativeTime(key.last_used_at)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEdit(key)}
                          title="Edit key"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => handleDelete(key.id, key.env_name)}
                          className="text-neutral-400 hover:bg-red-50 hover:text-red-500"
                          title="Delete key"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
