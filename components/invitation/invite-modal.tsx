"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import {
  Users, Bot, Copy, Check, Loader2, Zap, Clock, Download,
  AlertTriangle, RefreshCw, CheckCircle2, PartyPopper, Search,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import type { SchoolRole } from "@/lib/schools/types";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface InviteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  workspaceName?: string;
}

interface ConnectedAgent {
  id: string;
  name: string;
  bot_id?: string;
  availability?: string;
  connected_at: string;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function InviteModal({
  open,
  onOpenChange,
  workspaceId,
  workspaceName,
}: InviteModalProps) {
  const [tab, setTab] = useState<"human" | "agent">("human");

  // Human state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SchoolRole>("viewer");
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanSuccess, setHumanSuccess] = useState(false);
  const [humanError, setHumanError] = useState<string | null>(null);

  // Agent (device code connect) state
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [agentCommand, setAgentCommand] = useState<string | null>(null);
  const [deviceCode, setDeviceCode] = useState<string | null>(null);
  const [agentExpiresAt, setAgentExpiresAt] = useState<Date | null>(null);
  const [agentCopied, setAgentCopied] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);
  const [agentName, setAgentName] = useState("OpenClaw Agent");
  const [regenerating, setRegenerating] = useState(false);

  // Status polling state
  const [checking, setChecking] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [connectedAgent, setConnectedAgent] = useState<ConnectedAgent | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const resetHuman = useCallback(() => {
    setEmail("");
    setRole("viewer");
    setHumanSuccess(false);
    setHumanError(null);
  }, []);

  const resetAgent = useCallback(() => {
    stopPolling();
    setAgentLoading(false);
    setAgentError(null);
    setAgentCommand(null);
    setDeviceCode(null);
    setAgentExpiresAt(null);
    setAgentCopied(false);
    setInstallCopied(false);
    setAgentName("OpenClaw Agent");
    setChecking(false);
    setIsPolling(false);
    setConnectedAgent(null);
    setStatusMessage(null);
  }, [stopPolling]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  /* ── Human invite ────────────────────────────────────────────────── */

  const handleInviteHuman = useCallback(async () => {
    if (!email.trim()) return;
    setHumanLoading(true);
    setHumanError(null);
    setHumanSuccess(false);

    try {
      const res = await fetch("/api/collaborators", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          role,
          workspace_id: workspaceId,
          type: "human",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Invitation failed (${res.status})`);
      }

      setHumanSuccess(true);
      setEmail("");
      setTimeout(() => setHumanSuccess(false), 3000);
    } catch (err) {
      setHumanError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setHumanLoading(false);
    }
  }, [email, role, workspaceId]);

  /* ── Agent connect ────────────────────────────────────────────────── */

  const handleAgentConnect = useCallback(async () => {
    setAgentLoading(true);
    setAgentError(null);
    setAgentCommand(null);
    setDeviceCode(null);
    setAgentExpiresAt(null);

    try {
      const res = await fetch("/api/agents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agentName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to generate invite (${res.status})`);
      }

      const data = await res.json();
      setAgentCommand(data.command);
      setDeviceCode(data.device_code);
      setAgentExpiresAt(new Date(Date.now() + data.expires_in * 1000));
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAgentLoading(false);
    }
  }, [agentName]);

  const handleRegenerateCode = useCallback(async () => {
    stopPolling();
    setRegenerating(true);
    setAgentError(null);
    setStatusMessage(null);
    setConnectedAgent(null);

    try {
      const res = await fetch("/api/agents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agent_name: agentName.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to regenerate code (${res.status})`);
      }

      const data = await res.json();
      setAgentCommand(data.command);
      setDeviceCode(data.device_code);
      setAgentExpiresAt(new Date(Date.now() + data.expires_in * 1000));
      setAgentCopied(false);
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRegenerating(false);
    }
  }, [agentName, stopPolling]);

  /* ── Status polling ────────────────────────────────────────────────── */

  const checkStatus = useCallback(async () => {
    if (!deviceCode) return;
    setChecking(true);
    setAgentError(null);
    setStatusMessage(null);

    try {
      const res = await fetch(
        `/api/agents/invite/status?device_code=${encodeURIComponent(deviceCode)}`,
      );
      const data = await res.json();

      if (data.status === "connected" && data.agent) {
        stopPolling();
        setConnectedAgent(data.agent);
      } else if (data.status === "expired") {
        stopPolling();
        setStatusMessage("Device code has expired. Please regenerate.");
      } else if (data.status === "not_found") {
        stopPolling();
        setStatusMessage("Device code not found. Please regenerate.");
      } else {
        setStatusMessage("Waiting for agent to connect...");
      }
    } catch {
      setStatusMessage("Could not reach server. Try again.");
    } finally {
      setChecking(false);
    }
  }, [deviceCode, stopPolling]);

  const startAutoPolling = useCallback(() => {
    stopPolling();
    checkStatus();
    pollRef.current = setInterval(checkStatus, 5000);
    setIsPolling(true);
  }, [checkStatus, stopPolling]);

  const copyToClipboard = useCallback(async (text: string): Promise<boolean> => {
    const blob = new Blob([text], { type: "text/plain" });
    try {
      if (navigator.clipboard?.write) {
        await navigator.clipboard.write([
          new ClipboardItem({ "text/plain": blob }),
        ]);
        return true;
      }
    } catch {
      /* try writeText next */
    }
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      ta.style.top = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.pointerEvents = "none";
      ta.style.opacity = "0";
      const container =
        document.querySelector('[role="dialog"]') ?? document.body;
      container.appendChild(ta);
      ta.focus();
      ta.select();
      ta.setSelectionRange(0, text.length);
      try {
        const ok = document.execCommand("copy");
        return ok;
      } catch {
        return false;
      } finally {
        container.removeChild(ta);
      }
    }
  }, []);

  const handleCopyFromCode = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const group = (e.currentTarget as HTMLElement).closest(".flex.items-center.gap-2");
      const codeEl = group?.querySelector("code");
      const text = codeEl?.textContent?.trim();
      if (!text) return;
      copyToClipboard(text).then((ok) => {
        if (ok) {
          const isConnect = text.startsWith("openclaw");
          if (isConnect) {
            setAgentCopied(true);
            setTimeout(() => setAgentCopied(false), 2000);
          } else {
            setInstallCopied(true);
            setTimeout(() => setInstallCopied(false), 2000);
          }
        }
      });
    },
    [copyToClipboard],
  );

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        resetHuman();
        resetAgent();
      }
      onOpenChange(next);
    },
    [onOpenChange, resetHuman, resetAgent],
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite to workspace</DialogTitle>
          <DialogDescription>
            {workspaceName
              ? `Add a collaborator to ${workspaceName}`
              : "Add a human or agent collaborator"}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={tab}
          onValueChange={(v) => setTab(v as "human" | "agent")}
          className="mt-1"
        >
          <TabsList className="w-full">
            <TabsTrigger value="human" className="flex-1 gap-1.5">
              <Users className="size-3.5" />
              Human
            </TabsTrigger>
            <TabsTrigger value="agent" className="flex-1 gap-1.5">
              <Bot className="size-3.5" />
              Agent
            </TabsTrigger>
          </TabsList>

          {/* ── Human tab ──────────────────────────────────────────── */}
          <TabsContent value="human" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleInviteHuman();
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select
                value={role}
                onValueChange={(v) => setRole(v as SchoolRole)}
              >
                <SelectTrigger id="invite-role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {humanError && (
              <p className="text-sm text-destructive">{humanError}</p>
            )}

            <Button
              className="w-full"
              disabled={!email.trim() || humanLoading}
              onClick={handleInviteHuman}
            >
              {humanLoading ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Sending...
                </>
              ) : humanSuccess ? (
                <>
                  <Check className="size-4" />
                  Invite sent!
                </>
              ) : (
                "Send invite"
              )}
            </Button>
          </TabsContent>

          {/* ── Agent tab ──────────────────────────────────────────── */}
          <TabsContent value="agent" className="space-y-4 pt-4">
            {/* ── Success view ──────────────────────────────────────── */}
            {connectedAgent ? (
              <div className="space-y-5">
                <div className="flex flex-col items-center gap-3 py-2">
                  <div className="flex size-16 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-200 dark:shadow-emerald-900/40">
                    <CheckCircle2 className="size-8 text-white" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <PartyPopper className="size-4 text-amber-500" />
                    <h3 className="text-lg font-semibold">Agent Connected!</h3>
                    <PartyPopper className="size-4 text-amber-500" />
                  </div>
                  <p className="text-sm text-muted-foreground text-center">
                    Your agent has been successfully added to the workspace.
                  </p>
                </div>

                <div className="rounded-lg border bg-muted/30 p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                      {connectedAgent.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{connectedAgent.name}</p>
                      <p className="text-xs text-muted-foreground font-mono truncate">
                        {connectedAgent.id}
                      </p>
                    </div>
                    <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-900/50 dark:text-emerald-300 border-0">
                      Online
                    </Badge>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => {
                    resetAgent();
                    onOpenChange(false);
                  }}
                >
                  <Check className="size-4" />
                  Done
                </Button>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetAgent}
                >
                  Invite another agent
                </Button>
              </div>

            ) : agentCommand ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950">
                  <Zap className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
                  <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                    Run this in your terminal to connect{" "}
                    <span className="font-semibold">{agentName.trim() || "OpenClaw"}</span>
                  </p>
                </div>

                {/* Connect to workspace */}
                <div className="rounded-lg border px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Zap className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
                    Connect to this workspace
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed select-all break-all">
                      {agentCommand}
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleCopyFromCode}
                      aria-label="Copy command"
                      className="shrink-0"
                    >
                      {agentCopied ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleRegenerateCode}
                      disabled={regenerating}
                      aria-label="Regenerate device code"
                      className="shrink-0"
                    >
                      <RefreshCw className={`size-4 ${regenerating ? "animate-spin" : ""}`} />
                    </Button>
                  </div>
                </div>

                {/* Install (optional) */}
                <div className="rounded-lg border px-4 py-3 space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Download className="size-4 shrink-0 text-muted-foreground" />
                    <span>Install the CLI</span>
                    <Badge variant="outline" className="ml-0.5 font-normal text-muted-foreground">
                      Optional
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    If you haven&apos;t installed the CLI yet, run:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed select-all break-all">
                      npx openclaw-knobase
                    </code>
                    <Button
                      type="button"
                      size="icon"
                      variant="outline"
                      onClick={handleCopyFromCode}
                      aria-label="Copy install command"
                      className="shrink-0"
                    >
                      {installCopied ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {agentError && (
                  <p className="text-sm text-destructive">{agentError}</p>
                )}

                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  <span>
                    Expires in 15 minutes
                    {agentExpiresAt && (
                      <> (at {agentExpiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</>
                    )}
                  </span>
                </div>

                <Separator />

                {/* Status check section */}
                <div className="space-y-2">
                  {statusMessage && (
                    <p className="text-xs text-muted-foreground text-center">
                      {statusMessage}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      variant={isPolling ? "default" : "outline"}
                      onClick={() => {
                        if (isPolling) {
                          stopPolling();
                          setStatusMessage(null);
                        } else {
                          startAutoPolling();
                        }
                      }}
                      disabled={checking && !isPolling}
                    >
                      {isPolling ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          Listening... (stop)
                        </>
                      ) : (
                        <>
                          <Search className="size-4" />
                          Auto-check connection
                        </>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={checkStatus}
                      disabled={checking}
                      aria-label="Check once"
                    >
                      {checking ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <RefreshCw className="size-4" />
                      )}
                    </Button>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-muted-foreground"
                  onClick={resetAgent}
                >
                  Start over
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center overflow-hidden rounded-lg bg-black">
                      <img src="/openclaw.png" alt="OpenClaw" className="size-full object-contain" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">One-Click Setup</p>
                      <p className="text-xs text-muted-foreground">
                        Connect OpenClaw to this workspace with a single command
                      </p>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed">
                      Generate a unique device code and run the provided command in
                    your terminal. The code expires after 15 minutes.
                  </p>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 dark:border-amber-700 dark:bg-amber-950">
                  <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <div className="space-y-1.5">
                    <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                      New to OpenClaw? Install the CLI first:
                    </p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 rounded-md bg-amber-100 px-3 py-2 font-mono text-xs leading-relaxed text-amber-900 select-all break-all dark:bg-amber-900 dark:text-amber-100">
                        npm install -g openclaw-knobase
                      </code>
                      <Button
                        type="button"
                        size="icon"
                        variant="outline"
                        onClick={handleCopyFromCode}
                        aria-label="Copy install command"
                        className="shrink-0 border-amber-300 hover:bg-amber-100 dark:border-amber-700 dark:hover:bg-amber-900"
                      >
                        {installCopied ? (
                          <Check className="size-4 text-emerald-600" />
                        ) : (
                          <Copy className="size-4 text-amber-700 dark:text-amber-300" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-name">
                    Agent Name <span className="text-muted-foreground font-normal">(optional)</span>
                  </Label>
                  <Input
                    id="agent-name"
                    placeholder="OpenClaw Agent"
                    value={agentName}
                    onChange={(e) => setAgentName(e.target.value)}
                  />
                </div>

                {agentError && (
                  <p className="text-sm text-destructive">{agentError}</p>
                )}

                <Button
                  className="w-full"
                  disabled={agentLoading}
                  onClick={handleAgentConnect}
                >
                  {agentLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Zap className="size-4" />
                      Generate connect command
                    </>
                  )}
                </Button>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
