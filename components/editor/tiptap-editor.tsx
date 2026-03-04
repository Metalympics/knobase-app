"use client";

import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import { ResizableImage } from "./extensions/resizable-image";
import { Link } from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Highlight } from "@tiptap/extension-highlight";
import { Typography } from "@tiptap/extension-typography";
import { Markdown } from "tiptap-markdown";
import { useState, useCallback, useRef, useEffect, useSyncExternalStore } from "react";
import * as Y from "yjs";
import { AnimatePresence } from "framer-motion";
import { SlashCommandMenu } from "./slash-command";
import { TableBlock } from "./blocks/TableBlock";
import { TaskListBlock } from "./blocks/TaskListBlock";
import { SearchExtension } from "@/lib/search/search-extension";
import { InlineAgent, setOnSuggestionCallback } from "./extensions/inline-agent";
import { MentionNode } from "./extensions/mention-node";
import { AgentSelector } from "./extensions/agent-selector";
import { AgentCursorOverlay } from "./agent-cursor";
import { OpenClawStatus } from "./openclaw-status";
import {
  InlineSuggestion,
  InlineEditHandler,
  SuggestionsPanel,
  type InlineSuggestionData,
} from "@/components/agent/inline-suggestion";
import { useOpenClawAwarenessRelay } from "@/lib/sync/awareness-relay";
import { TaskQueuePanel } from "@/components/tasks/task-queue-panel";
import { AgentSessionIndicator } from "@/components/agent/agent-session-indicator";
import { useDocumentProposals } from "@/hooks/use-agent-proposals";
import {
  acceptEdit,
  rejectEdit,
  acceptEditWithChanges,
  acceptAllEdits,
  rejectAllEdits,
} from "@/lib/agents/task-coordinator";
import type { SupabaseProvider } from "@/lib/yjs/supabase-provider";
import type { Agent } from "@/lib/agents/types";

