"use client";

import { useState, useCallback } from "react";
import { Users, Bot, Copy, Check, Loader2, KeyRound, ExternalLink, Zap, ChevronDown, ChevronUp, Clock } from "lucide-react";
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

const AGENT_ROLES: { value: SchoolRole; label: string; description: string }[] = [
  { value: "admin", label: "Admin", description: "Full workspace control" },
  { value: "editor", label: "Editor", description: "Create and edit documents" },
  { value: "viewer", label: "Viewer", description: "View and comment only" },
];

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
  const [tab, setTab] = useState<"human" | "agent" | "quick-connect">("human");

  // Human state
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<SchoolRole>("viewer");
  const [humanLoading, setHumanLoading] = useState(false);
  const [humanSuccess, setHumanSuccess] = useState(false);
  const [humanError, setHumanError] = useState<string | null>(null);

  // Agent state
  const [agentName, setAgentName] = useState("");
  const [agentDescription, setAgentDescription] = useState("");
  const [agentRole, setAgentRole] = useState<SchoolRole>("viewer");
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentError, setAgentError] = useState<string | null>(null);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keyCopied, setKeyCopied] = useState(false);

  // OpenClaw state
  const [openclawExpanded, setOpenclawExpanded] = useState(false);
  const [openclawCmdCopied, setOpenclawCmdCopied] = useState(false);
  const [customAgentExpanded, setCustomAgentExpanded] = useState(false);

  // Quick Connect state
  const [quickConnectLoading, setQuickConnectLoading] = useState(false);
  const [quickConnectError, setQuickConnectError] = useState<string | null>(null);
  const [quickConnectCommand, setQuickConnectCommand] = useState<string | null>(null);
  const [quickConnectExpiresAt, setQuickConnectExpiresAt] = useState<Date | null>(null);
  const [quickConnectCopied, setQuickConnectCopied] = useState(false);

  const resetHuman = useCallback(() => {
    setEmail("");
    setRole("viewer");
    setHumanSuccess(false);
    setHumanError(null);
  }, []);

  const resetAgent = useCallback(() => {
    setAgentName("");
    setAgentDescription("");
    setAgentRole("viewer");
    setAgentError(null);
    setGeneratedKey(null);
    setKeyCopied(false);
    setOpenclawExpanded(false);
    setOpenclawCmdCopied(false);
    setCustomAgentExpanded(false);
  }, []);

  const resetQuickConnect = useCallback(() => {
    setQuickConnectLoading(false);
    setQuickConnectError(null);
    setQuickConnectCommand(null);
    setQuickConnectExpiresAt(null);
    setQuickConnectCopied(false);
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

  /* ── Agent invite ────────────────────────────────────────────────── */

  const handleInviteAgent = useCallback(async () => {
    const name = agentName.startsWith("@") ? agentName : `@${agentName}`;
    if (name.length < 2) return;

    setAgentLoading(true);
    setAgentError(null);
    setGeneratedKey(null);

    try {
      const registerRes = await fetch("/api/v1/agents/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: name.slice(1),
          schoolId: workspaceId,
          name: name,
          role: agentRole,
          description: agentDescription.trim() || undefined,
        }),
      });

      if (!registerRes.ok) {
        const data = await registerRes.json().catch(() => null);
        throw new Error(data?.error ?? `Agent registration failed (${registerRes.status})`);
      }

      const keyRes = await fetch("/api/v1/agents/generate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: name.slice(1),
          schoolId: workspaceId,
        }),
      });

      if (!keyRes.ok) {
        const data = await keyRes.json().catch(() => null);
        throw new Error(data?.error ?? `Key generation failed (${keyRes.status})`);
      }

      const data = await keyRes.json();
      setGeneratedKey(data.apiKey);
    } catch (err) {
      setAgentError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setAgentLoading(false);
    }
  }, [agentName, agentDescription, agentRole, workspaceId]);

  const handleCopyKey = useCallback(() => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setKeyCopied(true);
    setTimeout(() => setKeyCopied(false), 2000);
  }, [generatedKey]);

  const handleCopyOpenclawCmd = useCallback(() => {
    navigator.clipboard.writeText("npx openclaw-knobase setup");
    setOpenclawCmdCopied(true);
    setTimeout(() => setOpenclawCmdCopied(false), 2000);
  }, []);

  /* ── Quick Connect ──────────────────────────────────────────────── */

  const handleQuickConnect = useCallback(async () => {
    setQuickConnectLoading(true);
    setQuickConnectError(null);
    setQuickConnectCommand(null);
    setQuickConnectExpiresAt(null);

    try {
      const res = await fetch("/api/agents/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Failed to generate invite (${res.status})`);
      }

      const data = await res.json();
      setQuickConnectCommand(data.command);
      setQuickConnectExpiresAt(new Date(Date.now() + data.expires_in * 1000));
    } catch (err) {
      setQuickConnectError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setQuickConnectLoading(false);
    }
  }, []);

  const handleCopyQuickConnect = useCallback(() => {
    if (!quickConnectCommand) return;
    navigator.clipboard.writeText(quickConnectCommand);
    setQuickConnectCopied(true);
    setTimeout(() => setQuickConnectCopied(false), 2000);
  }, [quickConnectCommand]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        resetHuman();
        resetAgent();
        resetQuickConnect();
      }
      onOpenChange(next);
    },
    [onOpenChange, resetHuman, resetAgent, resetQuickConnect],
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
          onValueChange={(v) => setTab(v as "human" | "agent" | "quick-connect")}
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
            <TabsTrigger value="quick-connect" className="flex-1 gap-1.5">
              <Zap className="size-3.5" />
              Quick Connect
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

          {/* ── Quick Connect tab ─────────────────────────────────── */}
          <TabsContent value="quick-connect" className="space-y-4 pt-4">
            {quickConnectCommand ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 px-4 py-3 dark:border-violet-800 dark:bg-violet-950">
                  <Zap className="size-4 shrink-0 text-violet-600 dark:text-violet-400" />
                  <p className="text-sm font-medium text-violet-800 dark:text-violet-200">
                    Run this in your terminal to connect OpenClaw
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Setup command</Label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md bg-muted px-3 py-2.5 font-mono text-xs leading-relaxed select-all break-all">
                      {quickConnectCommand}
                    </code>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyQuickConnect}
                      aria-label="Copy command"
                      className="shrink-0"
                    >
                      {quickConnectCopied ? (
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
                    {quickConnectExpiresAt && (
                      <> (at {quickConnectExpiresAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})</>
                    )}
                  </span>
                </div>

                <Separator />

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetQuickConnect}
                >
                  Generate new code
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
                    Generate a unique invite code and run the provided command in
                    your terminal. The code expires after 15 minutes.
                  </p>
                </div>

                {quickConnectError && (
                  <p className="text-sm text-destructive">{quickConnectError}</p>
                )}

                <Button
                  className="w-full"
                  disabled={quickConnectLoading}
                  onClick={handleQuickConnect}
                >
                  {quickConnectLoading ? (
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

          {/* ── Agent tab ──────────────────────────────────────────── */}
          <TabsContent value="agent" className="space-y-4 pt-4">
            {generatedKey ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800 dark:bg-emerald-950">
                  <KeyRound className="size-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                  <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                    Agent created — save this API key now
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>API Key</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      readOnly
                      value={generatedKey}
                      className="font-mono text-xs"
                    />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={handleCopyKey}
                      aria-label="Copy API key"
                    >
                      {keyCopied ? (
                        <Check className="size-4 text-emerald-600" />
                      ) : (
                        <Copy className="size-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This key will not be shown again. Store it securely.
                  </p>
                </div>

                <Button
                  variant="outline"
                  className="w-full"
                  onClick={resetAgent}
                >
                  Invite another agent
                </Button>
              </div>
            ) : (
              <>
                {/* ── Quick Connect: OpenClaw ──────────────────────── */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Zap className="size-3.5 text-amber-500" />
                    <span className="text-sm font-medium">Quick Connect</span>
                  </div>

                  <div className="rounded-lg border">
                    <button
                      type="button"
                      onClick={() => setOpenclawExpanded((v) => !v)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-indigo-600 text-xs font-bold text-white">
                          OC
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">@openclaw</span>
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              Featured
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Legal research &amp; contract analysis agent
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {!openclawExpanded && (
                          <span className="text-xs font-medium text-primary">Connect</span>
                        )}
                        {openclawExpanded ? (
                          <ChevronUp className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </button>

                    {openclawExpanded && (
                      <div className="border-t px-4 py-3 space-y-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs">One-command setup</Label>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 rounded-md bg-muted px-3 py-2 font-mono text-xs">
                              npx openclaw-knobase setup
                            </code>
                            <Button
                              size="icon"
                              variant="outline"
                              className="shrink-0"
                              onClick={handleCopyOpenclawCmd}
                              aria-label="Copy setup command"
                            >
                              {openclawCmdCopied ? (
                                <Check className="size-4 text-emerald-600" />
                              ) : (
                                <Copy className="size-4" />
                              )}
                            </Button>
                          </div>
                          <p className="text-[11px] text-muted-foreground">
                            Run this in your project directory to connect OpenClaw to this workspace.
                          </p>
                        </div>

                        <a
                          href="https://docs.openclaw.ai/knobase-integration"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                        >
                          <ExternalLink className="size-3" />
                          View full documentation
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <Separator />

                {/* ── Custom Agent ─────────────────────────────────── */}
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setCustomAgentExpanded((v) => !v)}
                    className="flex w-full items-center justify-between text-left"
                  >
                    <span className="text-sm font-medium">Custom Agent</span>
                    {customAgentExpanded ? (
                      <ChevronUp className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    )}
                  </button>

                  {customAgentExpanded && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="agent-name">Agent name</Label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                            @
                          </span>
                          <Input
                            id="agent-name"
                            placeholder="research-bot"
                            value={agentName.replace(/^@/, "")}
                            onChange={(e) => setAgentName(e.target.value.replace(/^@/, ""))}
                            className="pl-7"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent-desc">Description</Label>
                        <Input
                          id="agent-desc"
                          placeholder="Summarises research papers and extracts citations"
                          value={agentDescription}
                          onChange={(e) => setAgentDescription(e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="agent-role">Role</Label>
                        <Select
                          value={agentRole}
                          onValueChange={(v) => setAgentRole(v as SchoolRole)}
                        >
                          <SelectTrigger id="agent-role" className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {AGENT_ROLES.map((r) => (
                              <SelectItem key={r.value} value={r.value}>
                                <span>{r.label}</span>
                                <span className="ml-2 text-xs text-muted-foreground">
                                  — {r.description}
                                </span>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {agentError && (
                        <p className="text-sm text-destructive">{agentError}</p>
                      )}

                      <Button
                        className="w-full"
                        disabled={!agentName.replace(/^@/, "").trim() || agentLoading}
                        onClick={handleInviteAgent}
                      >
                        {agentLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Creating agent...
                          </>
                        ) : (
                          "Create agent & generate key"
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
