"use client";

import { useState, useCallback, useEffect } from "react";
import { motion } from "framer-motion";
import {
  X,
  Globe,
  Lock,
  Link2,
  Copy,
  Check,
  Users,
  Eye,
  Edit3,
  Trash2,
  Clock,
  Shield,
} from "lucide-react";
import {
  generateGuestToken,
  listGuestTokens,
  revokeGuestToken,
  type GuestToken,
} from "@/lib/guest/tokens";
import {
  type DocumentAccess,
  getDocumentAccess,
  setDocumentAccess,
} from "@/lib/permissions/acl";
import { getWorkspace } from "@/lib/workspaces/store";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface ShareDialogProps {
  documentId: string;
  documentTitle: string;
  workspaceId: string;
  currentUserId: string;
  onClose: () => void;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function timeRemaining(expiresAt: string): string {
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.floor(ms / (1000 * 60 * 60));
  if (hours < 1) return `${Math.floor(ms / (1000 * 60))}m remaining`;
  if (hours < 24) return `${hours}h remaining`;
  return `${Math.floor(hours / 24)}d remaining`;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export function ShareDialog({
  documentId,
  documentTitle,
  workspaceId,
  currentUserId,
  onClose,
}: ShareDialogProps) {
  const [access, setAccess] = useState<DocumentAccess>(() =>
    getDocumentAccess(documentId),
  );
  const [isPublic, setIsPublic] = useState(access === "public");
  const [copied, setCopied] = useState(false);
  const [guestTokens, setGuestTokens] = useState<GuestToken[]>([]);
  const [tokenLabel, setTokenLabel] = useState("");
  const [tokenDuration, setTokenDuration] = useState(24);
  const [tokenCreated, setTokenCreated] = useState(false);

  const ws = getWorkspace(workspaceId);

  useEffect(() => {
    setGuestTokens(listGuestTokens(workspaceId));
  }, [workspaceId]);

  const handleTogglePublic = useCallback(() => {
    const newPublic = !isPublic;
    setIsPublic(newPublic);
    const newAccess: DocumentAccess = newPublic ? "public" : "private";
    setAccess(newAccess);
    setDocumentAccess(documentId, newAccess);
  }, [isPublic, access, documentId]);

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/d/${documentId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [documentId]);

  const handleCreateToken = useCallback(() => {
    const token = generateGuestToken(
      workspaceId,
      currentUserId,
      tokenDuration,
      tokenLabel || undefined,
    );
    setGuestTokens((prev) => [token, ...prev]);
    setTokenLabel("");
    setTokenCreated(true);
    setTimeout(() => setTokenCreated(false), 2000);

    // Copy the guest link
    const guestLink = `${window.location.origin}/d/${documentId}?token=${token.token}`;
    navigator.clipboard.writeText(guestLink);
  }, [workspaceId, currentUserId, tokenDuration, tokenLabel, documentId]);

  const handleRevokeToken = useCallback((tokenStr: string) => {
    revokeGuestToken(tokenStr);
    setGuestTokens((prev) => prev.filter((t) => t.token !== tokenStr));
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="mx-4 w-full max-w-md rounded-xl border border-neutral-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-neutral-900">Share Document</h2>
            <p className="mt-0.5 text-xs text-neutral-400 truncate max-w-[280px]">
              {documentTitle}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="space-y-5 px-5 py-4">
          {/* Visibility toggle */}
          <div className="flex items-center justify-between rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <div className="flex items-center gap-3">
              {isPublic ? (
                <Globe className="h-5 w-5 text-emerald-500" />
              ) : (
                <Lock className="h-5 w-5 text-neutral-400" />
              )}
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  {isPublic ? "Public" : "Private"}
                </p>
                <p className="text-[11px] text-neutral-400">
                  {isPublic
                    ? "Anyone with the link can view"
                    : "Only workspace members can access"}
                </p>
              </div>
            </div>
            <button
              onClick={handleTogglePublic}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                isPublic ? "bg-emerald-500" : "bg-neutral-300"
              }`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                  isPublic ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {/* Copy link */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-neutral-600">
              Document Link
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-3 py-2">
                <p className="truncate text-xs text-neutral-500">
                  {typeof window !== "undefined"
                    ? `${window.location.origin}/d/${documentId}`
                    : `*/d/${documentId}`}
                </p>
              </div>
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1.5 rounded-md border border-neutral-200 px-3 py-2 text-xs font-medium text-neutral-600 hover:bg-neutral-50"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Copy
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Workspace members */}
          {ws && ws.members.length > 0 && (
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
                <Users className="h-3.5 w-3.5" />
                Workspace Members
              </label>
              <div className="max-h-32 overflow-y-auto rounded-lg border border-neutral-200 divide-y divide-neutral-50">
                {ws.members.map((member) => (
                  <div
                    key={member.userId}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-[10px] font-medium text-neutral-600">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 truncate text-xs text-neutral-700">
                      {member.displayName}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                      {member.role === "admin" && <Shield className="h-3 w-3" />}
                      {member.role === "editor" && <Edit3 className="h-3 w-3" />}
                      {member.role === "viewer" && <Eye className="h-3 w-3" />}
                      {member.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Guest links */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Link2 className="h-3.5 w-3.5" />
              Guest Links
            </label>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={tokenLabel}
                  onChange={(e) => setTokenLabel(e.target.value)}
                  placeholder="Label (optional)"
                  className="flex-1 rounded-md border border-neutral-200 bg-white px-2.5 py-1.5 text-xs text-neutral-700 outline-none focus:border-neutral-400"
                />
                <select
                  value={tokenDuration}
                  onChange={(e) => setTokenDuration(Number(e.target.value))}
                  className="rounded-md border border-neutral-200 bg-white px-2 py-1.5 text-xs text-neutral-600"
                >
                  <option value={1}>1 hour</option>
                  <option value={24}>24 hours</option>
                  <option value={168}>7 days</option>
                  <option value={720}>30 days</option>
                </select>
                <button
                  onClick={handleCreateToken}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-800"
                >
                  {tokenCreated ? "Created!" : "Create"}
                </button>
              </div>

              {guestTokens.length > 0 && (
                <div className="max-h-32 space-y-1 overflow-y-auto">
                  {guestTokens.map((token) => (
                    <div
                      key={token.token}
                      className="flex items-center gap-2 rounded-md border border-neutral-100 bg-neutral-50 px-3 py-2"
                    >
                      <Link2 className="h-3 w-3 shrink-0 text-neutral-400" />
                      <span className="flex-1 truncate text-xs text-neutral-600">
                        {token.label || token.token.slice(0, 12) + "..."}
                      </span>
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <Clock className="h-2.5 w-2.5" />
                        {timeRemaining(token.expiresAt)}
                      </span>
                      <button
                        onClick={() => handleRevokeToken(token.token)}
                        className="rounded p-1 text-neutral-400 hover:bg-neutral-200 hover:text-red-500"
                        title="Revoke"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end border-t border-neutral-100 px-5 py-3">
          <button
            onClick={onClose}
            className="rounded-md bg-neutral-100 px-4 py-1.5 text-xs font-medium text-neutral-600 hover:bg-neutral-200"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
