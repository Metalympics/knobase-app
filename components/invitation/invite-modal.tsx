"use client";

import { useState, useCallback } from "react";
import { Users, Bot, Copy, Check, Loader2, KeyRound } from "lucide-react";
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
  const [tab, setTab] = useState<"human" | "agent">("human");

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
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
