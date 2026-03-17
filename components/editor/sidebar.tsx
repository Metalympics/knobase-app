"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  FileText,
  FolderOpen,
  Plus,
  Search,
  Settings,
  Trash2,
  Store,
  Activity,
  Crown,
  AlertTriangle,
  ChevronRight,
  Share2,
  Building2,
  ChevronDown,
  Clock,
  Bot,
  Users,
} from "lucide-react";
import type { DocumentMeta } from "@/lib/documents/types";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { TaskStatusPanel } from "@/components/sidebar/task-status-panel";
import type { Workspace } from "@/lib/schools/types";
import {
  getDocumentLimitInfo,
  getSubscription,
} from "@/lib/subscription/store";
import { useSidebar } from "@/lib/ui/sidebar-context";
import { useResolvedAvatars } from "@/lib/ui/use-resolved-avatars";
import { getSharedDocuments, type SharedDocument } from "@/lib/documents/shared";
import { createClient } from "@/lib/supabase/client";

interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  isAgent?: boolean;
}

interface RecentPage {
  id: string;
  title: string;
  icon: string | null;
  updated_at: string;
}

interface SidebarProps {
  workspaceName: string;
  documents: DocumentMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onAddSubPage?: (parentId: string) => void;
  onMoveDocument?: (id: string, newParentId: string | null) => void;
  onSearch?: () => void;
  workspace?: Workspace | null;
  onWorkspaceSwitch?: (ws: Workspace) => void;
  onShowActivity?: () => void;
  onNavigateToTask?: (
    documentId: string,
    selection?: { from: number; to: number },
  ) => void;
  onlineUsers?: PresenceUser[];
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function DocTreeItem({
  doc,
  allDocs,
  activeId,
  onSelect,
  onDelete,
  depth = 0,
}: {
  doc: DocumentMeta;
  allDocs: DocumentMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  depth?: number;
}) {
  const children = allDocs.filter((d) => d.parentId === doc.id);
  const hasChildren = children.length > 0;
  const isActive = doc.id === activeId;
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <div className="group flex items-center" style={{ paddingLeft: `${depth * 12}px` }}>
        <button
          onClick={() => hasChildren && setExpanded((p) => !p)}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded transition-colors ${
            hasChildren
              ? "text-neutral-400 hover:bg-neutral-200 hover:text-neutral-600"
              : "text-transparent pointer-events-none"
          }`}
        >
          <ChevronRight
            className={`h-3 w-3 transition-transform ${expanded && hasChildren ? "rotate-90" : ""}`}
          />
        </button>
        <button
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("text/plain", doc.id);
            e.dataTransfer.effectAllowed = "copy";
          }}
          onClick={() => onSelect(doc.id)}
          className={`flex flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-sm transition-colors min-w-0 ${
            isActive
              ? "bg-neutral-100 font-medium text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
          }`}
        >
          {(doc as any).icon ? (
            <span className="shrink-0 text-sm">{(doc as any).icon}</span>
          ) : (
            <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          )}
          <span className="truncate">{doc.title || "Untitled"}</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(doc.id);
          }}
          className="mr-1 rounded p-1 text-neutral-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
          aria-label="Delete document"
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>
      {expanded && hasChildren && (
        <div>
          {children.map((child) => (
            <DocTreeItem
              key={child.id}
              doc={child}
              allDocs={allDocs}
              activeId={activeId}
              onSelect={onSelect}
              onDelete={onDelete}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section header with collapsible toggle                              */
/* ------------------------------------------------------------------ */
function SectionHeader({
  label,
  icon,
  count,
  expanded,
  onToggle,
  action,
}: {
  label: string;
  icon: React.ReactNode;
  count?: number;
  expanded: boolean;
  onToggle: () => void;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-3 pt-3 pb-1">
      <button
        onClick={onToggle}
        className="flex items-center gap-1.5 text-left"
      >
        <ChevronDown
          className={`h-3 w-3 text-neutral-400 transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          {icon}
          {label}
        </span>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] font-medium text-neutral-500">
            {count}
          </span>
        )}
      </button>
      {action}
    </div>
  );
}

