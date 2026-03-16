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
  ChevronRight,
  Clock,
  FileText,
  MessageSquare,
  Info,
  Network,
  Save,
  Search,
  UserPlus,
  Download,
  Share2,
  MoreHorizontal,
} from "lucide-react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { AiAgent } from "@/components/editor/ai-agent";
import { PresenceBar } from "@/components/editor/presence-bar";
import { BacklinksPanel } from "@/components/editor/backlinks-panel";
import { DocumentMetadata } from "@/components/editor/document-metadata";
import { useCollaboration } from "@/lib/yjs/use-collaboration";
import { useSyncDocument, useSyncStatus } from "@/hooks/use-sync";
import { getDocument, updateDocument, createDocument as createLocalDocument } from "@/lib/documents/store";
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
import {
  hydratePageFromSupabase,
  useRemotePageSync,
  type RemotePage,
} from "@/lib/sync/remote-page-sync";
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
import { ShareDialog } from "@/components/editor/share-dialog";
import { InviteModal } from "@/components/invitation/invite-modal";
import { DocumentExportDialog } from "@/components/editor/document-export";
import { DocumentLockIndicator } from "@/components/collab/locks";
import { TagBadges } from "@/components/tags/tag-manager";
import { TagManager } from "@/components/tags/tag-manager";
import { ActivityFeed } from "@/components/activity/activity-feed";
import { OfflineIndicator } from "@/components/editor/offline-indicator";
import { Breadcrumb } from "@/components/ui/breadcrumb";
import { getWorkspace } from "@/lib/schools/store";
import type { Document } from "@/lib/documents/types";
import { EmojiPicker } from "@/components/editor/emoji-picker";