interface TiptapEditorProps {
  onEditorReady?: (editor: Editor) => void;
  ydoc?: Y.Doc;
  provider?: SupabaseProvider | null;
  user?: { id: string; name: string; color: string };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialContent?: string | Record<string, any>;
  onContentChange?: (markdown: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  flushRef?: React.MutableRefObject<(() => void) | null>;
  documentId?: string;
  documentTitle?: string;
  workspaceId?: string;
  userId?: string;
  /** Currently active agent for presence display */
  activeAgent?: Agent | null;
}

/* ------------------------------------------------------------------ */
/* Suggestion handler (singleton per editor instance)                  */
/* ------------------------------------------------------------------ */

const EMPTY_SUGGESTIONS: InlineSuggestionData[] = [];

const defaultAgent: Agent = {
  id: "agent",
  name: "AI Agent",
  avatar: "🤖",
  color: "#8B5CF6",
  status: "online",
  personality: "helpful",
  capabilities: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export function TiptapEditor({
  onEditorReady,
  ydoc,
  provider,
  user,
  initialContent,
  onContentChange,
  onDirtyChange,
  flushRef,
  documentId = "",
  documentTitle = "Untitled",
  workspaceId = "",
  userId = "",
  activeAgent,
}: TiptapEditorProps) {
  const [slashMenu, setSlashMenu] = useState({
    isOpen: false,
    position: { top: 0, left: 0 },
    query: "",
  });
  const [agentSelector, setAgentSelector] = useState({
    isOpen: false,
    position: { top: 0, left: 0 },
    query: "",
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDirtyRef = useRef(false);
  const latestContentRef = useRef<string | null>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const onContentChangeRef = useRef(onContentChange);
  const onDirtyChangeRef = useRef(onDirtyChange);

  // Inline suggestion handler
  const editHandlerRef = useRef(new InlineEditHandler());
  const editHandler = editHandlerRef.current;
  const suggestions = useSyncExternalStore(
    (cb) => editHandler.subscribe(cb),
    () => editHandler.getSuggestions(),
    () => EMPTY_SUGGESTIONS,
  );

  // Wire the suggestion callback so SSE suggestions flow into the handler
  useEffect(() => {
    setOnSuggestionCallback((suggestion: InlineSuggestionData) => {
      editHandler.addSuggestion(suggestion);
    });
    return () => setOnSuggestionCallback(null);
  }, [editHandler]);

  // Connect OpenClaw awareness relay to Yjs provider
  useOpenClawAwarenessRelay(provider ?? null, documentId);

  useEffect(() => {
    onContentChangeRef.current = onContentChange;
  }, [onContentChange]);
  useEffect(() => {
    onDirtyChangeRef.current = onDirtyChange;
  }, [onDirtyChange]);

  const editor = useEditor(
    {
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
          codeBlock: { HTMLAttributes: { class: "tiptap-code-block" } },
          ...(ydoc ? { undoRedo: false } : {}),
        }),
        Placeholder.configure({
          placeholder: ({ node }) => {
            if (node.type.name === "heading") return "Heading";
            return 'Type "/" for commands or "@" to mention...';
          },
        }),
        Markdown.configure({
          html: false,
          transformCopiedText: true,
          transformPastedText: true,
        }),
        Table.configure({
          resizable: true,
          HTMLAttributes: { class: "tiptap-table" },
        }),
        TableRow,
        TableCell,
        TableHeader,
        ResizableImage,
        Link.configure({
          openOnClick: true,
          HTMLAttributes: { class: "tiptap-link" },
        }),
        TaskList.configure({
          HTMLAttributes: { class: "tiptap-task-list" },
        }),
        TaskItem.configure({
          nested: true,
          HTMLAttributes: { class: "tiptap-task-item" },
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Typography,
        SearchExtension,
        InlineAgent.configure({
          HTMLAttributes: {
            class: "inline-agent-node",
          },
        }),
        MentionNode,
        ...(ydoc
          ? [
              Collaboration.configure({ document: ydoc }),
              ...(provider
                ? [
                    CollaborationCursor.configure({
                      provider: provider as any,
                      user: user
                        ? { name: user.name, color: user.color }
                        : undefined,
                    }),
                  ]
                : []),
            ]
          : []),
      ],
      ...(ydoc ? {} : { content: initialContent || "" }),
      editorProps: {
        attributes: {
          class: "tiptap-editor outline-none",
        },
        handleKeyDown: (_view, event) => {
          if (slashMenu.isOpen) {
            if (
              ["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)
            ) {
              return true;
            }
          }
          return false;
        },
        handleDrop: (view, event, _slice, moved) => {
          if (moved || !event.dataTransfer?.files.length) return false;

          const images = Array.from(event.dataTransfer.files).filter((f) =>
            f.type.startsWith("image/")
          );
          if (images.length === 0) return false;

          event.preventDefault();

          const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });

          images.forEach((file) => {
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (!src) return;
              const pos = coords?.pos ?? view.state.selection.from;
              const node = view.state.schema.nodes.image.create({ src });
              const tr = view.state.tr.insert(pos, node);
              view.dispatch(tr);
            };
            reader.readAsDataURL(file);
          });

          return true;
        },
        handlePaste: (view, event) => {
          const items = event.clipboardData?.items;
          if (!items) return false;

          const images = Array.from(items).filter((item) =>
            item.type.startsWith("image/")
          );
          if (images.length === 0) return false;

          event.preventDefault();

          images.forEach((item) => {
            const file = item.getAsFile();
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
              const src = e.target?.result as string;
              if (!src) return;
              const node = view.state.schema.nodes.image.create({ src });
              const tr = view.state.tr.replaceSelectionWith(node);
              view.dispatch(tr);
            };
            reader.readAsDataURL(file);
          });

          return true;
        },
      },
      onUpdate: ({ editor: ed }) => {
        const { from } = ed.state.selection;
        const textBefore = ed.state.doc.textBetween(
          Math.max(0, from - 20),
          from,
          "\n",
        );

        const slashMatch = textBefore.match(/\/([a-zA-Z]*)$/);

        if (slashMatch) {
          const coords = ed.view.coordsAtPos(from);
          setSlashMenu({
            isOpen: true,
            position: { top: coords.top, left: coords.left },
            query: slashMatch[1],
          });
        } else {
          setSlashMenu((prev) =>
            prev.isOpen ? { ...prev, isOpen: false } : prev,
          );
        }

        if (onContentChangeRef.current) {
          const storage = ed.storage as unknown as Record<
            string,
            Record<string, () => string>
          >;
          latestContentRef.current = storage.markdown?.getMarkdown?.() ?? "";

          if (!isDirtyRef.current) {
            isDirtyRef.current = true;
            onDirtyChangeRef.current?.(true);
          }

          if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
          saveTimeoutRef.current = setTimeout(() => {
            onContentChangeRef.current?.(latestContentRef.current ?? "");
            isDirtyRef.current = false;
            onDirtyChangeRef.current?.(false);
            saveTimeoutRef.current = null;
          }, 500);
        }
      },
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ydoc],
    // provider and user are captured once on mount (TiptapEditor is always
    // remounted via key={activeId} when the document changes, and the render
    // guard ensures provider is non-null before the first mount).
  );

