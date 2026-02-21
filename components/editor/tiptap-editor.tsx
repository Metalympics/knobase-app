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
import { Image } from "@tiptap/extension-image";
import { Link } from "@tiptap/extension-link";
import { TaskList } from "@tiptap/extension-task-list";
import { TaskItem } from "@tiptap/extension-task-item";
import { Highlight } from "@tiptap/extension-highlight";
import { Typography } from "@tiptap/extension-typography";
import { Markdown } from "tiptap-markdown";
import { useState, useCallback, useRef, useEffect } from "react";
import * as Y from "yjs";
import { SlashCommandMenu } from "./slash-command";
import { TableBlock } from "./blocks/TableBlock";
import { TaskListBlock } from "./blocks/TaskListBlock";
import { SearchExtension } from "@/lib/search/search-extension";
import { InlineAgent } from "./extensions/inline-agent";
import { AgentSelector } from "./extensions/agent-selector";
import type { SupabaseProvider } from "@/lib/yjs/supabase-provider";

interface TiptapEditorProps {
  onEditorReady?: (editor: Editor) => void;
  ydoc?: Y.Doc;
  provider?: SupabaseProvider | null;
  user?: { id: string; name: string; color: string };
  initialContent?: string;
  onContentChange?: (markdown: string) => void;
  onDirtyChange?: (dirty: boolean) => void;
  flushRef?: React.MutableRefObject<(() => void) | null>;
  documentId?: string;
  documentTitle?: string;
  workspaceId?: string;
}

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
        Image.configure({
          HTMLAttributes: { class: "tiptap-image" },
          inline: false,
        }),
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
          if (slashMenu.isOpen || agentSelector.isOpen) {
            if (
              ["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(event.key)
            ) {
              return true;
            }
          }
          return false;
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

  if (!editor) return null;

  return (
    <div ref={editorRef} className="relative flex-1">
      <TableBlock editor={editor} />
      <TaskListBlock editor={editor} />
      <EditorContent editor={editor} className="tiptap-wrapper" />
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
        onClose={closeAgentSelector}
      />
    </div>
  );
}