export function Sidebar({
  workspaceName,
  documents,
  activeId,
  onSelect,
  onAdd,
  onDelete,
  onSearch,
  workspace,
  onWorkspaceSwitch,
  onShowActivity,
  onNavigateToTask,
  onlineUsers = [],
}: SidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  // Section expand/collapse state
  const [recentExpanded, setRecentExpanded] = useState(true);
  const [sharedExpanded, setSharedExpanded] = useState(true);
  const [myPagesExpanded, setMyPagesExpanded] = useState(true);

  // Recent pages from Supabase
  const [recentPages, setRecentPages] = useState<RecentPage[]>([]);
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    const supabase = createClient();

    supabase
      .from("pages")
      .select("id, title, icon, updated_at")
      .eq("school_id", workspace.id)
      .order("updated_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (cancelled || !data) return;
        setRecentPages(data as RecentPage[]);
      });

    return () => { cancelled = true; };
  }, [workspace?.id]);

  // Shared documents from other workspaces
  const [sharedDocs, setSharedDocs] = useState<SharedDocument[]>([]);
  const [loadingShared, setLoadingShared] = useState(false);
  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    setLoadingShared(true);

    getSharedDocuments(workspace.id)
      .then((docs) => {
        if (!cancelled) setSharedDocs(docs);
      })
      .catch((err) => console.error("Failed to load shared documents:", err))
      .finally(() => { if (!cancelled) setLoadingShared(false); });

    return () => { cancelled = true; };
  }, [workspace?.id]);

  interface SidebarMember { id: string; name: string; avatar_url: string | null }
  const [wsAgents, setWsAgents] = useState<SidebarMember[]>([]);
  const [wsCollaborators, setWsCollaborators] = useState<SidebarMember[]>([]);
  const [agentsExpanded, setAgentsExpanded] = useState(true);
  const [collaboratorsExpanded, setCollaboratorsExpanded] = useState(true);

  useEffect(() => {
    if (!workspace) return;
    let cancelled = false;
    const supabase = createClient();

    (async () => {
      let { data } = await supabase
        .from("users")
        .select("id, name, avatar_url")
        .eq("type", "agent")
        .eq("school_id", workspace.id)
        .eq("is_deleted", false)
        .order("name");

      if (!data?.length) {
        const fallback = await supabase
          .from("users")
          .select("id, name, avatar_url")
          .eq("type", "agent")
          .eq("is_deleted", false)
          .order("name")
          .limit(10);
        data = fallback.data;
      }

      if (!cancelled && data) setWsAgents(data as SidebarMember[]);
    })();

    supabase
      .from("users")
      .select("id, name, avatar_url")
      .in("type", ["human", "teacher", "admin"])
      .eq("school_id", workspace.id)
      .eq("is_deleted", false)
      .order("name")
      .limit(50)
      .then(({ data }) => {
        if (!cancelled && data) setWsCollaborators(data as SidebarMember[]);
      });

    return () => { cancelled = true; };
  }, [workspace?.id]);

  const resolvedAgentAvatars = useResolvedAvatars(wsAgents);
  const resolvedCollabAvatars = useResolvedAvatars(wsCollaborators);

  const docLimit = workspace ? getDocumentLimitInfo(workspace.id) : null;
  const currentTier = workspace ? getSubscription(workspace.id).tier : "free";
  const isPro = currentTier === "pro" || currentTier === "enterprise";
  const isUnlimited = docLimit && docLimit.max === Infinity;
  const isNearLimit = docLimit && !isUnlimited && docLimit.percentage >= 80;
  const isAtLimit = docLimit?.isAtLimit ?? false;

  const { isOpen, close } = useSidebar();

  // Close the mobile drawer whenever navigation happens
  const handleSelect = useCallback(
    (id: string) => {
      onSelect(id);
      close();
    },
    [onSelect, close],
  );

  const handleSelectRecent = useCallback(
    (pageId: string) => {
      if (workspace) {
        router.push(`/s/${workspace.id}/d/${pageId}`);
        close();
      }
    },
    [router, workspace, close],
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={close}
          aria-hidden="true"
        />
      )}
    <aside
      data-tutorial="sidebar"
      className={[
        "flex h-screen flex-col border-r border-[#e5e5e5] bg-[#fafafa]",
        "[&_a]:cursor-pointer [&_button]:cursor-pointer",
        // Desktop: always visible, fixed width in the flex row
        "md:relative md:w-60 md:shrink-0 md:translate-x-0 md:transition-none",
        // Mobile: full-height drawer overlaid on content
        "fixed inset-y-0 left-0 z-50 w-72 shrink-0 transition-transform duration-300 ease-in-out",
        isOpen ? "translate-x-0" : "-translate-x-full",
      ].join(" ")}
    >
      {/* ── Top: workspace switcher ── */}
      <div className="flex items-center gap-2 border-b border-[#e5e5e5] px-4 py-3">
        {workspace ? (
          <WorkspaceSwitcher
            currentWorkspace={workspace}
            onSwitch={onWorkspaceSwitch}
          />
        ) : (
          <>
            <div className="flex h-6 w-6 items-center justify-center rounded bg-neutral-900 text-[11px] font-bold text-white">
              {workspaceName.charAt(0).toUpperCase()}
            </div>
            <span className="flex-1 truncate text-sm font-semibold text-neutral-900">
              {workspaceName}
            </span>
          </>
        )}
        {isPro && (
          <span className="flex items-center gap-0.5 rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold text-purple-700">
            <Crown className="h-3 w-3" />
            PRO
          </span>
        )}
      </div>

      {/* ── Quick actions ── */}
      <div className="flex flex-col gap-0.5 px-2 py-2">
        <button
          onClick={onSearch}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <Search className="h-4 w-4" />
          Search
          <kbd className="ml-auto rounded border border-[#e5e5e5] px-1 py-0.5 text-[9px] text-neutral-400">
            ⇧⌘F
          </kbd>
        </button>
        {onShowActivity && (
          <button
            onClick={onShowActivity}
            className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
          >
            <Activity className="h-4 w-4" />
            Activity
          </button>
        )}
        <button
          onClick={() => router.push("/files")}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <FolderOpen className="h-4 w-4" />
          Files
        </button>
        <button
          onClick={() => router.push("/settings")}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <Settings className="h-4 w-4" />
          Settings
        </button>
        <button
          onClick={() => router.push("/settings?tab=marketplace")}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <Store className="h-4 w-4" />
          Marketplace
        </button>
      </div>

      {/* ── Online presence ── */}
      {onlineUsers.length > 0 && (
        <div className="border-t border-[#e5e5e5] px-3 py-2">
          <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
            Online — {onlineUsers.length}
          </span>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {onlineUsers.map((u) => (
              <div
                key={u.id}
                className="relative"
                title={`${u.name}${u.isAgent ? " (Agent)" : ""}`}
              >
                <div
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white"
                  style={{ backgroundColor: u.color }}
                >
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-[1.5px] border-[#fafafa] bg-emerald-400" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Agent Tasks ── */}
      <TaskStatusPanel onNavigateToTask={onNavigateToTask} />

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* ── Scrollable pages area ──                                    */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-y-auto border-t border-[#e5e5e5]">

        {/* ── Agents ── */}
        {wsAgents.length > 0 && (
          <div>
            <SectionHeader
              label="Agents"
              icon={<Bot className="h-3 w-3" />}
              count={wsAgents.length}
              expanded={agentsExpanded}
              onToggle={() => setAgentsExpanded((p) => !p)}
            />
            {agentsExpanded && (
              <div className="px-2 pb-1 space-y-0.5">
                {wsAgents.map((agent) => {
                  const isOnline = onlineUsers.some((u) => u.id === agent.id);
                  const avatarSrc = resolvedAgentAvatars[agent.id];
                  return (
                    <button
                      key={agent.id}
                      onClick={() => {
                        if (workspace) {
                          router.push(`/s/${workspace.id}/agent/${agent.id}`);
                          close();
                        }
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-600 transition-colors hover:bg-neutral-50"
                    >
                      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-md bg-purple-100">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={agent.name} className="h-full w-full object-cover" />
                        ) : (
                          <Bot className="h-3 w-3 text-purple-600" />
                        )}
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[#fafafa] bg-emerald-400" />
                        )}
                      </div>
                      <span className="flex-1 truncate text-left">{agent.name}</span>
                      <span className="shrink-0 rounded-full bg-purple-50 px-1.5 py-0.5 text-[10px] font-medium text-purple-500">
                        AI
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Collaborators ── */}
        {wsCollaborators.length > 0 && (
          <div>
            <SectionHeader
              label="People"
              icon={<Users className="h-3 w-3" />}
              count={wsCollaborators.length}
              expanded={collaboratorsExpanded}
              onToggle={() => setCollaboratorsExpanded((p) => !p)}
            />
            {collaboratorsExpanded && (
              <div className="px-2 pb-1 space-y-0.5">
                {wsCollaborators.map((member) => {
                  const initial = (member.name ?? "?").charAt(0).toUpperCase();
                  const isOnline = onlineUsers.some((u) => u.id === member.id);
                  const avatarSrc = resolvedCollabAvatars[member.id];
                  return (
                    <div
                      key={member.id}
                      className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-neutral-600"
                    >
                      <div className="relative flex h-5 w-5 shrink-0 items-center justify-center overflow-hidden rounded-full bg-neutral-200 text-[9px] font-bold text-neutral-500">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt={member.name ?? "User"} className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                        {isOnline && (
                          <span className="absolute -bottom-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-[#fafafa] bg-emerald-400" />
                        )}
                      </div>
                      <span className="flex-1 truncate">{member.name}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Recent ── */}
        {recentPages.length > 0 && (
          <div>
            <SectionHeader
              label="Recent"
              icon={<Clock className="h-3 w-3" />}
              expanded={recentExpanded}
              onToggle={() => setRecentExpanded((p) => !p)}
            />
            {recentExpanded && (
              <div className="px-2 pb-1">
                {recentPages.map((page) => {
                  const isActive = page.id === activeId;
                  return (
                    <button
                      key={page.id}
                      onClick={() => handleSelectRecent(page.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                        isActive
                          ? "bg-neutral-100 font-medium text-neutral-900"
                          : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                      }`}
                    >
                      {page.icon ? (
                        <span className="shrink-0 text-sm">{page.icon}</span>
                      ) : (
                        <FileText className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
                      )}
                      <span className="flex-1 truncate text-left">
                        {page.title || "Untitled"}
                      </span>
                      <span className="shrink-0 text-[10px] text-neutral-300">
                        {relativeTime(page.updated_at)}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Shared with me ── */}
        {sharedDocs.length > 0 && (
          <div>
            <SectionHeader
              label="Shared"
              icon={<Share2 className="h-3 w-3" />}
              count={sharedDocs.length}
              expanded={sharedExpanded}
              onToggle={() => setSharedExpanded((p) => !p)}
            />
            {sharedExpanded && (
              <div className="px-2 pb-1">
                {sharedDocs.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => router.push(`/d/${doc.id}`)}
                    className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors ${
                      pathname === `/d/${doc.id}`
                        ? "bg-neutral-100 font-medium text-neutral-900"
                        : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5 shrink-0 text-blue-400" />
                    <div className="flex min-w-0 flex-1 flex-col items-start">
                      <span className="w-full truncate text-left text-sm">{doc.title || "Untitled"}</span>
                      <span className="flex items-center gap-1 text-[10px] text-neutral-400">
                        <Building2 className="h-2.5 w-2.5" />
                        {doc.workspaceName}
                      </span>
                    </div>
                    {doc.role === "editor" && (
                      <span className="shrink-0 rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-medium text-blue-500">
                        Edit
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── My Pages (document tree) ── */}
        <div>
          <SectionHeader
            label="My Pages"
            icon={<FileText className="h-3 w-3" />}
            count={documents.length}
            expanded={myPagesExpanded}
            onToggle={() => setMyPagesExpanded((p) => !p)}
            action={
              isAtLimit ? (
                <button
                  onClick={() => router.push("/pricing")}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 transition-colors hover:bg-amber-50"
                  title="Document limit reached — upgrade"
                >
                  <Crown className="h-3 w-3" />
                  Upgrade
                </button>
              ) : (
                <button
                  data-tutorial="new-document"
                  onClick={onAdd}
                  className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                  aria-label="Add document"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              )
            }
          />
          {myPagesExpanded && (
            <div className="px-1 pb-2">
              {documents.filter((doc) => !doc.parentId).length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <p className="text-xs text-neutral-400">No pages yet</p>
                  <button
                    onClick={onAdd}
                    className="mt-2 inline-flex items-center gap-1 rounded-md bg-neutral-900 px-3 py-1.5 text-[11px] font-medium text-white transition-colors hover:bg-neutral-800"
                  >
                    <Plus className="h-3 w-3" />
                    New page
                  </button>
                </div>
              ) : (
                documents
                  .filter((doc) => !doc.parentId)
                  .map((doc) => (
                    <DocTreeItem
                      key={doc.id}
                      doc={doc}
                      allDocs={documents}
                      activeId={activeId}
                      onSelect={handleSelect}
                      onDelete={onDelete}
                    />
                  ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom: document count ── */}
      <div className="border-t border-[#e5e5e5] px-4 py-2.5">
        {isUnlimited ? (
          <div className="flex items-center justify-between">
            <span className="text-xs text-neutral-400">Documents</span>
            <span className="flex items-center gap-1 text-xs text-emerald-500">
              <Crown className="h-3 w-3" />
              {documents.length} — Unlimited
            </span>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Documents</span>
              <span
                className={`text-xs ${isAtLimit ? "font-medium text-red-500" : isNearLimit ? "text-amber-500" : "text-neutral-400"}`}
              >
                {docLimit?.current ?? documents.length}/{docLimit?.max ?? 50}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-400" : isNearLimit ? "bg-amber-400" : "bg-neutral-400"}`}
                style={{
                  width: `${docLimit?.percentage ?? (documents.length / 50) * 100}%`,
                }}
              />
            </div>
            {isAtLimit && (
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Crown className="h-3 w-3" />
                Upgrade for unlimited docs
              </button>
            )}
            {!isAtLimit && isNearLimit && (
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
              >
                <AlertTriangle className="h-3 w-3" />
                Running low — upgrade to Pro
              </button>
            )}
          </>
        )}
      </div>

      {/* ── Footer ── */}
      <div className="flex items-center gap-3 border-t border-[#e5e5e5] px-4 py-2">
        <Link
          href="https://www.knobase.com"
          target="_blank"
          className="text-[11px] text-neutral-300 transition-colors hover:text-neutral-500"
        >
          Knobase
        </Link>
        <span className="text-neutral-200">·</span>
        <Link
          href="/tos"
          className="text-[11px] text-neutral-300 transition-colors hover:text-neutral-500"
        >
          Terms
        </Link>
        <span className="text-neutral-200">·</span>
        <Link
          href="/privacy"
          className="text-[11px] text-neutral-300 transition-colors hover:text-neutral-500"
        >
          Privacy
        </Link>
      </div>
    </aside>
    </>
  );
}
