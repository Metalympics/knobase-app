"use client";

import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Globe,
  Lock,
  Link2,
  Copy,
  Check,
  Users,
  Search,
  ChevronDown,
  User,
  Bot,
  Trash2,
  Settings,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  type DocumentAccess,
  getDocumentAccess,
  setDocumentAccess,
} from "@/lib/permissions/acl";
import type { WorkspaceMember } from "@/lib/collaborators/types";

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

type AccessLevel = "private" | "workspace" | "anyone";

type LinkPermission = "view" | "comment" | "edit";

type MemberPermission = "full" | "edit" | "comment" | "view";

interface SharedPerson {
  member: WorkspaceMember;
  permission: MemberPermission;
}

const ACCESS_CONFIG: Record<
  AccessLevel,
  { icon: typeof Lock; label: string; description: string; color: string }
> = {
  private: {
    icon: Lock,
    label: "Private to you",
    description: "Only you can access this document",
    color: "text-neutral-500",
  },
  workspace: {
    icon: Users,
    label: "Workspace",
    description: "All workspace members can access",
    color: "text-blue-500",
  },
  anyone: {
    icon: Globe,
    label: "Anyone with the link",
    description: "Anyone on the internet with the link can access",
    color: "text-emerald-500",
  },
};

const PERMISSION_LABELS: Record<MemberPermission, string> = {
  full: "Full Access",
  edit: "Can Edit",
  comment: "Can Comment",
  view: "View Only",
};

const LINK_PERMISSION_LABELS: Record<LinkPermission, string> = {
  view: "View Only",
  comment: "Can Comment",
  edit: "Can Edit",
};

function mapDocumentAccessToLevel(access: DocumentAccess): AccessLevel {
  if (access === "public") return "anyone";
  if (access === "shared") return "workspace";
  return "private";
}

