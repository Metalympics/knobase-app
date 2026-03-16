"use client";

import { useState, useCallback } from "react";
import { Users, Bot, Copy, Check, Loader2, Zap, Clock, Download, AlertTriangle } from "lucide-react";
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
  const [agentExpiresAt, setAgentExpiresAt] = useState<Date | null>(null);
  const [agentCopied, setAgentCopied] = useState(false);
  const [installCopied, setInstallCopied] = useState(false);
  const [agentName, setAgentName] = useState("OpenClaw Agent");

  const resetHuman = useCallback(() => {
    setEmail("");
    setRole("viewer");
    setHumanSuccess(false);
    setHumanError(null);
  }, []);

  const resetAgent = useCallback(() => {
    setAgentLoading(false);
    setAgentError(null);
    setAgentCommand(null);
    setAgentExpiresAt(null);
    setAgentCopied(false);
    setInstallCopied(false);
    setAgentName("OpenClaw Agent");
  }, []);

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
      setAgentExpiresAt(new Date(Date.now() + data.expires_in * 1000));
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAgentLoading(false);
    }
  }, [agentName]);

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
            {agentCommand ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950">
                  <Zap className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
                  <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                    Run this in your terminal to connect{" "}
                    <span className="font-semibold">{agentName.trim() || "OpenClaw"}</span>
                  </p>
                </div>

                {/* Connect to workspace — primary, ready instantly */}
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
                  </div>
                </div>

                {/* Install (optional, always visible) */}
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

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetAgent}
                >
                  Generate new device code
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white">
                      OC
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
