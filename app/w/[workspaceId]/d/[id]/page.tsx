"use client";

import {
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";
import { useParams, useRouter } from "next/navigation";
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
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { AiAgent } from "@/components/editor/ai-agent";
import { PresenceBar } from "@/components/editor/presence-bar";
import { BacklinksPanel } from "@/components/editor/backlinks-panel";
import { DocumentMetadata } from "@/components/editor/document-metadata";
import { useCollaboration } from "@/lib/yjs/use-collaboration";
import { useSyncDocument, useSyncStatus } from "@/hooks/use-sync";
import { getDocument } from "@/lib/documents/store";
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
import {
  saveVersion,
  shouldAutoSave,
  markAutoSaved,
  type Version,
  type VersionAuthor,
} from "@/lib/history/versions";
import { getCommentCount } from "@/lib/comments/store";

import { DocumentContextProvider } from "@/contexts/DocumentContext";
import { NotificationCenter } from "@/components/notifications/notification-center";
import { ShareModal } from "@/components/permissions/share-modal";
import { ShareDialog } from "@/components/editor/share-dialog";
import { DocumentExportDialog } from "@/components/editor/document-export";
import { DocumentLockIndicator } from "@/components/collab/locks";
import { TagBadges } from "@/components/tags/tag-manager";
import { TagManager } from "@/components/tags/tag-manager";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { OfflineIndicator } from "@/components/editor/offline-indicator";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getWorkspace } from "@/lib/workspaces/store";
import type { Document } from "@/lib/documents/types";

function getAncestorChain(
  docId: string,
  documents: { id: string; title: string; parentId?: string }[],
) {
  const chain: { id: string; title: string; parentId?: string }[] = [];
  let current = documents.find((d) => d.id === docId);
  while (current) {
    chain.unshift(current);
    current = current.parentId
      ? documents.find((d) => d.id === current!.parentId)
      : undefined;
  }
  return chain;
}

type RightPanel = "none" | "comments" | "history" | "metadata" | "activity";

