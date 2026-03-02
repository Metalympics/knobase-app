"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
  useLayoutEffect,
} from "react";
import { useRouter } from "next/navigation";
import { Editor } from "@tiptap/react";
import {
  Check,
  Clock,
  MessageSquare,
  Info,
  Network,
  Save,
  Search,
  UserPlus,
  Download,
  Share2,
} from "lucide-react";
import { Sidebar } from "@/components/editor/sidebar";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { AiAgent } from "@/components/editor/ai-agent";
import { PresenceBar } from "@/components/editor/presence-bar";
import { BacklinksPanel } from "@/components/editor/backlinks-panel";
import { DocumentMetadata } from "@/components/editor/document-metadata";
import { useCollaboration } from "@/lib/yjs/use-collaboration";
import { useSyncDocument, useSyncStatus } from "@/hooks/use-sync";
import { useDocuments } from "@/lib/documents/use-documents";
import { getDefaultAgent } from "@/lib/agents/store";
import {
  openClawBridge,
  type OpenClawConnectionStatus,
} from "@/lib/sync/openclaw-bridge";
import {
  startContextSync,
  stopContextSync,
  syncCurrentDocument,
} from "@/lib/sync/context-sync";
import type { Agent } from "@/lib/agents/types";

import { GlobalSearch } from "@/components/search/GlobalSearch";
import { PageSearch } from "@/components/search/PageSearch";
import { GraphView } from "@/components/navigation/graph-view";
import { VersionTimeline } from "@/components/history/version-timeline";
import { DiffView } from "@/components/history/diff-view";
import { CommentSidebar } from "@/components/comments/CommentSidebar";
import { TemplatePicker } from "@/components/templates/template-picker";
import { TemplateEditor } from "@/components/templates/template-editor";
import {
  saveVersion,
  shouldAutoSave,
  markAutoSaved,
  type Version,
  type VersionAuthor,
} from "@/lib/history/versions";
import { getCommentCount } from "@/lib/comments/store";
import type { Template } from "@/lib/templates/defaults";

import { getOrCreateDefaultWorkspace } from "@/lib/workspaces/store";
import { DocumentContextProvider } from "@/contexts/DocumentContext";
import type { Workspace } from "@/lib/workspaces/types";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ShareModal } from "@/components/permissions/share-modal";
import { ShareDialog } from "@/components/editor/share-dialog";
import { DocumentExportDialog } from "@/components/editor/document-export";
import { DocumentLockIndicator } from "@/components/collab/locks";
import { TagBadges } from "@/components/tags/tag-manager";
import { TagManager } from "@/components/tags/tag-manager";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { GuestBanner } from "@/components/guest/guest-banner";
import { OfflineIndicator } from "@/components/editor/offline-indicator";
import { canCreateDocument } from "@/lib/subscription/store";

function getWorkspaceName(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("knobase-app:workspace");
}

type RightPanel = "none" | "comments" | "history" | "metadata" | "activity";

