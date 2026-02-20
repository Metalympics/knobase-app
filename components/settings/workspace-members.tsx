"use client";

import { useState, useCallback } from "react";
import { UserPlus, Copy, Check, RefreshCw } from "lucide-react";
import {
  getWorkspace,
  addMember,
  regenerateInviteCode,
} from "@/lib/workspaces/store";
import type { WorkspaceRole } from "@/lib/workspaces/types";
import { MemberList } from "@/components/permissions/member-list";
import { ROLE_LABELS } from "@/lib/permissions/acl";

interface WorkspaceMembersProps {
  workspaceId: string;
  onUpdate?: () => void;
}

export function WorkspaceMembers({
  workspaceId,
  onUpdate,
}: WorkspaceMembersProps) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("editor");
  const [bulkEmails, setBulkEmails] = useState("");
  const [showBulk, setShowBulk] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const [copied, setCopied] = useState(false);
  const ws = getWorkspace(workspaceId);

  const handleInvite = useCallback(() => {
    if (!email.trim()) return;
    addMember(workspaceId, {
      userId: crypto.randomUUID(),
      displayName: email.trim(),
      role,
    });
    setEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 2000);
    onUpdate?.();
  }, [email, role, workspaceId, onUpdate]);

  const handleBulkInvite = useCallback(() => {
    const emails = bulkEmails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter(Boolean);
    emails.forEach((em) => {
      addMember(workspaceId, {
        userId: crypto.randomUUID(),
        displayName: em,
        role,
      });
    });
    setBulkEmails("");
    setShowBulk(false);
    onUpdate?.();
  }, [bulkEmails, role, workspaceId, onUpdate]);

  const handleCopyCode = useCallback(() => {
    if (!ws) return;
    navigator.clipboard.writeText(ws.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [ws]);

  const handleRegenerateCode = useCallback(() => {
    regenerateInviteCode(workspaceId);
    onUpdate?.();
  }, [workspaceId, onUpdate]);

  if (!ws) return null;

  return (
    <div className="space-y-6">
      {/* Invite section */}
      <div className="rounded-lg border border-neutral-200 bg-white">
        <div className="border-b border-neutral-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-neutral-400" />
            <h3 className="text-sm font-medium text-neutral-800">
              Invite Members
            </h3>
          </div>
        </div>

        <div className="space-y-3 px-4 py-4">
          {showBulk ? (
            <div>
              <textarea
                value={bulkEmails}
                onChange={(e) => setBulkEmails(e.target.value)}
                placeholder="Enter emails separated by commas or newlines"
                className="h-24 w-full resize-none rounded-md border border-neutral-200 px-3 py-2 text-sm outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
              />
              <div className="mt-2 flex gap-2">
                <button
                  onClick={handleBulkInvite}
                  disabled={!bulkEmails.trim()}
                  className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
                >
                  Invite All
                </button>
                <button
                  onClick={() => setShowBulk(false)}
                  className="rounded-md px-4 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className="h-9 flex-1 rounded-md border border-neutral-200 px-3 text-sm outline-none placeholder:text-neutral-400 focus:border-purple-300 focus:ring-1 focus:ring-purple-100"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleInvite();
                  }}
                />
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as WorkspaceRole)}
                  className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-600 outline-none focus:border-purple-300"
                  aria-label="Select role"
                >
                  <option value="viewer">{ROLE_LABELS.viewer}</option>
                  <option value="editor">{ROLE_LABELS.editor}</option>
                  <option value="admin">{ROLE_LABELS.admin}</option>
                </select>
                <button
                  onClick={handleInvite}
                  disabled={!email.trim()}
                  className="rounded-md bg-neutral-900 px-4 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
                >
                  {inviteSent ? "Sent!" : "Invite"}
                </button>
              </div>
              <button
                onClick={() => setShowBulk(true)}
                className="text-xs text-neutral-400 hover:text-neutral-600"
              >
                Bulk invite multiple people
              </button>
            </>
          )}
        </div>
      </div>

      {/* Invite code */}
      <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium text-neutral-800">
              Invite Code
            </h3>
            <p className="mt-0.5 text-xs text-neutral-400">
              Share this code for people to join
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm font-medium tracking-wider text-neutral-700">
              {ws.inviteCode}
            </span>
            <button
              onClick={handleCopyCode}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              aria-label="Copy invite code"
            >
              {copied ? (
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              onClick={handleRegenerateCode}
              className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              title="Generate new code"
              aria-label="Regenerate invite code"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Member list */}
      <div className="rounded-lg border border-neutral-200 bg-white px-4 py-4">
        <MemberList workspaceId={workspaceId} onUpdate={onUpdate} />
      </div>
    </div>
  );
}