export default function WorkspaceDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const workspaceId = params.workspaceId as string;
  const docId = params.id as string;

  const workspace = typeof window !== "undefined" ? getWorkspace(workspaceId) : null;
  const workspaceName = workspace?.name ?? "Workspace";

  const {
    documents,
    saveContent,
    renameDocument,
  } = useDocuments();

  const [activeDoc, setActiveDoc] = useState<Document | null>(null);

  useEffect(() => {
    const doc = getDocument(docId);
    if (doc) {
      setActiveDoc(doc);
    } else {
      router.replace(`/w/${workspaceId}`);
    }
  }, [docId, workspaceId, router]);

  const [editor, setEditor] = useState<Editor | null>(null);
  const [editingTitle, setEditingTitle] = useState(false);
  const [agent] = useState<Agent | null>(() => getDefaultAgent());
  const [liveContent, setLiveContent] = useState("");
  const [openClawStatus, setOpenClawStatus] =
    useState<OpenClawConnectionStatus>("disconnected");
  const titleRef = useRef<HTMLInputElement>(null);
  const flushRef = useRef<(() => void) | null>(null);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "dirty" | "saved">("idle");

  const [rightPanel, setRightPanel] = useState<RightPanel>("none");
  const [showSearch, setShowSearch] = useState(false);
  const [showPageSearch, setShowPageSearch] = useState(false);
  const [showGraph, setShowGraph] = useState(false);
  const [diffVersions, setDiffVersions] = useState<{
    a: Version;
    b: Version;
  } | null>(null);
  const [showShare, setShowShare] = useState(false);
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);

  const { provider, ydoc, status, isSynced, isReady, user } =
    useCollaboration(docId);
  const syncInfo = useSyncStatus();
  const { forceFlush: syncForceFlush } = useSyncDocument(docId, ydoc, {
    title: activeDoc?.title ?? "Untitled",
    workspaceId,
  });

  const commentCount = getCommentCount(docId);

  const navigateToDoc = useCallback(
    (id: string) => router.push(`/w/${workspaceId}/d/${id}`),
    [router, workspaceId],
  );

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
  }, [syncForceFlush]);

  useEffect(() => {
    const handleBeforeUnload = () => flushRef.current?.();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  useEffect(() => {
    setSaveStatus("idle");
  }, [docId]);

  useEffect(() => {
    if (!liveContent) return;
    if (shouldAutoSave(docId)) {
      const author: VersionAuthor = {
        type: "human",
        id: "local-user",
        name: "You",
      };
      saveVersion(docId, liveContent, author, undefined, "auto-save");
      markAutoSaved(docId);
    }
  }, [docId, liveContent]);

  useEffect(() => {
    const unsubStatus = openClawBridge.onStatusChange((s) => {
      setOpenClawStatus(s);
      if (s === "connected") startContextSync();
      else stopContextSync();
    });

    const unsubCommand = openClawBridge.onCommand((cmd) => {
      if (cmd.action === "select_document" && cmd.params.documentId) {
        navigateToDoc(cmd.params.documentId as string);
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
  }, [navigateToDoc]);

  const handleEditorReady = useCallback((ed: Editor) => {
    setEditor(ed);
  }, []);

  const handleContentChange = useCallback(
    (markdown: string) => {
      setLiveContent(markdown);
      saveContent(docId, markdown);
      if (openClawStatus === "connected") {
        syncCurrentDocument(docId, markdown, activeDoc?.title ?? "Untitled");
      }
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    },
    [docId, activeDoc?.title, saveContent, openClawStatus],
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
    if (titleRef.current) {
      const newTitle = titleRef.current.value.trim() || "Untitled";
      renameDocument(docId, newTitle);
      setActiveDoc((prev) => (prev ? { ...prev, title: newTitle } : prev));
    }
    setEditingTitle(false);
  }, [docId, renameDocument]);

  const togglePanel = useCallback((panel: RightPanel) => {
    setRightPanel((prev) => (prev === panel ? "none" : panel));
  }, []);

  const handleRestoreVersion = useCallback(
    (content: string) => {
      if (!editor) return;
      editor.commands.setContent(content);
      saveContent(docId, content);
      const author: VersionAuthor = {
        type: "human",
        id: "local-user",
        name: "You",
      };
      saveVersion(docId, content, author, undefined, "restore");
      setRightPanel("none");
      setDiffVersions(null);
    },
    [docId, editor, saveContent],
  );

  const handleSaveVersion = useCallback(() => {
    const content = liveContent || activeDoc?.content || "";
    const author: VersionAuthor = {
      type: "human",
      id: "local-user",
      name: "You",
    };
    saveVersion(docId, content, author, undefined, "edit");
  }, [docId, liveContent, activeDoc?.content]);

  if (!activeDoc) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900" />
      </div>
    );
  }

  return (
    <>
      <main className="flex flex-1 flex-col overflow-hidden">
        <header className="flex items-center justify-between px-6 py-2">
          <div className="flex items-center gap-3 min-w-0">
            {editingTitle ? (
              <>
                <Breadcrumb
                  items={[
                    { id: "ws", label: workspaceName },
                    ...getAncestorChain(docId, documents)
                      .slice(0, -1)
                      .map((d) => ({
                        id: d.id,
                        label: d.title || "Untitled",
                        onClick: () => navigateToDoc(d.id),
                      })),
                  ]}
                />
                <input
                  ref={titleRef}
                  defaultValue={activeDoc.title ?? "Untitled"}
                  className="border-b border-neutral-300 bg-transparent px-0.5 text-sm font-medium text-neutral-900 outline-none"
                  autoFocus
                  onBlur={handleTitleSubmit}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleTitleSubmit();
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                />
              </>
            ) : (
              <Breadcrumb
                items={[
                  { id: "ws", label: workspaceName },
                  ...getAncestorChain(docId, documents).map((d) => ({
                    id: d.id,
                    label: d.title || "Untitled",
                    onClick:
                      d.id !== docId
                        ? () => navigateToDoc(d.id)
                        : () => setEditingTitle(true),
                  })),
                ]}
              />
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
            {workspace && (
              <DocumentLockIndicator
                documentId={docId}
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
            {workspace && (
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

            <NotificationCenter onNavigate={navigateToDoc} />

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
              {isReady && (
                <DocumentContextProvider
                  documentId={docId}
                  workspaceId={workspaceId}
                  documentTitle={activeDoc.title ?? "Untitled"}
                  userId={user?.id ?? ""}
                >
                  <div className="mb-3">
                    <TagBadges
                      documentId={docId}
                      onManage={() => setShowTagManager(!showTagManager)}
                    />
                    {showTagManager && (
                      <div className="mt-2 rounded-lg border border-neutral-200 bg-white p-3">
                        <TagManager
                          documentId={docId}
                          mode="assign"
                          onClose={() => setShowTagManager(false)}
                        />
                      </div>
                    )}
                  </div>
                  <TiptapEditor
                    key={docId}
                    onEditorReady={handleEditorReady}
                    ydoc={ydoc ?? undefined}
                    provider={provider}
                    user={user}
                    initialContent={activeDoc.content ?? ""}
                    onContentChange={handleContentChange}
                    onDirtyChange={handleDirtyChange}
                    flushRef={flushRef}
                    documentId={docId}
                    documentTitle={activeDoc.title ?? "Untitled"}
                    workspaceId={workspaceId}
                    userId={user?.id ?? ""}
                  />
                  <BacklinksPanel
                    documentId={docId}
                    onNavigate={navigateToDoc}
                  />
                </DocumentContextProvider>
              )}
            </div>
          </div>

          {rightPanel === "comments" && (
            <CommentSidebar
              documentId={docId}
              onClose={() => setRightPanel("none")}
            />
          )}

          {rightPanel === "history" && !diffVersions && (
            <div className="w-72 border-l border-[#e5e5e5] bg-white">
              <VersionTimeline
                documentId={docId}
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
                workspaceId={workspaceId}
                onClose={() => setRightPanel("none")}
                onNavigate={navigateToDoc}
              />
            </div>
          )}
        </div>
      </main>

      <AiAgent
        editor={editor}
        documentId={docId}
        documentContent={liveContent || activeDoc.content}
        openClawStatus={openClawStatus}
      />

      {showSearch && (
        <GlobalSearch
          onSelect={navigateToDoc}
          onClose={() => setShowSearch(false)}
        />
      )}

      {showGraph && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
          <GraphView
            activeId={docId}
            onNavigate={(id) => {
              navigateToDoc(id);
              setShowGraph(false);
            }}
            onClose={() => setShowGraph(false)}
          />
        </div>
      )}

      {showShare && workspace && (
        <ShareModal
          documentId={docId}
          documentTitle={activeDoc.title ?? "Untitled"}
          workspaceId={workspaceId}
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

      {showShareDialog && workspace && (
        <ShareDialog
          documentId={docId}
          documentTitle={activeDoc.title ?? "Untitled"}
          workspaceId={workspaceId}
          currentUserId={user?.id ?? "local-user"}
          onClose={() => setShowShareDialog(false)}
        />
      )}

      {showExport && (
        <DocumentExportDialog
          documentId={docId}
          documentTitle={activeDoc.title ?? "Untitled"}
          onClose={() => setShowExport(false)}
        />
      )}
    </>
  );
}