export default function KnowledgePage() {
  const router = useRouter();

  const [workspaceName, setWorkspaceName] = useState("");
  const [mounted, setMounted] = useState(false);

  // Runs once on the client after hydration. Reading localStorage here keeps
  // the server render identical to the initial client render (both empty strings),
  // eliminating the hydration mismatch.
  useLayoutEffect(() => {
    setMounted(true);
    const name = getWorkspaceName();
    if (!name) {
      router.replace("/onboarding");
    } else {
      setWorkspaceName(name);
    }

  }, [router]);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [agent, setAgent] = useState<Agent | null>(() => getDefaultAgent());
  const [liveContent, setLiveContent] = useState("");
  const [openClawStatus, setOpenClawStatus] =
    useState<OpenClawConnectionStatus>("disconnected");
  const titleRef = useRef<HTMLInputElement>(null);
  const flushRef = useRef<(() => void) | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "dirty" | "saved">(
    "idle",
  );

  // Panel states
  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [showSearch, setShowSearch] = useState(false);
  const [showPageSearch, setShowPageSearch] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [showTemplateEditor, setShowTemplateEditor] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{
    a: Version;
    b: Version;
  } | null>(null);

  // Phase 5 state
  const [workspace, setWorkspace] = useState<Workspace | null>(() =>
    getOrCreateDefaultWorkspace(),
  );
  const [showShare, setShowShare] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [guestMode] = useState(false);

  const {
    documents,
    activeId,
    activeDoc,
    selectDocument,
    addDocument,
    saveContent,
    renameDocument,
    removeDocument,
  } = useDocuments();

  const { provider, ydoc, status, isSynced, isReady, user } =
    useCollaboration(activeId);

  // Offline-first sync engine: persists Yjs to IndexedDB, debounces to Supabase
  const syncInfo = useSyncStatus();
  const { forceFlush: syncForceFlush } = useSyncDocument(
    activeId ?? undefined,
    ydoc,
    {
      title: activeDoc?.title ?? "Untitled",
      workspaceId: workspace?.id ?? "",
    },
  );

  const commentCount = activeId ? getCommentCount(activeId) : 0;

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        flushRef.current?.();
        syncForceFlush().catch(() => {});
        setSaveStatus("saved");
        if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
        savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === "f") {
        e.preventDefault();
        if (e.shiftKey) {
          setShowPageSearch(false);
          setShowSearch(true);
        } else {
          setShowSearch(false);
          setShowPageSearch((prev) => !prev);
        }
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      flushRef.current?.();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Reset save status when document changes
  useEffect(() => {
    return () => {
      setSaveStatus("idle");
    };
  }, [activeId]);

  // Auto-save versions
  useEffect(() => {
    if (!activeId || !liveContent) return;
    if (shouldAutoSave(activeId)) {
      const author: VersionAuthor = {
        type: "human",
        id: "local-user",
        name: "You",
      };
      saveVersion(activeId, liveContent, author, undefined, "auto-save");
      markAutoSaved(activeId);
    }
  }, [activeId, liveContent]);

  useEffect(() => {
    const unsubStatus = openClawBridge.onStatusChange((s) => {
      setOpenClawStatus(s);
      if (s === "connected") startContextSync();
      else stopContextSync();
    });

    const unsubCommand = openClawBridge.onCommand((cmd) => {
      if (cmd.action === "select_document" && cmd.params.documentId) {
        selectDocument(cmd.params.documentId as string);
      }
    });

    const endpoint =
      localStorage.getItem("knobase-app:openclaw-endpoint") ?? "";
    const apiKey = localStorage.getItem("knobase-app:openclaw-apikey") ?? "";
    if (endpoint) {
      openClawBridge.configure(endpoint, apiKey);
      openClawBridge.connect();
    }

    return () => {
      unsubStatus();
      unsubCommand();
      openClawBridge.disconnect();
      stopContextSync();
    };
  }, [selectDocument]);

  const handleEditorReady = useCallback((ed: Editor) => {
    setEditor(ed);
  }, []);

  const handleContentChange = useCallback(
    (markdown: string) => {
      setLiveContent(markdown);
      if (activeId) {
        saveContent(activeId, markdown);
        if (openClawStatus === "connected") {
          syncCurrentDocument(
            activeId,
            markdown,
            activeDoc?.title ?? "Untitled",
          );
        }
      }
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    },
    [activeId, activeDoc?.title, saveContent, openClawStatus],
  );

  const handleDirtyChange = useCallback((dirty: boolean) => {
    if (dirty) {
      if (savedTimerRef.current) {
        clearTimeout(savedTimerRef.current);
        savedTimerRef.current = null;
      }
      setSaveStatus("dirty");
    }
  }, []);

  const handleTitleSubmit = useCallback(() => {
    if (activeId && titleRef.current) {
      const newTitle = titleRef.current.value.trim() || "Untitled";
      renameDocument(activeId, newTitle);
    }
    setEditingTitle(false);
  }, [activeId, renameDocument]);

  const togglePanel = useCallback((panel: RightPanel) => {
    setRightPanel((prev) => (prev === panel ? "none" : panel));
  }, []);

  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const handleAddDocument = useCallback(() => {
    if (workspace && !canCreateDocument(workspace.id)) {
      setShowUpgradePrompt(true);
      return;
    }
    setShowTemplatePicker(true);
  }, [workspace]);

  const handleTemplateSelect = useCallback(
    (template: Template) => {
      const doc = addDocument(template.name);
      if (doc) saveContent(doc.id, template.defaultContent);
      setShowTemplatePicker(false);
    },
    [addDocument, saveContent],
  );

  const handleBlankDocument = useCallback(() => {
    addDocument();
    setShowTemplatePicker(false);
  }, [addDocument]);

  const handleRestoreVersion = useCallback(
    (content: string) => {
      if (!activeId || !editor) return;
      editor.commands.setContent(content);
      saveContent(activeId, content);

      // Save a version for the restore action
      const author: VersionAuthor = {
        type: "human",
        id: "local-user",
        name: "You",
      };
      saveVersion(activeId, content, author, undefined, "restore");

      setRightPanel("none");
      setDiffVersions(null);
    },
    [activeId, editor, saveContent],
  );

  const handleSaveVersion = useCallback(() => {
    if (!activeId) return;
    const content = liveContent || activeDoc?.content || "";
    const author: VersionAuthor = {
      type: "human",
      id: "local-user",
      name: "You",
    };
    saveVersion(activeId, content, author, undefined, "edit");
  }, [activeId, liveContent, activeDoc?.content]);

  if (!mounted || !workspaceName) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {guestMode && (
        <GuestBanner
          onRequestAccess={() => setShowShare(true)}
          onLeave={() => window.location.reload()}
        />
      )}

      <Sidebar
        workspaceName={workspaceName}
        documents={documents}
        activeId={activeId}
        onSelect={selectDocument}
        onAdd={handleAddDocument}
        onDelete={removeDocument}
        onSearch={() => setShowSearch(true)}
        workspace={workspace}
        onWorkspaceSwitch={(ws) => {
          setWorkspace(ws);
          window.location.reload();
        }}
        onShowActivity={() =>
          setRightPanel((prev) => (prev === "activity" ? "none" : "activity"))
        }
      />

      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between border-b border-[#e5e5e5] px-8 py-3">
          <div className="flex items-center gap-3">
            {editingTitle ? (
              <input
                ref={titleRef}
                defaultValue={activeDoc?.title ?? "Untitled"}
                className="border-b border-neutral-300 bg-transparent px-0.5 text-sm font-medium text-neutral-900 outline-none"
                autoFocus
                onBlur={handleTitleSubmit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSubmit();
                  if (e.key === "Escape") setEditingTitle(false);
                }}
              />
            ) : (
              <button
                onClick={() => setEditingTitle(true)}
                className="text-sm font-medium text-neutral-900 transition-colors hover:text-neutral-600"
              >
                {activeDoc?.title || "Untitled"}
              </button>
            )}
            {saveStatus === "dirty" && (
              <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
                Saving...
              </span>
            )}
            {saveStatus === "saved" && (
              <span className="flex items-center gap-1 text-xs text-neutral-400">
                <Check className="h-3 w-3 text-emerald-500" />
                Saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            {activeId && workspace && (
              <DocumentLockIndicator
                documentId={activeId}
                currentUserId="local-user"
                currentUserName={workspaceName}
              />
            )}
            <button
              onClick={() => setShowPageSearch((prev) => !prev)}
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              title="Find in document (⌘F)"
            >
              <Search className="h-3.5 w-3.5" />
              <kbd className="hidden rounded border border-[#e5e5e5] px-1 py-0.5 text-[9px] sm:inline">
                ⌘F
              </kbd>
            </button>
            {activeId && workspace && (
              <>
                <button
                  onClick={() => setShowExport(true)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                  title="Export document"
                >
                  <Download className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                  title="Share document"
                >
                  <Share2 className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowShare(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </button>
              </>
            )}
            <button
              onClick={() => setShowGraph(true)}
              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              title="Knowledge Graph"
            >
              <Network className="h-4 w-4" />
            </button>
            <button
              onClick={handleSaveVersion}
              className="rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
              title="Save Version"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={() => togglePanel("history")}
              className={`rounded-md p-1.5 transition-colors ${
                rightPanel === "history"
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              }`}
              title="Version History"
            >
              <Clock className="h-4 w-4" />
            </button>
            <button
              onClick={() => togglePanel("comments")}
              className={`relative rounded-md p-1.5 transition-colors ${
                rightPanel === "comments"
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              }`}
              title="Comments"
            >
              <MessageSquare className="h-4 w-4" />
              {commentCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-neutral-900 px-1 text-[9px] font-bold text-white">
                  {commentCount}
                </span>
              )}
            </button>
            <button
              onClick={() => togglePanel("metadata")}
              className={`rounded-md p-1.5 transition-colors ${
                rightPanel === "metadata"
                  ? "bg-neutral-100 text-neutral-900"
                  : "text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600"
              }`}
              title="Document Info"
            >
              <Info className="h-4 w-4" />
            </button>

            <div className="mx-1 h-4 w-px bg-[#e5e5e5]" />

            <NotificationCenter onNavigate={selectDocument} />

            <PresenceBar
              awareness={provider?.awareness ?? null}
              status={status}
              isSynced={isSynced}
              currentUserId={user.id}
              agent={openClawStatus === "connected" ? agent : null}
              syncStatus={syncInfo.status}
              pendingCount={syncInfo.pendingCount}
            />

            <OfflineIndicator />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1 overflow-y-auto px-16 py-10">
            {showPageSearch && editor && (
              <PageSearch
                editor={editor}
                onClose={() => setShowPageSearch(false)}
              />
            )}
            <div className="mx-auto max-w-2xl">
              {activeId && activeDoc && isReady && (
                <DocumentContextProvider
                  documentId={activeId}
                  workspaceId={workspace?.id ?? ""}
                  documentTitle={activeDoc.title ?? "Untitled"}
                  userId={user?.id ?? ""}
                >
                  <div className="mb-3">
                    <TagBadges
                      documentId={activeId}
                      onManage={() => setShowTagManager(!showTagManager)}
                    />
                    {showTagManager && (
                      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3">
                        <TagManager
                          documentId={activeId}
                          mode="assign"
                          onClose={() => setShowTagManager(false)}
                        />
                      </div>
                    )}
                  </div>
                  <TiptapEditor
                    key={activeId}
                    onEditorReady={handleEditorReady}
                    ydoc={ydoc ?? undefined}
                    provider={provider}
                    user={user}
                    initialContent={activeDoc.content ?? ""}
                    onContentChange={handleContentChange}
                    onDirtyChange={handleDirtyChange}
                    flushRef={flushRef}
                    documentId={activeId}
                    documentTitle={activeDoc.title ?? "Untitled"}
                    workspaceId={workspace?.id ?? ""}
                    userId={user?.id ?? ""}
                  />
                  <BacklinksPanel
                    documentId={activeId}
                    onNavigate={selectDocument}
                  />
                </DocumentContextProvider>
              )}
            </div>
          </div>

          {rightPanel === "comments" && activeId && (
            <CommentSidebar
              documentId={activeId}
              onClose={() => setRightPanel("none")}
            />
          )}

          {rightPanel === "history" && activeId && !diffVersions && (
            <div className="w-72 border-l border-[#e5e5e5] bg-white">
              <VersionTimeline
                documentId={activeId}
                onRestore={handleRestoreVersion}
                onCompare={(a, b) => setDiffVersions({ a, b })}
                onClose={() => setRightPanel("none")}
              />
            </div>
          )}

          {rightPanel === "history" && diffVersions && (
            <div className="w-96 border-l border-[#e5e5e5] bg-white">
              <DiffView
                versionA={diffVersions.a}
                versionB={diffVersions.b}
                onClose={() => setDiffVersions(null)}
                onAccept={(content) => {
                  handleRestoreVersion(content);
                  setDiffVersions(null);
                }}
              />
            </div>
          )}

          {rightPanel === "metadata" && activeDoc && (
            <DocumentMetadata
              document={activeDoc}
              onClose={() => setRightPanel("none")}
            />
          )}

          {rightPanel === "activity" && (
            <div className="w-72 border-l border-[#e5e5e5] bg-white">
              <ActivityFeed
                workspaceId={workspace?.id}
                onClose={() => setRightPanel("none")}
                onNavigate={selectDocument}
              />
            </div>
          )}
        </div>
      </main>

      <AiAgent
        editor={editor}
        documentId={activeId ?? undefined}
        documentContent={liveContent || activeDoc?.content}
        openClawStatus={openClawStatus}
      />

      {showSearch && (
        <GlobalSearch
          onSelect={selectDocument}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <GraphView
            activeId={activeId ?? undefined}
            onNavigate={(id) => {
              selectDocument(id);
              setShowGraph(false);
            }}
            onClose={() => setShowGraph(false)}
          />
        </div>
      )}

      {showTemplatePicker && (
        <TemplatePicker
          onSelect={handleTemplateSelect}
          onBlank={handleBlankDocument}
          onClose={() => setShowTemplatePicker(false)}
        />
      )}

      {showTemplateEditor && (
        <TemplateEditor
          initialContent={liveContent || activeDoc?.content}
          onSave={() => setShowTemplateEditor(false)}
          onClose={() => setShowTemplateEditor(false)}
        />
      )}

      {showShare && activeId && workspace && (
        <ShareModal
          documentId={activeId}
          documentTitle={activeDoc?.title ?? "Untitled"}
          workspaceId={workspace.id}
          onClose={() => setShowShare(false)}
          openClawStatus={openClawStatus}
          onAgentConnect={(endpoint, apiKey) => {
            openClawBridge.configure(endpoint, apiKey);
            openClawBridge.connect();
          }}
          onAgentDisconnect={() => {
            openClawBridge.disconnect();
          }}
        />
      )}

      {showShareDialog && activeId && workspace && (
        <ShareDialog
          documentId={activeId}
          documentTitle={activeDoc?.title ?? "Untitled"}
          workspaceId={workspace.id}
          currentUserId={user?.id ?? "local-user"}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {showExport && activeId && (
        <DocumentExportDialog
          documentId={activeId}
          documentTitle={activeDoc?.title ?? "Untitled"}
          onClose={() => setShowExport(false)}
        />
      )}

      {showUpgradePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-6 shadow-xl">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
                <svg
                  className="h-6 w-6 text-amber-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-neutral-900">
                50 document limit reached
              </h3>
              <p className="mt-2 text-sm text-neutral-500">
                The Free plan allows up to 50 documents. Upgrade to Pro for
                $12/mo to get unlimited documents and up to 5 AI agents.
              </p>
            </div>
            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowUpgradePrompt(false)}
                className="flex-1 rounded-lg border border-neutral-200 px-4 py-2.5 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowUpgradePrompt(false);
                  window.location.href = "/pricing";
                }}
                className="flex-1 rounded-lg bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-purple-700"
              >
                View Plans
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
