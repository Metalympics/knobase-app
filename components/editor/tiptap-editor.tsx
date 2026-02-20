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
import type { Awareness } from "y-protocols/awareness";
import { SlashCommandMenu } from "./slash-command";
import { TableBlock } from "./blocks/TableBlock";
import { TaskListBlock } from "./blocks/TaskListBlock";

interface TiptapEditorProps {
  onEditorReady?: (editor: Editor) => void;
  ydoc?: Y.Doc;
  awareness?: Awareness;
  user?: { id: string; name: string; color: string };
  initialContent?: string;
  onContentChange?: (markdown: string) => void;
}

export function TiptapEditor({
  onEditorReady,
  ydoc,
  awareness,
  user,
  initialContent,
  onContentChange,
}: TiptapEditorProps) {
  const [slashMenu, setSlashMenu] = useState({
    isOpen: false,
    position: { top: 0, left: 0 },
    query: "",
  });
  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        codeBlock: { HTMLAttributes: { class: "tiptap-code-block" } },
        ...(ydoc ? { undoRedo: false } : {}),
      }),
      Placeholder.configure({
        placeholder: ({ node }) => {
          if (node.type.name === "heading") return "Heading";
          return 'Type "/" for commands...';
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
      ...(ydoc
        ? [
            Collaboration.configure({ document: ydoc }),
            ...(awareness
              ? [
                  CollaborationCursor.configure({
                    provider: { awareness } as unknown as { awareness: Awareness },
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
    },
    onUpdate: ({ editor: ed }) => {
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(
        Math.max(0, from - 20),
        from,
        "\n"
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
          prev.isOpen ? { ...prev, isOpen: false } : prev
        );
      }

      if (onContentChange) {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
          const storage = ed.storage as unknown as Record<
            string,
            Record<string, () => string>
          >;
          const md = storage.markdown?.getMarkdown?.() ?? "";
          onContentChange(md);
        }, 500);
      }
    },
  }, [ydoc, awareness]);

  useEffect(() => {
    if (editor && onEditorReady) {
      onEditorReady(editor);
    }
  }, [editor, onEditorReady]);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  const closeSlashMenu = useCallback(() => {
    setSlashMenu((prev) => ({ ...prev, isOpen: false }));
  }, []);

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
    </div>
  );
}
