"use client";

import { useCallback, useEffect, useRef } from "react";
import type { Editor } from "@tiptap/react";
import { TiptapEditor } from "@/components/editor/tiptap-editor";
import { DemoProvider, useDemo, SEED_TASKS } from "@/lib/demo/context";
import { DemoSidebar } from "@/components/demo/demo-sidebar";

// ── Helpers for seed task injection ──

function injectSeedNodes(editor: Editor, tasks: typeof SEED_TASKS) {
  // Find the first blockquote in the doc (the > 💡 CTA hint)
  // and insert the inline agent node right after it.
  let insertPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (insertPos !== null) return false;
    if (node.type.name === "blockquote") {
      insertPos = pos + node.nodeSize;
      return false;
    }
  });

  // Fallback: insert after the first empty paragraph
  if (insertPos === null) {
    editor.state.doc.descendants((node, pos) => {
      if (insertPos !== null) return false;
      if (
        node.type.name === "paragraph" &&
        node.textContent.trim().length === 0
      ) {
        insertPos = pos + node.nodeSize;
        return false;
      }
    });
  }

  // Last resort: end of document
  if (insertPos === null) {
    insertPos = editor.state.doc.content.size;
  }

  const { schema } = editor.state;
  const nodesToInsert = tasks.map((task) => {
    const inlineNode = schema.nodes.inlineAgent.create({
      taskId: task.id,
      agentId: task.agentId,
      agentName: task.agentName,
      agentAvatar: task.agentAvatar,
      agentColor: task.agentColor,
      submittedPrompt: task.prompt,
      promptMode: false,
      documentId: task.documentId,
    });
    return schema.nodes.paragraph.create(null, inlineNode);
  });

  try {
    const tr = editor.state.tr.insert(insertPos, nodesToInsert);
    editor.view.dispatch(tr);
  } catch (e) {
    console.warn("[Demo] Failed to inject seed nodes:", e);
  }
}

function scrollToInlineAgent(editor: Editor, taskId: string) {
  let targetPos: number | null = null;
  editor.state.doc.descendants((node, pos) => {
    if (targetPos !== null) return false;
    if (node.type.name === "inlineAgent" && node.attrs.taskId === taskId) {
      targetPos = pos;
      return false;
    }
  });

  if (targetPos !== null) {
    try {
      const domInfo = editor.view.domAtPos(targetPos);
      const el =
        domInfo.node instanceof HTMLElement
          ? domInfo.node
          : domInfo.node.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch {
      // DOM position may not be resolvable yet
    }
  }
}

export default function DemoPage() {
  return (
    <DemoProvider>
      <DemoPageContent />
    </DemoProvider>
  );
}

function DemoPageContent() {
  const demo = useDemo();
  const editorRef = useRef<Editor | null>(null);
  const prevDocIdRef = useRef<string | null>(null);
  const seededDocsRef = useRef<Set<string>>(new Set());

  // When the current document changes, snapshot the old editor's JSON
  // so inline agent nodes survive the round-trip.
  useEffect(() => {
    const prevId = prevDocIdRef.current;
    const newId = demo.currentDocument?.id ?? null;

    if (prevId && prevId !== newId && editorRef.current) {
      demo.saveEditorJson(prevId, editorRef.current.getJSON());
      editorRef.current = null;
    }

    prevDocIdRef.current = newId;
  }, [demo, demo.currentDocument?.id]);

  // Inject seed inline-agent nodes + handle scroll-to-task.
  // Separated from handleEditorReady to avoid timing issues with editor
  // content parsing. Runs once per document when the editor is available.
  const pendingScrollRef = useRef<string | null>(null);

  // When a scroll target is set (user clicked a task in sidebar),
  // either stash it for handleEditorReady (different doc → remount)
  // or scroll immediately (same doc → editor already loaded).
  useEffect(() => {
    if (!demo.pendingScrollTaskId) return;
    const taskId = demo.pendingScrollTaskId;
    demo.clearPendingScroll();

    if (editorRef.current) {
      // Editor is already loaded — scroll directly
      requestAnimationFrame(() => {
        if (editorRef.current) scrollToInlineAgent(editorRef.current, taskId);
      });
    } else {
      // Editor will remount — stash for handleEditorReady
      pendingScrollRef.current = taskId;
    }
  }, [demo, demo.pendingScrollTaskId]);

  const handleEditorReady = useCallback(
    (editor: Editor) => {
      editorRef.current = editor;
      const docId = demo.currentDocument?.id;
      if (!docId) return;

      const scrollTarget = pendingScrollRef.current;
      pendingScrollRef.current = null;

      // Brief delay for the editor to finish initializing content
      requestAnimationFrame(() => {
        // ── Inject seed inline-agent nodes on first load ──
        if (!seededDocsRef.current.has(docId) && !demo.getEditorJson(docId)) {
          const seedTasks = SEED_TASKS.filter((t) => t.documentId === docId);

          if (seedTasks.length > 0) {
            seededDocsRef.current.add(docId);
            injectSeedNodes(editor, seedTasks);
          }
        }

        // ── Scroll to task anchor ──
        if (scrollTarget) {
          requestAnimationFrame(() => scrollToInlineAgent(editor, scrollTarget));
        }
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [demo.currentDocument?.id],
  );

  const handleContentChange = useCallback(
    (markdown: string) => {
      if (demo.currentDocument) {
        demo.updateDocumentContent(demo.currentDocument.id, markdown);
      }
    },
    [demo]
  );

  const currentDoc = demo.currentDocument;
  if (!currentDoc) return null;

  // Prefer the JSON snapshot (preserves inline agent nodes) over markdown
  const jsonSnapshot = demo.getEditorJson(currentDoc.id);
  const editorContent = jsonSnapshot ?? currentDoc.content;

  return (
    <div className="flex h-screen bg-white">
      <DemoSidebar />

      <div className="flex flex-1 flex-col min-w-0">
        {/* Demo info banner */}
        <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-700">
          You&apos;re in demo mode — no account required. Type{" "}
          <kbd className="rounded border border-amber-300 bg-amber-100 px-1 py-0.5 font-mono text-[10px]">
            @
          </kbd>{" "}
          in the editor to try AI agent mentions.
          {demo.agentTyping && (
            <span className="ml-3 inline-flex items-center gap-1.5 text-indigo-600">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500" />
              {demo.agentTyping.name} is thinking…
            </span>
          )}
        </div>

        {/* Editor */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-6 py-8">
            <TiptapEditor
              key={currentDoc.id}
              initialContent={editorContent}
              onEditorReady={handleEditorReady}
              onContentChange={handleContentChange}
              documentId={currentDoc.id}
              documentTitle={currentDoc.title}
              workspaceId={demo.workspace.id}
            />
          </div>
        </main>
      </div>

    </div>
  );
}
