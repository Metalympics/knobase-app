"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Link2,
  Copy,
  Check,
  Globe,
  Lock,
  Users,
  Shield,
  Clock,
} from "lucide-react";
import type { WorkspaceRole } from "@/lib/workspaces/types";
import {
  type DocumentAccess,
  getDocumentAccess,
  setDocumentAccess,
  ROLE_LABELS,
} from "@/lib/permissions/acl";
import { getWorkspace, addMember } from "@/lib/workspaces/store";

interface ShareModalProps {
  documentId: string;
  documentTitle: string;
  workspaceId: string;
  onClose: () => void;
}

export function ShareModal({
  documentId,
  documentTitle,
  workspaceId,
  onClose,
}: ShareModalProps) {
  const [access, setAccess] = useState<DocumentAccess>(() =>
    getDocumentAccess(documentId)
  );
  const [email, setEmail] = useState("");
  const [selectedRole, setSelectedRole] = useState<WorkspaceRole>("viewer");
  const [copied, setCopied] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);
  const ws = getWorkspace(workspaceId);

  const handleAccessChange = useCallback(
    (newAccess: DocumentAccess) => {
      setAccess(newAccess);
      setDocumentAccess(documentId, newAccess);
    },
    [documentId]
  );

  const handleInvite = useCallback(() => {
    if (!email.trim() || !ws) return;
    addMember(workspaceId, {
      userId: crypto.randomUUID(),
      displayName: email.trim(),
      role: selectedRole,
    });
    setEmail("");
    setInviteSent(true);
    setTimeout(() => setInviteSent(false), 2000);
  }, [email, workspaceId, selectedRole, ws]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/knowledge?doc=${documentId}&invite=${ws?.inviteCode ?? ""}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [documentId, ws?.inviteCode]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [onClose]);

  const ACCESS_OPTIONS: {
    value: DocumentAccess;
    label: string;
    desc: string;
    icon: React.ReactNode;
  }[] = [
    {
      value: "private",
      label: "Private",
      desc: "Only you can access",
      icon: <Lock className="h-4 w-4" />,
    },
    {
      value: "shared",
      label: "Workspace",
      desc: "All workspace members",
      icon: <Users className="h-4 w-4" />,
    },
    {
      value: "public",
      label: "Public",
      desc: "Anyone with the link",
      icon: <Globe className="h-4 w-4" />,
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-neutral-900">Share</h2>
            <p className="mt-0.5 text-xs text-neutral-400 truncate max-w-[280px]">
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-5">
          {/* Access Level */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-700">
              Access Level
            </label>
            <div className="flex gap-2">
              {ACCESS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => handleAccessChange(opt.value)}
                  className={`flex flex-1 flex-col items-center gap-1.5 rounded-lg border p-3 text-center transition-all ${
                    access === opt.value
                      ? "border-purple-300 bg-purple-50 text-purple-700"
                      : "border-neutral-200 text-neutral-500 hover:border-neutral-300 hover:bg-neutral-50"
                  }`}
                >
                  {opt.icon}
                  <span className="text-xs font-medium">{opt.label}</span>
                  <span className="text-[10px] opacity-70">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Invite by email */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-700">
              Invite People
            </label>
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
                value={selectedRole}
                onChange={(e) =>
                  setSelectedRole(e.target.value as WorkspaceRole)
                }
                className="h-9 rounded-md border border-neutral-200 bg-white px-2 text-xs text-neutral-600 outline-none focus:border-purple-300"
                aria-label="Select role"
              >
                <option value="viewer">{ROLE_LABELS.viewer}</option>
                <option value="editor">{ROLE_LABELS.editor}</option>
                <option value="admin">{ROLE_LABELS.admin}</option>
              </select>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                onClick={handleInvite}
                disabled={!email.trim()}
                className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
              >
                {inviteSent ? "Invited!" : "Send Invite"}
              </button>
              {inviteSent && (
                <span className="text-xs text-emerald-600">
                  <Check className="inline h-3 w-3" /> Invite sent
                </span>
              )}
            </div>
          </div>

          {/* Copy link */}
          <div>
            <label className="mb-2 block text-xs font-medium text-neutral-700">
              Share Link
            </label>
            <button
              onClick={handleCopyLink}
              className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 px-3 py-2.5 text-left transition-colors hover:bg-neutral-50"
            >
              <Link2 className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="flex-1 truncate text-xs text-neutral-500">
                {window.location.origin}/knowledge?doc={documentId.slice(0, 8)}...
              </span>
              {copied ? (
                <Check className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
              ) : (
                <Copy className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
              )}
            </button>
          </div>

          {/* Invite code */}
          {ws && (
            <div className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5">
              <Shield className="h-4 w-4 shrink-0 text-neutral-400" />
              <div className="flex-1">
                <p className="text-xs font-medium text-neutral-700">
                  Workspace Invite Code
                </p>
                <p className="font-mono text-[11px] tracking-wider text-neutral-500">
                  {ws.inviteCode}
                </p>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