function getAncestorChain(
  docId: string,
  documents: { id: string; title: string; parentId?: string; icon?: string | null }[],
) {
  const chain: { id: string; title: string; parentId?: string; icon?: string | null }[] = [];
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
  const workspaceId = params.schoolId as string;
  const docId = params.id as string;

  const workspace = typeof window !== "undefined" ? getWorkspace(workspaceId) : null;
  const workspaceName = workspace?.name ?? "Workspace";

  const {
    documents,
    saveContent,
    renameDocument,
  } = useDocuments();

  const handleIconChange = useCallback((icon: string | null) => {
    updateDocument(docId, { icon });
    setActiveDoc((prev) => prev ? { ...prev, icon } : prev);
  }, [docId]);

  const [activeDoc, setActiveDoc] = useState<Document | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadDoc() {
      // 1) Try localStorage first for instant render
      let doc = getDocument(docId);

      // 2) Hydrate from Supabase — creates/updates localStorage entry
      //    if the server has a newer version (or the doc is MCP-created)
      const remote = await hydratePageFromSupabase(docId);

      if (cancelled) return;

      if (remote) {
        // Re-read from localStorage after hydration merged the data
        doc = getDocument(docId);
      }

      if (doc) {
        setActiveDoc(doc);
      } else {
        router.replace(`/s/${workspaceId}`);
      }
    }

    // Show local version immediately if available
    const localDoc = getDocument(docId);
    if (localDoc) setActiveDoc(localDoc);

    loadDoc();

    return () => { cancelled = true; };
  }, [docId, workspaceId, router]);

  const [editor, setEditor] = useState<Editor | null>(null);
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
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const overflowRef = useRef<HTMLDivElement>(null);

  const { provider, ydoc, status, isSynced, isReady, user } =
    useCollaboration(docId);
  const syncInfo = useSyncStatus();
  const { forceFlush: syncForceFlush } = useSyncDocument(docId, ydoc, {
    title: activeDoc?.title ?? "Untitled",
    workspaceId,
  });

  // --- Remote page sync (MCP / cross-device changes) ---
  const editorRef = useRef<Editor | null>(null);
  const { markLocalWrite } = useRemotePageSync(docId, {
    onContentUpdated: useCallback((remote: RemotePage) => {
      // Update React state so title + initialContent reflect the change
      setActiveDoc((prev) =>
        prev
          ? {
              ...prev,
              title: remote.title,
              content: remote.content_md ?? prev.content,
              icon: remote.icon ?? prev.icon,
              updatedAt: remote.updated_at,
            }
          : prev,
      );

      // If the editor is live, push the new content in
      const ed = editorRef.current;
      if (ed && !ed.isDestroyed && !ed.isFocused) {
        ed.commands.setContent(remote.content_md ?? "");
      }
    }, []),
    onDeleted: useCallback(() => {
      router.replace(`/s/${workspaceId}`);
    }, [router, workspaceId]),
  });

  const commentCount = getCommentCount(docId);

  const navigateToDoc = useCallback(
    (id: string) => router.push(`/s/${workspaceId}/d/${id}`),
    [router, workspaceId],
  );

  // Close overflow menu on outside click
  useEffect(() => {
    if (!showOverflowMenu) return;
    function handleClick(e: MouseEvent) {
      if (overflowRef.current && !overflowRef.current.contains(e.target as Node)) {
        setShowOverflowMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [showOverflowMenu]);

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

  const handleCreateSubPage = useCallback(() => {
    const subPage = createLocalDocument("Untitled", docId);
    if (editor && !editor.isDestroyed) {
      editor.commands.insertChildPage({
        pageId: subPage.id,
        title: subPage.title,
        icon: null,
      });
    }
    router.push(`/s/${workspaceId}/d/${subPage.id}`);
  }, [docId, editor, router, workspaceId]);

  const handleEditorReady = useCallback((ed: Editor) => {
    setEditor(ed);
    editorRef.current = ed;
  }, []);

  const handleContentChange = useCallback(
    (markdown: string) => {
      setLiveContent(markdown);
      saveContent(docId, markdown);
      markLocalWrite(markdown);
      if (openClawStatus === "connected") {
        syncCurrentDocument(docId, markdown, activeDoc?.title ?? "Untitled");
      }
      setSaveStatus("saved");
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
      savedTimerRef.current = setTimeout(() => setSaveStatus("idle"), 2000);
    },
    [docId, activeDoc?.title, saveContent, openClawStatus, markLocalWrite],
  );

  const handleContentJsonChange = useCallback(
    (json: Record<string, unknown>) => {
      updateDocument(docId, { contentJson: json });
    },
    [docId],
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
        {/* ── Compact header: breadcrumb + save status + share + presence + overflow ── */}
        <header className="document-header flex items-center justify-between border-b border-[#f0f0f0] px-6 py-1.5">
          <div className="flex items-center gap-3 min-w-0">
            <Breadcrumb
              items={[
                { id: "ws", label: workspaceName },
                ...getAncestorChain(docId, documents).map((d) => ({
                  id: d.id,
                  label: d.title || "Untitled",
                  icon: d.icon ?? undefined,
                  onClick: d.id !== docId ? () => navigateToDoc(d.id) : undefined,
                })),
              ]}
            />
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
              <>
                <button
                  onClick={() => setShowShareDialog(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-xs text-neutral-500 transition-colors hover:bg-neutral-100"
                  title="Share document"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Share</span>
                </button>
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-neutral-800"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Invite
                </button>
              </>
            )}

            <div className="mx-1 h-4 w-px bg-[#e5e5e5]" />

            <PresenceBar
              awareness={provider?.awareness ?? null}
              currentUserId={user.id}
              agent={openClawStatus === "connected" ? agent : null}
            />

            <OfflineIndicator />

            {/* Overflow menu for secondary actions */}
            <div className="relative" ref={overflowRef}>
              <button
                onClick={() => setShowOverflowMenu(!showOverflowMenu)}
                className="cursor-pointer rounded-md p-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
                title="More actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>
              {showOverflowMenu && (
                <div className="absolute right-0 top-full mt-1 z-50 w-48 rounded-lg border border-[#e5e5e5] bg-white shadow-lg py-1">
                  <button onClick={() => { setShowPageSearch((p) => !p); setShowOverflowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                    <Search className="h-3.5 w-3.5" /> Find in page <kbd className="ml-auto text-[9px] text-neutral-400">⌘F</kbd>
                  </button>
                  <button onClick={() => { setShowExport(true); setShowOverflowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                    <Download className="h-3.5 w-3.5" /> Export
                  </button>
                  <button onClick={() => { handleSaveVersion(); setShowOverflowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                    <Save className="h-3.5 w-3.5" /> Save version
                  </button>
                  <button onClick={() => { setShowGraph(true); setShowOverflowMenu(false); }} className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-neutral-600 hover:bg-neutral-50">
                    <Network className="h-3.5 w-3.5" /> Knowledge graph
                  </button>
                  <div className="mx-2 my-1 border-t border-[#f0f0f0]" />
                  <button onClick={() => { togglePanel("history"); setShowOverflowMenu(false); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm ${rightPanel === "history" ? "text-neutral-900 font-medium" : "text-neutral-600"} hover:bg-neutral-50`}>
                    <Clock className="h-3.5 w-3.5" /> Version history
                  </button>
                  <button onClick={() => { togglePanel("comments"); setShowOverflowMenu(false); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm ${rightPanel === "comments" ? "text-neutral-900 font-medium" : "text-neutral-600"} hover:bg-neutral-50`}>
                    <MessageSquare className="h-3.5 w-3.5" /> Comments
                    {commentCount > 0 && <span className="ml-auto rounded-full bg-neutral-100 px-1.5 text-[10px] font-medium">{commentCount}</span>}
                  </button>
                  <button onClick={() => { togglePanel("metadata"); setShowOverflowMenu(false); }} className={`flex w-full items-center gap-2 px-3 py-1.5 text-sm ${rightPanel === "metadata" ? "text-neutral-900 font-medium" : "text-neutral-600"} hover:bg-neutral-50`}>
                    <Info className="h-3.5 w-3.5" /> Document info
                  </button>
                </div>
              )}
            </div>

            <NotificationCenter onNavigate={navigateToDoc} />
          </div>
        </header>

        <div className="flex flex-1 overflow-hidden">
          <div className="relative flex-1 overflow-y-auto px-8 py-10">
            {showPageSearch && editor && (
              <PageSearch
                editor={editor}
                onClose={() => setShowPageSearch(false)}
              />
            )}
            <div className="mx-auto max-w-4xl">
              {isReady && (
                <DocumentContextProvider
                  documentId={docId}
                  schoolId={workspaceId}
                  documentTitle={activeDoc.title ?? "Untitled"}
                  userId={user?.id ?? ""}
                >
                  {/* Notion-style page title with emoji icon */}
                  <div className="flex items-start gap-2 mb-1">
                    <EmojiPicker
                      value={activeDoc.icon}
                      onChange={handleIconChange}
                    />
                    <input
                      ref={titleRef}
                      defaultValue={activeDoc.title ?? ""}
                      placeholder="Untitled"
                      className="flex-1 bg-transparent text-4xl font-bold text-neutral-900 placeholder:text-neutral-300 outline-none border-none pt-0.5"
                      onBlur={handleTitleSubmit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleTitleSubmit();
                          editor?.commands.focus("start");
                        }
                      }}
                    />
                  </div>
                  <div className="mb-6">
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
                  <div data-tutorial="editor-area">
                  <TiptapEditor
                    key={docId}
                    onEditorReady={handleEditorReady}
                    ydoc={ydoc ?? undefined}
                    provider={provider}
                    user={user}
                    initialContent={activeDoc.contentJson ?? activeDoc.content ?? ""}
                    onContentChange={handleContentChange}
                    onContentJsonChange={handleContentJsonChange}
                    onDirtyChange={handleDirtyChange}
                    flushRef={flushRef}
                    documentId={docId}
                    documentTitle={activeDoc.title ?? "Untitled"}
                    workspaceId={workspaceId}
                    userId={user?.id ?? ""}
                    onCreateSubPage={handleCreateSubPage}
                  />
                  </div>
                  {/* Sub-pages listed below editor content */}
                  {(() => {
                    const childPages = documents.filter((d) => d.parentId === docId);
                    if (childPages.length === 0) return null;
                    return (
                      <div className="mt-8 border-t border-neutral-100 pt-6">
                        {childPages
                          .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
                          .map((child) => (
                            <button
                              key={child.id}
                              onClick={() => navigateToDoc(child.id)}
                              className="group flex w-full items-center gap-2.5 rounded-lg border border-neutral-200 bg-white px-4 py-3 mb-2 text-left transition-all hover:border-neutral-300 hover:bg-neutral-50 hover:shadow-sm"
                            >
                              <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                                {(child as any).icon ? (
                                  <span className="text-base">{(child as any).icon}</span>
                                ) : (
                                  <FileText className="h-4 w-4 text-neutral-400 group-hover:text-neutral-600" />
                                )}
                              </span>
                              <span className="flex-1 truncate text-sm font-medium text-neutral-700 group-hover:text-neutral-900">
                                {child.title || "Untitled"}
                              </span>
                              <ChevronRight className="h-4 w-4 shrink-0 text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500" />
                            </button>
                          ))}
                      </div>
                    );
                  })()}
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

      {showInviteModal && workspace && (
        <InviteModal
          open={showInviteModal}
          onOpenChange={setShowInviteModal}
          workspaceId={workspaceId}
          workspaceName={workspaceName}
        />
      )}
    </>
  );
}
