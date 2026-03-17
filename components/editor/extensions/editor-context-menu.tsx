"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  MessageSquareText,
  Copy,
  Scissors,
  ClipboardPaste,
} from "lucide-react";

export interface EditorContextMenuProps {
  isOpen: boolean;
  position: { top: number; left: number };
  hasSelection: boolean;
  onClose: () => void;
  onAskAgent: () => void;
  onAddComment: () => void;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
}

interface MenuItem {
  label: string;
  icon: React.ReactNode;
  shortcut?: string;
  onClick: () => void;
  show?: boolean;
  separator?: boolean;
}

export function EditorContextMenu({
  isOpen,
  position,
  hasSelection,
  onClose,
  onAskAgent,
  onAddComment,
  onCopy,
  onCut,
  onPaste,
}: EditorContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMac =
    typeof navigator !== "undefined" && /Mac/.test(navigator.platform);
  const mod = isMac ? "⌘" : "Ctrl+";

  const items: MenuItem[] = [
    {
      label: "Ask Agent",
      icon: <Sparkles className="h-3.5 w-3.5" />,
      shortcut: `${mod}⇧K`,
      onClick: onAskAgent,
      show: hasSelection,
    },
    {
      label: "Add Comment",
      icon: <MessageSquareText className="h-3.5 w-3.5" />,
      shortcut: `${mod}⇧M`,
      onClick: onAddComment,
      show: hasSelection,
    },
    {
      label: "",
      icon: null,
      onClick: () => {},
      show: hasSelection,
      separator: true,
    },
    {
      label: "Cut",
      icon: <Scissors className="h-3.5 w-3.5" />,
      shortcut: `${mod}X`,
      onClick: onCut,
      show: hasSelection,
    },
    {
      label: "Copy",
      icon: <Copy className="h-3.5 w-3.5" />,
      shortcut: `${mod}C`,
      onClick: onCopy,
      show: hasSelection,
    },
    {
      label: "Paste",
      icon: <ClipboardPaste className="h-3.5 w-3.5" />,
      shortcut: `${mod}V`,
      onClick: onPaste,
    },
  ];

  const visibleItems = items.filter((i) => i.show !== false);

  const safeTop = Math.min(position.top, window.innerHeight - 280);
  const safeLeft = Math.min(position.left, window.innerWidth - 220);

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95, y: -4 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: -4 }}
        transition={{ duration: 0.1 }}
        className="fixed z-[60] min-w-[200px] overflow-hidden rounded-lg border border-neutral-200 bg-white py-1 shadow-xl shadow-black/10"
        style={{ top: safeTop, left: safeLeft }}
      >
        {visibleItems.map((item, idx) => {
          if (item.separator) {
            return (
              <div
                key={`sep-${idx}`}
                className="my-1 border-t border-neutral-100"
              />
            );
          }
          const isAgent = item.label === "Ask Agent";
          const isComment = item.label === "Add Comment";
          return (
            <button
              key={item.label}
              onClick={() => {
                item.onClick();
                onClose();
              }}
              className={`flex w-full items-center gap-2.5 px-3 py-1.5 text-left text-[13px] transition-colors ${
                isAgent
                  ? "text-purple-700 hover:bg-purple-50"
                  : isComment
                    ? "text-blue-700 hover:bg-blue-50"
                    : "text-neutral-700 hover:bg-neutral-50"
              }`}
            >
              <span
                className={
                  isAgent
                    ? "text-purple-500"
                    : isComment
                      ? "text-blue-500"
                      : "text-neutral-400"
                }
              >
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.shortcut && (
                <span className="ml-4 text-[11px] text-neutral-400">
                  {item.shortcut}
                </span>
              )}
            </button>
          );
        })}
      </motion.div>
    </AnimatePresence>
  );
}
