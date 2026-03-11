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
  Bot,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ApiKeyRow {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  user_id: string;
  school_id: string | null;
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

type KeyType = "personal" | "agent";

function inferKeyType(key: ApiKeyRow): KeyType {
  if (key.scopes.some((s) => s === "agent" || s === "task" || s === "webhook")) {
    return "agent";
  }
  return "personal";
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ApiKeysManager({
  workspaceId,
}: {
  workspaceId: string | null;
}) {
  const [keys, setKeys] = useState<ApiKeyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<KeyType>("personal");
  const [creating, setCreating] = useState(false);

  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedNewKey, setCopiedNewKey] = useState(false);

  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/keys?school_id=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setKeys(json.data ?? []);
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
      const scopes =
        newType === "agent"
          ? ["read", "write", "task", "agent", "webhook"]
          : ["read", "write"];

      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName.trim(),
          school_id: workspaceId,
          scopes,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create key");
      }

      const result = await res.json();
      setNewlyCreatedKey(result.key);
      setShowNewKey(true);
      setNewName("");
      setNewType("personal");
      setShowCreate(false);
      fetchKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create key");
    } finally {
      setCreating(false);
    }
  }, [workspaceId, newName, newType, fetchKeys]);

  const handleRevoke = useCallback(
    async (keyId: string) => {
      if (!confirm("Revoke this API key? This cannot be undone.")) return;
      try {
        const res = await fetch(`/api/keys/${keyId}`, { method: "DELETE" });
        if (!res.ok) throw new Error("Failed to revoke");
        fetchKeys();
      } catch {
        setError("Failed to revoke key");
      }
    },
    [fetchKeys],
  );

  const toggleReveal = useCallback((keyId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(keyId)) next.delete(keyId);
      else next.add(keyId);
      return next;
    });
  }, []);

  const handleCopyPrefix = useCallback((keyId: string, prefix: string) => {
    navigator.clipboard.writeText(prefix + "••••••••");
    setCopiedKeyId(keyId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  }, []);

  const handleCopyNewKey = useCallback(() => {
    if (!newlyCreatedKey) return;
    navigator.clipboard.writeText(newlyCreatedKey);
    setCopiedNewKey(true);
    setTimeout(() => setCopiedNewKey(false), 2000);
  }, [newlyCreatedKey]);

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

      {newlyCreatedKey && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm text-emerald-800">
                  API Key Created
                </CardTitle>
                <CardDescription className="text-xs text-emerald-600">
                  Copy this key now — it will not be shown again.
                </CardDescription>
              </div>
              <button
                onClick={() => setNewlyCreatedKey(null)}
                className="text-emerald-400 hover:text-emerald-600"
              >
                &times;
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md border border-emerald-200 bg-white px-3 py-2 font-mono text-xs text-neutral-800">
                {showNewKey
                  ? newlyCreatedKey
                  : "••••••••••••••••••••••••••••••••"}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowNewKey(!showNewKey)}
                className="text-emerald-600 hover:bg-emerald-100"
              >
                {showNewKey ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyNewKey}
                className="text-emerald-600 hover:bg-emerald-100"
              >
                {copiedNewKey ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Key name (e.g. CI Pipeline, OpenClaw Agent)"
                className="h-9 flex-1 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as KeyType)}
                className="h-9 rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              >
                <option value="personal">Personal</option>
                <option value="agent">Agent</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Key className="h-3.5 w-3.5" />
                )}
                Generate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowCreate(false)}
              >
                Cancel
              </Button>
              <p className="ml-2 text-[11px] text-neutral-400">
                The full key is shown only once after creation.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">API Keys</CardTitle>
              <CardDescription className="text-xs">
                Manage personal and agent API keys for programmatic access.
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
                New Key
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
                  className="h-12 animate-pulse rounded-md bg-neutral-100"
                />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-12 text-center">
              <Key className="mx-auto h-10 w-10 text-neutral-300" />
              <h3 className="mt-3 text-sm font-medium text-neutral-700">
                No API keys
              </h3>
              <p className="mt-1 text-xs text-neutral-500">
                Create an API key for agent or programmatic access to your
                workspace.
              </p>
              <Button
                size="sm"
                className="mt-4"
                onClick={() => setShowCreate(true)}
              >
                <Plus className="h-3.5 w-3.5" />
                Create your first API key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const type = inferKeyType(k);
                  const isRevealed = revealedKeys.has(k.id);
                  const isCopied = copiedKeyId === k.id;

                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full ${
                              type === "agent"
                                ? "bg-purple-50"
                                : "bg-amber-50"
                            }`}
                          >
                            {type === "agent" ? (
                              <Bot className="h-3.5 w-3.5 text-purple-600" />
                            ) : (
                              <User className="h-3.5 w-3.5 text-amber-600" />
                            )}
                          </div>
                          <span className="text-sm text-neutral-900">
                            {k.name}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            type === "agent" ? "default" : "secondary"
                          }
                          className={
                            type === "agent"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-neutral-100 text-neutral-600"
                          }
                        >
                          {type === "agent" ? "Agent" : "Personal"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600">
                          {isRevealed
                            ? k.key_prefix + "••••••••"
                            : "••••••••••••"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.map((scope) => (
                            <Badge
                              key={scope}
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              {scope}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">
                        {formatDate(k.created_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => toggleReveal(k.id)}
                            title={
                              isRevealed ? "Hide key prefix" : "Reveal key prefix"
                            }
                          >
                            {isRevealed ? (
                              <EyeOff className="h-3.5 w-3.5" />
                            ) : (
                              <Eye className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() =>
                              handleCopyPrefix(k.id, k.key_prefix)
                            }
                            title="Copy key prefix"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleRevoke(k.id)}
                            className="text-neutral-400 hover:bg-red-50 hover:text-red-500"
                            title="Revoke key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
