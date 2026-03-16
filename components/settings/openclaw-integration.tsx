"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
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
import {
  Wifi,
  WifiOff,
  RefreshCw,
  Copy,
  Check,
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Terminal,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bot,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface DeviceCode {
  id: string;
  user_code: string;
  device_code: string;
  client_id: string;
  expires_at: string;
  user_id: string | null;
  access_token: string | null;
  created_at: string;
}

interface AgentApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  is_active: boolean;
  last_used_at: string | null;
  expires_at: string | null;
  created_at: string;
}

type ConnectionStatus = "connected" | "disconnected" | "pending" | "loading";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

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

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}

function secondsRemaining(expiresAt: string): number {
  return Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000));
}

/* ------------------------------------------------------------------ */
/* ConnectionStatusIndicator                                            */
/* ------------------------------------------------------------------ */

function ConnectionStatusIndicator({ status }: { status: ConnectionStatus }) {
  const config = {
    connected: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      icon: <Wifi className="h-4 w-4 text-emerald-600" />,
      label: "Connected",
      description: "OpenClaw CLI is connected and authorized.",
    },
    disconnected: {
      dot: "bg-neutral-400",
      bg: "bg-neutral-50",
      text: "text-neutral-600",
      icon: <WifiOff className="h-4 w-4 text-neutral-400" />,
      label: "Not Connected",
      description: "No active OpenClaw CLI connection. Generate a pairing code below to get started.",
    },
    pending: {
      dot: "bg-amber-400 animate-pulse",
      bg: "bg-amber-50",
      text: "text-amber-700",
      icon: <Clock className="h-4 w-4 text-amber-500" />,
      label: "Pending Authorization",
      description: "A pairing code is waiting to be confirmed.",
    },
    loading: {
      dot: "bg-neutral-300 animate-pulse",
      bg: "bg-neutral-50",
      text: "text-neutral-500",
      icon: <Loader2 className="h-4 w-4 text-neutral-400 animate-spin" />,
      label: "Checking...",
      description: "Checking connection status.",
    },
  }[status];

  return (
    <div className={`flex items-center gap-3 rounded-lg ${config.bg} p-4`}>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm">
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${config.dot}`} />
          <span className={`text-sm font-medium ${config.text}`}>{config.label}</span>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">{config.description}</p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PairingCodeSection                                                   */
/* ------------------------------------------------------------------ */

function PairingCodeSection({
  workspaceId,
  onStatusChange,
}: {
  workspaceId: string;
  onStatusChange: (status: ConnectionStatus) => void;
}) {
  const [deviceCode, setDeviceCode] = useState<DeviceCode | null>(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return stopPolling;
  }, [stopPolling]);

  useEffect(() => {
    if (!deviceCode) return;

    timerRef.current = setInterval(() => {
      const remaining = secondsRemaining(deviceCode.expires_at);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        stopPolling();
        setDeviceCode(null);
        onStatusChange("disconnected");
      }
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [deviceCode, stopPolling, onStatusChange]);

  const generateCode = useCallback(async () => {
    setGenerating(true);
    setError(null);

    try {
      const res = await fetch("/api/oauth/device/code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(
          errBody.error_description ?? errBody.message ?? "Failed to generate device code"
        );
      }

      const data = await res.json();

      const supabase = createClient();

      const newCode: DeviceCode = {
        id: data.device_code,
        device_code: data.device_code,
        user_code: data.user_code,
        client_id: "openclaw-cli",
        expires_at: new Date(Date.now() + data.expires_in * 1000).toISOString(),
        user_id: null,
        access_token: null,
        created_at: new Date().toISOString(),
      };

      setDeviceCode(newCode);
      setTimeLeft(data.expires_in);
      onStatusChange("pending");

      stopPolling();
      pollRef.current = setInterval(async () => {
        const { data: rows } = await supabase
          .from("oauth_device_codes")
          .select("user_id, access_token")
          .eq("device_code", data.device_code)
          .limit(1);

        const record = (rows as { user_id: string | null; access_token: string | null }[] | null)?.[0] ?? null;
        if (record?.user_id) {
          stopPolling();
          onStatusChange("connected");
          setDeviceCode(null);
        }
      }, (data.interval ?? 5) * 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate code");
      onStatusChange("disconnected");
    } finally {
      setGenerating(false);
    }
  }, [onStatusChange, stopPolling]);

  const copyCode = useCallback(async () => {
    if (!deviceCode) return;
    await navigator.clipboard.writeText(deviceCode.user_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [deviceCode]);

  const formatTimeLeft = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm">Device Pairing</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Generate a one-time code to pair your OpenClaw CLI with this workspace.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {error}
          </div>
        )}

        {deviceCode ? (
          <div className="space-y-3">
            <div className="flex flex-col items-center gap-3 rounded-lg border border-purple-200 bg-purple-50/50 p-6">
              <p className="text-xs font-medium text-purple-600">Your pairing code</p>
              <div className="flex items-center gap-3">
                <code className="rounded-lg bg-white px-5 py-3 font-mono text-2xl font-bold tracking-[0.3em] text-neutral-900 shadow-sm">
                  {deviceCode.user_code}
                </code>
                <Button variant="ghost" size="icon-sm" onClick={copyCode}>
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4 text-neutral-400" />
                  )}
                </Button>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                <Clock className="h-3 w-3" />
                Expires in {formatTimeLeft(timeLeft)}
              </div>
            </div>

            <div className="rounded-md bg-neutral-900 p-3">
              <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                Run in your terminal
              </p>
              <pre className="text-xs leading-relaxed text-neutral-300">
{`openclaw auth login --code ${deviceCode.user_code}`}
              </pre>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => {
                  stopPolling();
                  setDeviceCode(null);
                  onStatusChange("disconnected");
                }}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-purple-500 hover:bg-purple-600"
                onClick={generateCode}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
                New Code
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-8 text-center">
              <Terminal className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-3 text-sm font-medium text-neutral-700">
                Pair your CLI
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                Generate a pairing code, then enter it in the OpenClaw CLI to connect.
              </p>
              <Button
                size="sm"
                className="mt-4 bg-purple-500 hover:bg-purple-600"
                onClick={generateCode}
                disabled={generating}
              >
                {generating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Key className="h-3.5 w-3.5" />
                )}
                Generate Pairing Code
              </Button>
            </div>

            <div className="rounded-md bg-neutral-50 p-3">
              <p className="text-[11px] font-medium text-neutral-600">How it works</p>
              <ol className="mt-1.5 space-y-1 text-[11px] text-neutral-500">
                <li>1. Click &quot;Generate Pairing Code&quot; above</li>
                <li>2. Copy the code and run <code className="rounded bg-neutral-200 px-1 py-0.5 font-mono text-[10px]">openclaw auth login</code> in your terminal</li>
                <li>3. Enter the code when prompted — the CLI will receive an API key automatically</li>
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* ApiKeyManagementSection                                              */
/* ------------------------------------------------------------------ */

function ApiKeyManagementSection({ workspaceId }: { workspaceId: string }) {
  const [keys, setKeys] = useState<AgentApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<string | null>(null);
  const [showNewKey, setShowNewKey] = useState(false);
  const [copiedNewKey, setCopiedNewKey] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  const fetchKeys = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/agents/keys?schoolId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to load keys");
      const json = await res.json();
      setKeys(
        (json.data ?? []).map((k: Record<string, unknown>) => ({
          id: k.id as string,
          name: k.name as string,
          key_prefix: k.key_prefix as string,
          scopes: (k.scopes as string[]) ?? [],
          is_active: k.is_active !== false,
          last_used_at: k.last_used_at as string | null,
          expires_at: k.expires_at as string | null,
          created_at: k.created_at as string,
        })),
      );
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
    if (!newName.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/agents/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: workspaceId,
          schoolId: workspaceId,
          name: newName.trim(),
          scopes: ["read", "write", "task", "agent", "webhook"],
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create key");
      }
      const result = await res.json();
      setNewlyCreatedKey(result.apiKey);
      setShowNewKey(true);
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
      if (!confirm("Revoke this API key? This cannot be undone.")) return;
      try {
        const res = await fetch(`/api/v1/agents/keys/${keyId}`, { method: "DELETE" });
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

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-center gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto text-red-400 hover:text-red-600">
            &times;
          </button>
        </div>
      )}

      {newlyCreatedKey && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-sm text-emerald-800">API Key Created</CardTitle>
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
                {showNewKey ? newlyCreatedKey : "••••••••••••••••••••••••••••••••"}
              </code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setShowNewKey(!showNewKey)}
                className="text-emerald-600 hover:bg-emerald-100"
              >
                {showNewKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={handleCopyNewKey}
                className="text-emerald-600 hover:bg-emerald-100"
              >
                {copiedNewKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {showCreate && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Create Agent API Key</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Key name (e.g. OpenClaw Production)"
              className="h-9 w-full rounded-md border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="bg-purple-500 hover:bg-purple-600"
              >
                {creating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Key className="h-3.5 w-3.5" />
                )}
                Generate
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>
                Cancel
              </Button>
              <p className="ml-2 text-[11px] text-neutral-400">
                The full key is shown only once.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Key className="h-4 w-4 text-purple-500" />
              <div>
                <CardTitle className="text-sm">Agent API Keys</CardTitle>
                <CardDescription className="text-xs">
                  Keys used by OpenClaw CLI and agents to access this workspace.
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="xs" onClick={fetchKeys} disabled={loading}>
                <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                size="xs"
                onClick={() => setShowCreate(true)}
                className="bg-purple-500 hover:bg-purple-600"
              >
                <Plus className="h-3 w-3" />
                New Key
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && keys.length === 0 ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-neutral-100" />
              ))}
            </div>
          ) : keys.length === 0 ? (
            <div className="rounded-lg border border-dashed border-neutral-300 px-6 py-8 text-center">
              <Key className="mx-auto h-8 w-8 text-neutral-300" />
              <p className="mt-2 text-xs text-neutral-500">
                No agent API keys yet. Create one manually or pair via the Device Code Flow above.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Scopes</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {keys.map((k) => {
                  const isRevealed = revealedKeys.has(k.id);
                  const isCopied = copiedKeyId === k.id;

                  return (
                    <TableRow key={k.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-purple-50">
                            <Bot className="h-3 w-3 text-purple-600" />
                          </div>
                          <span className="text-xs text-neutral-900">{k.name}</span>
                          {!k.is_active && (
                            <Badge variant="outline" className="text-[9px] text-red-500 border-red-200">
                              Revoked
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-neutral-50 px-1.5 py-0.5 font-mono text-[11px] text-neutral-600">
                          {isRevealed ? k.key_prefix + "••••••••" : "••••••••••••"}
                        </code>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {k.scopes.slice(0, 3).map((scope) => (
                            <Badge
                              key={scope}
                              variant="outline"
                              className="text-[10px] font-normal"
                            >
                              {scope}
                            </Badge>
                          ))}
                          {k.scopes.length > 3 && (
                            <Badge variant="outline" className="text-[10px] font-normal">
                              +{k.scopes.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-neutral-500">
                        {relativeTime(k.last_used_at)}
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
                            title={isRevealed ? "Hide" : "Reveal"}
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
                            onClick={() => handleCopyPrefix(k.id, k.key_prefix)}
                            title="Copy prefix"
                          >
                            {isCopied ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </Button>
                          {k.is_active && (
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => handleRevoke(k.id)}
                              className="text-neutral-400 hover:bg-red-50 hover:text-red-500"
                              title="Revoke"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
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

/* ------------------------------------------------------------------ */
/* CLIInstructions                                                      */
/* ------------------------------------------------------------------ */

function CLIInstructions() {
  const [copiedCmd, setCopiedCmd] = useState<string | null>(null);

  const copyCommand = useCallback(async (cmd: string, id: string) => {
    await navigator.clipboard.writeText(cmd);
    setCopiedCmd(id);
    setTimeout(() => setCopiedCmd(null), 2000);
  }, []);

  const commands = [
    { id: "install", label: "Install", cmd: "npm install -g @openclaw/cli" },
    { id: "login", label: "Authenticate", cmd: "openclaw auth login" },
    { id: "status", label: "Check status", cmd: "openclaw status" },
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-purple-500" />
          <CardTitle className="text-sm">CLI Quick Start</CardTitle>
        </div>
        <CardDescription className="text-xs">
          Install and connect the OpenClaw CLI to interact with your workspace.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {commands.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-md bg-neutral-900 px-3 py-2"
            >
              <div>
                <span className="text-[10px] font-medium uppercase tracking-wider text-neutral-500">
                  {c.label}
                </span>
                <pre className="mt-0.5 font-mono text-xs text-neutral-300">{c.cmd}</pre>
              </div>
              <Button
                variant="ghost"
                size="icon-xs"
                onClick={() => copyCommand(c.cmd, c.id)}
                className="text-neutral-500 hover:bg-neutral-800 hover:text-neutral-300"
              >
                {copiedCmd === c.id ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* OpenClawIntegration (main export)                                    */
/* ------------------------------------------------------------------ */

export function OpenClawIntegration({ workspaceId }: { workspaceId: string | null }) {
  const [connStatus, setConnStatus] = useState<ConnectionStatus>("loading");

  useEffect(() => {
    if (!workspaceId) {
      setConnStatus("disconnected");
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const supabase = createClient();

        const deviceCheckClient = supabase as unknown as {
          from: (table: string) => {
            select: (cols: string) => {
              eq: (col: string, val: string) => {
                is: (col: string, val: null) => {
                  gt: (col: string, val: string) => {
                    limit: (n: number) => Promise<{ data: { id: string }[] | null }>
                  }
                }
              }
            }
          }
        };
        const { data: pending } = await deviceCheckClient
          .from("oauth_device_codes")
          .select("id")
          .eq("client_id", "openclaw-cli")
          .is("user_id", null)
          .gt("expires_at", new Date().toISOString())
          .limit(1);

        if (cancelled) return;

        if (pending && pending.length > 0) {
          setConnStatus("pending");
          return;
        }

        const res = await fetch(`/api/v1/agents/keys?schoolId=${workspaceId}`);
        if (!res.ok) {
          setConnStatus("disconnected");
          return;
        }

        const json = await res.json();
        const activeKeys = (json.data ?? []).filter(
          (k: Record<string, unknown>) => k.is_active !== false,
        );

        if (cancelled) return;
        setConnStatus(activeKeys.length > 0 ? "connected" : "disconnected");
      } catch {
        if (!cancelled) setConnStatus("disconnected");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [workspaceId]);

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
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-neutral-900">OpenClaw Integration</h2>
        <p className="mt-1 text-sm text-neutral-500">
          Connect the OpenClaw CLI to your workspace using the Device Code Flow, or manage agent API keys directly.
        </p>
      </div>

      <ConnectionStatusIndicator status={connStatus} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PairingCodeSection workspaceId={workspaceId} onStatusChange={setConnStatus} />
        <CLIInstructions />
      </div>

      <ApiKeyManagementSection workspaceId={workspaceId} />
    </div>
  );
}
