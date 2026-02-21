"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { FileText, Plus, Search, Settings, Trash2, Store, Activity, Crown, AlertTriangle } from "lucide-react";
import type { DocumentMeta } from "@/lib/documents/types";
import { WorkspaceSwitcher } from "@/components/workspace/workspace-switcher";
import { CollectionSidebar } from "@/components/collections/collection-sidebar";
import type { Workspace } from "@/lib/workspaces/types";
import { getDocumentLimitInfo, getSubscription } from "@/lib/subscription/store";

interface SidebarProps {
  workspaceName: string;
  documents: DocumentMeta[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
  onSearch?: () => void;
  workspace?: Workspace | null;
  onWorkspaceSwitch?: (ws: Workspace) => void;
  onShowActivity?: () => void;
}

export function Sidebar({ workspaceName, documents, activeId, onSelect, onAdd, onDelete, onSearch, workspace, onWorkspaceSwitch, onShowActivity }: SidebarProps) {
  const router = useRouter();
  const docLimit = workspace ? getDocumentLimitInfo(workspace.id) : null;
  const currentTier = workspace ? getSubscription(workspace.id).tier : "free";
  const isPro = currentTier === "pro" || currentTier === "enterprise";
  const isUnlimited = docLimit && docLimit.max === Infinity;
  const isNearLimit = docLimit && !isUnlimited && docLimit.percentage >= 80;
  const isAtLimit = docLimit?.isAtLimit ?? false;

  return (
    <aside className="flex h-screen w-60 shrink-0 flex-col border-r border-[#e5e5e5] bg-[#fafafa] [&_a]:cursor-pointer [&_button]:cursor-pointer">
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
        <button
          onClick={() => router.push("/pricing")}
          className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-neutral-500 transition-colors hover:bg-neutral-100 hover:text-neutral-700"
        >
          <Crown className="h-4 w-4" />
          Plans & Billing
        </button>
      </div>

      {/* Collections */}
      <CollectionSidebar
        activeDocumentId={activeId}
        onSelectDocument={onSelect}
        documents={documents.map((d) => ({ id: d.id, title: d.title }))}
      />

      <div className="flex items-center justify-between px-4 pt-4 pb-1">
        <span className="text-[11px] font-medium uppercase tracking-wider text-neutral-400">
          Documents
        </span>
        {isAtLimit ? (
          <button
            onClick={() => router.push("/pricing")}
            className="flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium text-amber-600 transition-colors hover:bg-amber-50"
            aria-label="Upgrade to add more documents"
            title="Document limit reached — upgrade to add more"
          >
            <Crown className="h-3 w-3" />
            Upgrade
          </button>
        ) : (
          <button
            onClick={onAdd}
            className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
            aria-label="Add document"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-2">
        {documents.map((doc) => (
          <div key={doc.id} className="group flex items-center">
            <button
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData("text/plain", doc.id);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onSelect(doc.id)}
              className={`flex flex-1 items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors ${
                doc.id === activeId
                  ? "bg-neutral-100 font-medium text-neutral-900"
                  : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800"
              }`}
            >
              <FileText className="h-4 w-4 shrink-0 text-neutral-400" />
              <span className="truncate">{doc.title || "Untitled"}</span>
              <span className="ml-auto text-[10px] text-neutral-300">.md</span>
            </button>
            {documents.length > 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(doc.id); }}
                className="mr-1 rounded p-1 text-neutral-300 opacity-0 transition-all hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                aria-label="Delete document"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="border-t border-[#e5e5e5] px-4 py-3">
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
              <span className={`text-xs ${isAtLimit ? "font-medium text-red-500" : isNearLimit ? "text-amber-500" : "text-neutral-400"}`}>
                {docLimit?.current ?? documents.length}/{docLimit?.max ?? 50}
              </span>
            </div>
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-neutral-200">
              <div
                className={`h-full rounded-full transition-all ${isAtLimit ? "bg-red-400" : isNearLimit ? "bg-amber-400" : "bg-neutral-400"}`}
                style={{ width: `${docLimit?.percentage ?? (documents.length / 50) * 100}%` }}
              />
            </div>
            {isAtLimit ? (
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-opacity hover:opacity-90"
              >
                <Crown className="h-3 w-3" />
                Upgrade for unlimited docs
              </button>
            ) : isNearLimit ? (
              <button
                onClick={() => router.push("/pricing")}
                className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
              >
                <AlertTriangle className="h-3 w-3" />
                Running low — upgrade to Pro
              </button>
            ) : null}
          </>
        )}
      </div>

      <div className="flex items-center gap-3 border-t border-[#e5e5e5] px-4 py-2.5">
        <Link href="https://www.knobase.com" target="_blank" className="text-[11px] text-neutral-300 transition-colors hover:text-neutral-500">
          Knobase
        </Link>
        <span className="text-neutral-200">·</span>
        <Link href="/tos" className="text-[11px] text-neutral-300 transition-colors hover:text-neutral-500">
          Terms
        </Link>
        <span className="text-neutral-200">·</span>
        <Link href="/privacy" className="text-[11px] text-neutral-300 transition-colors hover:text-neutral-500">
          Privacy
        </Link>
      </div>
    </aside>
  );
}
