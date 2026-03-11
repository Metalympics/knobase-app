"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Editor } from "@tiptap/react";
import {
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Code2,
  Type,
  Table,
  ImageIcon,
  Globe,
  CheckSquare,
  Minus,
  Quote,
  Highlighter,
  FileText,
} from "lucide-react";

interface SlashCommandContext {
  onCreateSubPage?: () => void;
}

interface SlashCommandItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  command: (editor: Editor, ctx: SlashCommandContext) => void;
  keywords?: string[];
}

const COMMANDS: SlashCommandItem[] = [
  {
    title: "Page",
    description: "Create a sub-page inside this document",
    icon: <FileText className="h-4 w-4" />,
    keywords: ["page", "subpage", "sub-page", "nested", "child"],
    command: (_editor, ctx) => {
      ctx.onCreateSubPage?.();
    },
  },
  {
    title: "Heading 1",
    description: "Large section heading",
    icon: <Heading1 className="h-4 w-4" />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Heading 2",
    description: "Medium section heading",
    icon: <Heading2 className="h-4 w-4" />,
    command: (editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Bullet List",
    description: "Unordered bullet list",
    icon: <List className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Numbered List",
    description: "Ordered numbered list",
    icon: <ListOrdered className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  {
    title: "Code Block",
    description: "Code snippet with syntax",
    icon: <Code2 className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  {
    title: "Paragraph",
    description: "Plain text block",
    icon: <Type className="h-4 w-4" />,
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: "Table",
    description: "Add a table with rows and columns",
    icon: <Table className="h-4 w-4" />,
    keywords: ["table", "grid", "spreadsheet"],
    command: (editor) =>
      editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Image",
    description: "Upload or embed an image",
    icon: <ImageIcon className="h-4 w-4" />,
    keywords: ["image", "picture", "photo", "img"],
    command: (editor) => {
      const url = window.prompt("Image URL:");
      if (url) editor.chain().focus().setImage({ src: url }).run();
    },
  },
  {
    title: "Embed",
    description: "YouTube, Figma, or Loom embed",
    icon: <Globe className="h-4 w-4" />,
    keywords: ["embed", "youtube", "video", "figma", "loom"],
    command: (editor) => {
      const url = window.prompt("Paste a YouTube, Figma, or Loom URL:");
      if (!url) return;
      const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
      );
      if (ytMatch) {
        editor
          .chain()
          .focus()
          .insertContent(
            `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:8px;"></iframe>`
          )
          .run();
        return;
      }
      editor
        .chain()
        .focus()
        .insertContent({
          type: "paragraph",
          content: [{ type: "text", text: `[embed: ${url}]` }],
        })
        .run();
    },
  },
  {
    title: "To-do List",
    description: "Task list with checkboxes",
    icon: <CheckSquare className="h-4 w-4" />,
    keywords: ["todo", "task", "checkbox", "checklist"],
    command: (editor) => editor.chain().focus().toggleTaskList().run(),
  },
  {
    title: "Math",
    description: "LaTeX math expression",
    icon: <span className="flex h-4 w-4 items-center justify-center text-xs font-bold">∑</span>,
    keywords: ["math", "latex", "equation", "formula"],
    command: (editor) => {
      const latex = window.prompt("LaTeX expression (e.g. E = mc^2):");
      if (latex) {
        editor
          .chain()
          .focus()
          .insertContent({
            type: "paragraph",
            content: [{ type: "text", text: `$$${latex}$$` }],
          })
          .run();
      }
    },
  },
  {
    title: "Divider",
    description: "Horizontal separator line",
    icon: <Minus className="h-4 w-4" />,
    keywords: ["divider", "hr", "separator", "line"],
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Quote",
    description: "Blockquote with attribution",
    icon: <Quote className="h-4 w-4" />,
    keywords: ["quote", "blockquote", "citation"],
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Highlight",
    description: "Highlight selected text",
    icon: <Highlighter className="h-4 w-4" />,
    keywords: ["highlight", "mark", "color"],
    command: (editor) => editor.chain().focus().toggleHighlight().run(),
  },
];

interface SlashCommandMenuProps {
  editor: Editor;
  isOpen: boolean;
  position: { top: number; left: number };
  onClose: () => void;
  query: string;
  onCreateSubPage?: () => void;
}

export function SlashCommandMenu({
  editor,
  isOpen,
  position,
  onClose,
  query,
  onCreateSubPage,
}: SlashCommandMenuProps) {
  const [selection, setSelection] = useState({ index: 0, query });
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = COMMANDS.filter((cmd) => {
    const q = query.toLowerCase();
    return (
      cmd.title.toLowerCase().includes(q) ||
      cmd.keywords?.some((kw) => kw.includes(q))
    );
  });

  const selectedIndex = selection.query === query ? selection.index : 0;
  const setSelectedIndex = useCallback(
    (index: number | ((prev: number) => number)) => {
      setSelection((prev) => ({
        query,
        index:
          typeof index === "function"
            ? index(prev.query === query ? prev.index : 0)
            : index,
      }));
    },
    [query]
  );

  const executeCommand = useCallback(
    (index: number) => {
      const cmd = filtered[index];
      if (!cmd) return;

      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(
        Math.max(0, from - query.length - 1),
        from,
        ""
      );
      const slashPos =
        from - textBefore.length + textBefore.lastIndexOf("/");

      editor.chain().focus().deleteRange({ from: slashPos, to: from }).run();

      cmd.command(editor, { onCreateSubPage });
      onClose();
    },
    [editor, filtered, query, onClose, onCreateSubPage]
  );

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + filtered.length) % filtered.length
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        executeCommand(selectedIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [
    isOpen,
    selectedIndex,
    filtered.length,
    executeCommand,
    onClose,
    setSelectedIndex,
  ]);

  useEffect(() => {
    if (menuRef.current) {
      const active = menuRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  if (!isOpen || filtered.length === 0) return null;

  return (
    <div
      ref={menuRef}
      className="fixed z-50 max-h-80 w-64 overflow-y-auto rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-lg"
      style={{ top: position.top + 24, left: position.left }}
    >
      <div className="px-3 py-1.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
        Blocks
      </div>
      {filtered.map((cmd, index) => (
        <button
          key={cmd.title}
          data-active={index === selectedIndex}
          className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm transition-colors ${
            index === selectedIndex
              ? "bg-neutral-100 text-neutral-900"
              : "text-neutral-600 hover:bg-neutral-50"
          }`}
          onClick={() => executeCommand(index)}
          onMouseEnter={() => setSelectedIndex(index)}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-[#e5e5e5] bg-white">
            {cmd.icon}
          </div>
          <div>
            <div className="font-medium text-neutral-900">{cmd.title}</div>
            <div className="text-xs text-neutral-400">{cmd.description}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