  useEffect(() => {
    editorInstanceRef.current = editor ?? null;
  }, [editor]);

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  // Monitor editor storage for agent selector state
  useEffect(() => {
    if (!editor) return;

    const updateAgentSelector = () => {
      const storage = editor.storage as {
        inlineAgent?: {
          showAgentSelector?: boolean;
          position?: { top: number; left: number };
          query?: string;
        };
      };
      if (storage.inlineAgent) {
        setAgentSelector({
          isOpen: storage.inlineAgent.showAgentSelector || false,
          position: storage.inlineAgent.position || { top: 0, left: 0 },
          query: storage.inlineAgent.query || "",
        });
      }
    };

    editor.on("update", updateAgentSelector);
    return () => {
      editor.off("update", updateAgentSelector);
    };
  }, [editor]);

  const flush = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    if (!isDirtyRef.current) return;

    let md: string | null = null;
    const ed = editorInstanceRef.current;
    if (ed && !ed.isDestroyed) {
      try {
        const storage = ed.storage as unknown as Record<
          string,
          Record<string, () => string>
        >;
        md = storage.markdown?.getMarkdown?.() ?? "";
      } catch {
        /* editor may be transitioning, fall back to cached content */
      }
    }

    onContentChangeRef.current?.(md ?? latestContentRef.current ?? "");
    isDirtyRef.current = false;
    onDirtyChangeRef.current?.(false);
  }, []);

  useEffect(() => {
    if (flushRef) flushRef.current = flush;
    return () => {
      if (flushRef) flushRef.current = null;
    };
  }, [flush, flushRef]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (isDirtyRef.current && latestContentRef.current !== null) {
        onContentChangeRef.current?.(latestContentRef.current);
      }
    };
  }, []);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const closeAgentSelector = useCallback(() => {
    if (editor) {
      const storage = editor.storage as {
        inlineAgent?: { showAgentSelector?: boolean };
      };
      if (storage.inlineAgent) {
        storage.inlineAgent.showAgentSelector = false;
      }
    }
    setAgentSelector((prev) => ({ ...prev, isOpen: false }));
  }, [editor]);

  // Supabase proposals for this document (must be called before any early return)
  const supabaseProposals = useDocumentProposals(documentId || null);

  const handleNavigateToSession = useCallback(
    (_documentId: string, blockId?: string) => {
      if (!editor || editor.isDestroyed) return;
      if (blockId) {
        // Try to find the block element and scroll to it
        const el = document.getElementById(blockId);
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }
      }
      // Fall back to focusing the editor
      editor.commands.focus("start");
    },
    [editor],
  );

  if (!editor) return null;

  const pendingSuggestions = suggestions.filter((s) => s.status === "pending");
  const agentForSuggestions = activeAgent ?? defaultAgent;

  const handleAcceptSuggestion = (id: string) => {
    const s = editHandler.acceptSuggestion(id);
    if (s && editor && !editor.isDestroyed) {
      try {
        const docSize = editor.state.doc.content.size;
        const from = Math.min(s.range.from, docSize);
        const to = Math.min(s.range.to, docSize);
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, s.suggestedText).run();
      } catch {
        // position may have shifted
      }
    }
    // Also accept the matching Supabase proposal if found
    if (userId) {
      const match = supabaseProposals.pending.find(
        (p) => (p.proposed_content as Record<string, unknown>)?.text === s?.suggestedText,
      );
      if (match) {
        acceptEdit(match.id, userId).catch(() => {});
      }
    }
  };

  const handleRejectSuggestion = (id: string) => {
    const s = editHandler.getSuggestions().find((x) => x.id === id);
    editHandler.rejectSuggestion(id);
    // Also reject the matching Supabase proposal
    if (userId && s) {
      const match = supabaseProposals.pending.find(
        (p) => (p.proposed_content as Record<string, unknown>)?.text === s.suggestedText,
      );
      if (match) {
        rejectEdit(match.id, userId).catch(() => {});
      }
    }
  };

  const handleModifySuggestion = (id: string, newText: string) => {
    const s = editHandler.modifySuggestion(id, newText);
    if (s && editor && !editor.isDestroyed) {
      try {
        const docSize = editor.state.doc.content.size;
        const from = Math.min(s.range.from, docSize);
        const to = Math.min(s.range.to, docSize);
        editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, s.suggestedText).run();
      } catch {
        // position may have shifted
      }
    }
    // Accept with modifications in Supabase
    if (userId) {
      const match = supabaseProposals.pending.find(
        (p) => (p.proposed_content as Record<string, unknown>)?.text === s?.suggestedText || (p.proposed_content as Record<string, unknown>)?.text === s?.originalText,
      );
      if (match) {
        acceptEditWithChanges(match.id, userId, { text: newText }).catch(() => {});
      }
    }
  };

  const handleAcceptAll = () => {
    const accepted = editHandler.acceptAll();
    // Apply in reverse order to preserve positions
    accepted
      .sort((a, b) => b.range.from - a.range.from)
      .forEach((s) => {
        try {
          const docSize = editor.state.doc.content.size;
          const from = Math.min(s.range.from, docSize);
          const to = Math.min(s.range.to, docSize);
          editor.chain().focus().deleteRange({ from, to }).insertContentAt(from, s.suggestedText).run();
        } catch {
          // skip
        }
      });
    // Accept all pending Supabase proposals for this document
    if (userId && supabaseProposals.pending.length > 0) {
      const taskIds = new Set(supabaseProposals.pending.map((p) => p.task_id));
      taskIds.forEach((taskId) => {
        acceptAllEdits(taskId, userId).catch(() => {});
      });
    }
  };

  const handleRejectAll = () => {
    editHandler.rejectAll();
    // Reject all pending Supabase proposals
    if (userId && supabaseProposals.pending.length > 0) {
      const taskIds = new Set(supabaseProposals.pending.map((p) => p.task_id));
      taskIds.forEach((taskId) => {
        rejectAllEdits(taskId, userId).catch(() => {});
      });
    }
  };

  const handleNavigateSuggestion = (s: InlineSuggestionData) => {
    try {
      const docSize = editor.state.doc.content.size;
      const pos = Math.min(s.range.from, docSize);
      editor.commands.focus();
      editor.commands.setTextSelection(pos);
    } catch {
      // position invalid
    }
  };

  return (
    <div ref={editorRef} className="relative flex-1">
      {/* Agent session indicator + OpenClaw status */}
      <div className="absolute right-2 top-2 z-10 flex items-center gap-2">
        {documentId && (
          <AgentSessionIndicator
            documentId={documentId}
            userId={userId || undefined}
            onNavigate={handleNavigateToSession}
          />
        )}
        <OpenClawStatus />
      </div>

      <TableBlock editor={editor} />
      <TaskListBlock editor={editor} />
      <EditorContent editor={editor} className="tiptap-wrapper" />

      {/* Agent cursor overlay */}
      {provider && (
        <AgentCursorOverlay
          awareness={(provider as any).awareness ?? null}
          editor={editor}
        />
      )}

      {/* Inline suggestions from agent */}
      <AnimatePresence>
        {pendingSuggestions.map((s) => (
          <InlineSuggestion
            key={s.id}
            suggestion={s}
            agent={agentForSuggestions}
            onAccept={handleAcceptSuggestion}
            onReject={handleRejectSuggestion}
            onModify={handleModifySuggestion}
          />
        ))}
      </AnimatePresence>

      {/* Suggestions summary panel */}
      <AnimatePresence>
        {pendingSuggestions.length > 1 && (
          <SuggestionsPanel
            suggestions={suggestions}
            agent={agentForSuggestions}
            onAcceptAll={handleAcceptAll}
            onRejectAll={handleRejectAll}
            onNavigate={handleNavigateSuggestion}
          />
        )}
      </AnimatePresence>

      <SlashCommandMenu
        editor={editor}
        isOpen={slashMenu.isOpen}
        position={slashMenu.position}
        onClose={closeSlashMenu}
        query={slashMenu.query}
      />
      <AgentSelector
        editor={editor}
        isOpen={agentSelector.isOpen}
        position={agentSelector.position}
        query={agentSelector.query}
        documentId={documentId}
        documentTitle={documentTitle}
        workspaceId={workspaceId}
        userId={userId}
        onClose={closeAgentSelector}
      />

      {/* Task queue panel — shows agent tasks for this document */}
      {documentId && (
        <TaskQueuePanel
          documentId={documentId}
          className="mt-4 border-t border-neutral-100 pt-4 dark:border-neutral-800"
        />
      )}
    </div>
  );
}