function mapLevelToDocumentAccess(level: AccessLevel): DocumentAccess {
  if (level === "anyone") return "public";
  if (level === "workspace") return "shared";
  return "private";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
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
  const [accessLevel, setAccessLevel] = useState<AccessLevel>(() =>
    mapDocumentAccessToLevel(getDocumentAccess(documentId)),
  );
  const [linkPermission, setLinkPermission] = useState<LinkPermission>("view");
  const [copied, setCopied] = useState(false);

  // People search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Track if we're inviting an external email
  const [isExternalInvite, setIsExternalInvite] = useState(false);
  const [externalEmail, setExternalEmail] = useState("");

  // Workspace members
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shared people (added to this document)
  const [sharedPeople, setSharedPeople] = useState<SharedPerson[]>([]);

  useEffect(() => {
    async function fetchMembers() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/collaborators?workspace_id=${workspaceId}&type=all&limit=50`,
        );
        if (!res.ok) throw new Error("Failed to fetch members");
        const data = await res.json();
        const fetched: WorkspaceMember[] =
          data.collaborators?.map(
            (c: { member: WorkspaceMember }) => c.member,
          ) ?? [];
        setMembers(fetched);
      } catch (err) {
        console.error("[ShareDialog] fetch error:", err);
        setError("Could not load workspace members");
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [workspaceId]);

  // Close search dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        searchRef.current &&
        !searchRef.current.contains(e.target as Node)
      ) {
        setSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Check if query is a valid email
  const isValidEmail = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(searchQuery.trim());
  }, [searchQuery]);

  const filteredMembers = useMemo(() => {
    const alreadySharedIds = new Set(sharedPeople.map((sp) => sp.member.id));
    return members.filter((m) => {
      if (m.id === currentUserId) return false;
      if (alreadySharedIds.has(m.id)) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.name.toLowerCase().includes(q) ||
        m.human_profile?.email?.toLowerCase().includes(q) ||
        m.capabilities.some((c) => c.toLowerCase().includes(q))
      );
    });
  }, [members, searchQuery, sharedPeople, currentUserId]);

  // Check if we're showing external invite option
  const showExternalInvite = useMemo(() => {
    return searchFocused && isValidEmail && filteredMembers.length === 0;
  }, [searchFocused, isValidEmail, filteredMembers.length]);

  const handleAccessLevelChange = useCallback(
    (level: AccessLevel) => {
      setAccessLevel(level);
      setDocumentAccess(documentId, mapLevelToDocumentAccess(level));
    },
    [documentId],
  );

  const handleCopyLink = useCallback(() => {
    const link = `${window.location.origin}/d/${documentId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [documentId]);

  const handleAddPerson = useCallback(
    (member: WorkspaceMember) => {
      setSharedPeople((prev) => [
        ...prev,
        { member, permission: "edit" },
      ]);
      setSearchQuery("");
      setSearchFocused(false);
    },
    [],
  );

  const handleRemovePerson = useCallback((memberId: string) => {
    setSharedPeople((prev) => prev.filter((sp) => sp.member.id !== memberId));
  }, []);

  const handleChangePermission = useCallback(
    (memberId: string, permission: MemberPermission) => {
      setSharedPeople((prev) =>
        prev.map((sp) =>
          sp.member.id === memberId ? { ...sp, permission } : sp,
        ),
      );
    },
    [],
  );

  const showSearchDropdown =
    searchFocused && (filteredMembers.length > 0 || loading);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="sm:max-w-[480px] gap-0 p-0 overflow-hidden"
        showCloseButton={false}
      >
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <DialogTitle className="text-base font-semibold text-neutral-900">
                Share &ldquo;{documentTitle}&rdquo;
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-xs text-neutral-400">
                Manage who can access this document
              </DialogDescription>
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </DialogHeader>

        <div className="px-5 py-4 space-y-5">
          {/* ── People search ─────────────────────────────── */}
          <div>
            <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Users className="h-3.5 w-3.5" />
              Add people
            </label>
            <div className="relative">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-400" />
                <Input
                  ref={searchRef}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  placeholder="Search people and agents..."
                  className="h-9 pl-8 pr-3 text-sm"
                />
              </div>

              <AnimatePresence>
                {searchFocused && (
                  <motion.div
                    ref={dropdownRef}
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="absolute z-50 mt-1 w-full rounded-lg border border-neutral-200 bg-white shadow-lg"
                  >
                    <div className="max-h-48 overflow-y-auto p-1">
                      {loading ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-600" />
                          <span className="ml-2 text-xs text-neutral-400">
                            Loading members...
                          </span>
                        </div>
                      ) : showExternalInvite ? (
                        /* External email invite option */
                        <button
                          onClick={() => {
                            const externalId = `external-${Date.now()}`;
                            const newMember: WorkspaceMember = {
                              id: externalId,
                              name: searchQuery.trim(),
                              type: "human",
                              avatar_url: null,
                              description: null,
                              capabilities: [],
                              expertise: [],
                              availability: "offline",
                              last_active: null,
                              human_profile: {
                                user_id: externalId,
                                email: searchQuery.trim(),
                                name: searchQuery.trim(),
                                role: "viewer",
                                joined_at: new Date(),
                              },
                            };
                            handleAddPerson(newMember);
                          }}
                          className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-50"
                        >
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50">
                            <User className="h-4 w-4 text-blue-500" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium text-neutral-800">
                                Invite {searchQuery.trim()}
                              </span>
                              <span className="inline-flex items-center rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
                                External
                              </span>
                            </div>
                            <p className="truncate text-[11px] text-neutral-400">
                              They&apos;ll receive an email invitation
                            </p>
                          </div>
                        </button>
                      ) : filteredMembers.length === 0 ? (
                        <div className="py-4 text-center text-xs text-neutral-400">
                          No matching people found
                        </div>
                      ) : (
                        filteredMembers.map((member) => (
                          <button
                            key={member.id}
                            onClick={() => handleAddPerson(member)}
                            className="flex w-full items-center gap-2.5 rounded-md px-2 py-2 text-left transition-colors hover:bg-neutral-50"
                          >
                            <MemberAvatar member={member} size="sm" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="truncate text-sm font-medium text-neutral-800">
                                  {member.name}
                                </span>
                                <MemberTypeBadge type={member.type} />
                              </div>
                              {member.human_profile?.email && (
                                <p className="truncate text-[11px] text-neutral-400">
                                  {member.human_profile.email}
                                </p>
                              )}
                              {member.type === "agent" &&
                                member.description && (
                                  <p className="truncate text-[11px] text-neutral-400">
                                    {member.description}
                                  </p>
                                )}
                            </div>
                            {member.availability === "online" && (
                              <span className="h-2 w-2 rounded-full bg-emerald-400" />
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* ── People with access ────────────────────────── */}
          {sharedPeople.length > 0 && (
            <div>
              <label className="mb-1.5 block text-xs font-medium text-neutral-600">
                People with access
              </label>
              <div className="rounded-lg border border-neutral-200 divide-y divide-neutral-100">
                {/* Owner row */}
                <div className="flex items-center gap-2.5 px-3 py-2.5">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-neutral-900 text-[10px] text-white">
                      You
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <span className="text-sm font-medium text-neutral-800">
                      You
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-neutral-400">
                    Owner
                  </span>
                </div>

                <AnimatePresence initial={false}>
                  {sharedPeople.map((sp) => (
                    <motion.div
                      key={sp.member.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2.5 px-3 py-2.5">
                        <MemberAvatar member={sp.member} size="sm" />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium text-neutral-800">
                              {sp.member.name}
                            </span>
                            <MemberTypeBadge type={sp.member.type} />
                          </div>
                          {sp.member.human_profile?.email && (
                            <p className="truncate text-[11px] text-neutral-400">
                              {sp.member.human_profile.email}
                            </p>
                          )}
                        </div>
                        <Select
                          value={sp.permission}
                          onValueChange={(val) =>
                            handleChangePermission(
                              sp.member.id,
                              val as MemberPermission,
                            )
                          }
                        >
                          <SelectTrigger
                            size="sm"
                            className="h-7 w-auto min-w-[110px] border-neutral-200 text-[11px]"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent position="popper" align="end">
                            {(
                              Object.entries(PERMISSION_LABELS) as [
                                MemberPermission,
                                string,
                              ][]
                            ).map(([value, label]) => (
                              <SelectItem
                                key={value}
                                value={value}
                                className="text-xs"
                              >
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <button
                          onClick={() => handleRemovePerson(sp.member.id)}
                          className="rounded-md p-1 text-neutral-300 transition-colors hover:bg-red-50 hover:text-red-500"
                          title="Remove access"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </div>
          )}

          <Separator />

          {/* ── General access ────────────────────────────── */}
          <div>
            <label className="mb-2 flex items-center gap-1.5 text-xs font-medium text-neutral-600">
              <Settings className="h-3.5 w-3.5" />
              General access
            </label>
            <div className="space-y-1.5">
              {(Object.keys(ACCESS_CONFIG) as AccessLevel[]).map((level) => {
                const config = ACCESS_CONFIG[level];
                const Icon = config.icon;
                const isSelected = accessLevel === level;

                return (
                  <button
                    key={level}
                    onClick={() => handleAccessLevelChange(level)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-all ${
                      isSelected
                        ? "border-neutral-300 bg-neutral-50 ring-1 ring-neutral-200"
                        : "border-transparent hover:bg-neutral-50"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isSelected ? "bg-white shadow-sm" : "bg-neutral-100"
                      }`}
                    >
                      <Icon
                        className={`h-4 w-4 ${isSelected ? config.color : "text-neutral-400"}`}
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`text-sm font-medium ${isSelected ? "text-neutral-900" : "text-neutral-600"}`}
                      >
                        {config.label}
                      </p>
                      <p className="text-[11px] text-neutral-400">
                        {config.description}
                      </p>
                    </div>
                    <div
                      className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        isSelected
                          ? "border-neutral-900 bg-neutral-900"
                          : "border-neutral-300"
                      }`}
                    >
                      {isSelected && (
                        <Check className="h-2.5 w-2.5 text-white" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Link permission selector (only when "anyone") */}
            <AnimatePresence>
              {accessLevel === "anyone" && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5">
                    <Globe className="h-4 w-4 shrink-0 text-emerald-500" />
                    <span className="flex-1 text-xs text-emerald-700">
                      Anyone with the link can:
                    </span>
                    <Select
                      value={linkPermission}
                      onValueChange={(val) =>
                        setLinkPermission(val as LinkPermission)
                      }
                    >
                      <SelectTrigger
                        size="sm"
                        className="h-7 w-auto min-w-[110px] border-emerald-200 bg-white text-[11px]"
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" align="end">
                        {(
                          Object.entries(LINK_PERMISSION_LABELS) as [
                            LinkPermission,
                            string,
                          ][]
                        ).map(([value, label]) => (
                          <SelectItem
                            key={value}
                            value={value}
                            className="text-xs"
                          >
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Error banner ──────────────────────────────── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                className="rounded-md bg-red-50 px-3 py-2 text-xs text-red-600"
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-neutral-100 px-5 py-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyLink}
            className="gap-1.5 text-xs"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-500" />
                Copied!
              </>
            ) : (
              <>
                <Link2 className="h-3.5 w-3.5" />
                Copy link
              </>
            )}
          </Button>
          <Button size="sm" onClick={onClose} className="text-xs">
            Done
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                      */
/* ------------------------------------------------------------------ */

function MemberAvatar({
  member,
  size = "sm",
}: {
  member: WorkspaceMember;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "h-7 w-7" : "h-9 w-9";
  const textSize = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <Avatar className={dim}>
      {member.avatar_url ? (
        <AvatarImage src={member.avatar_url} alt={member.name} />
      ) : null}
      <AvatarFallback
        className={`${textSize} font-medium ${
          member.type === "agent"
            ? "bg-purple-100 text-purple-700"
            : "bg-blue-100 text-blue-700"
        }`}
      >
        {member.type === "agent" ? (
          <Bot className="h-3.5 w-3.5" />
        ) : (
          getInitials(member.name || "?")
        )}
      </AvatarFallback>
    </Avatar>
  );
}

function MemberTypeBadge({ type }: { type: "human" | "agent" }) {
  if (type === "agent") {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-full bg-purple-100 px-1.5 py-0.5 text-[9px] font-medium text-purple-600">
        <Bot className="h-2.5 w-2.5" />
        Agent
      </span>
    );
  }
  return null;
}
