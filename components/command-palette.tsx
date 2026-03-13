"use client";

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  FilePlus,
  FileText,
  Bot,
  Download,
  Clock,
  CornerDownLeft,
  ArrowRight,
  Hash,
} from "lucide-react";

interface CommandItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  keywords?: string[];
  onSelect: () => void;
}

interface CommandGroup {
  heading: string;
  items: CommandItem[];
}

interface RecentDocument {
  id: string;
  title: string;
  icon?: string;
}

interface CommandPaletteProps {
  onNewDocument?: () => void;
  onSearch?: () => void;
  onInviteAgent?: () => void;
  onExport?: () => void;
  onSelectDocument?: (id: string) => void;
  recentDocuments?: RecentDocument[];
}

export function CommandPalette({
  onNewDocument,
  onSearch,
  onInviteAgent,
  onExport,
  onSelectDocument,
  recentDocuments = [],
}: CommandPaletteProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setSelectedIndex(0);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  const groups = useMemo<CommandGroup[]>(() => {
    const navigation: CommandGroup = {
      heading: "Navigation",
      items: [
        ...(onNewDocument
          ? [{
              id: "new-doc",
              label: "New document",
              icon: <FilePlus className="h-4 w-4" />,
              keywords: ["create", "add", "page", "new"],
              onSelect: () => { onNewDocument(); close(); },
            }]
          : []),
        ...(onSearch
          ? [{
              id: "search-pages",
              label: "Search pages",
              icon: <Search className="h-4 w-4" />,
              keywords: ["find", "search", "lookup"],
              onSelect: () => { onSearch(); close(); },
            }]
          : []),
      ],
    };

    const actions: CommandGroup = {
      heading: "Actions",
      items: [
        ...(onInviteAgent
          ? [{
              id: "invite-agent",
              label: "Invite agent",
              icon: <Bot className="h-4 w-4" />,
              keywords: ["agent", "bot", "invite", "ai"],
              onSelect: () => { onInviteAgent(); close(); },
            }]
          : []),
        ...(onExport
          ? [{
              id: "export",
              label: "Export document",
              icon: <Download className="h-4 w-4" />,
              keywords: ["export", "download", "save"],
              onSelect: () => { onExport(); close(); },
            }]
          : []),
      ],
    };

    const recent: CommandGroup = {
      heading: "Recent documents",
      items: recentDocuments.map((doc) => ({
        id: `recent-${doc.id}`,
        label: doc.title || "Untitled",
        icon: doc.icon
          ? <span className="text-sm">{doc.icon}</span>
          : <FileText className="h-4 w-4" />,
        keywords: [doc.title.toLowerCase()],
        onSelect: () => { onSelectDocument?.(doc.id); close(); },
      })),
    };

    return [navigation, actions, recent].filter((g) => g.items.length > 0);
  }, [onNewDocument, onSearch, onInviteAgent, onExport, recentDocuments, onSelectDocument, close]);

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return groups;

    const q = query.toLowerCase();
    return groups
      .map((group) => ({
        ...group,
        items: group.items.filter(
          (item) =>
            item.label.toLowerCase().includes(q) ||
            item.keywords?.some((kw) => kw.includes(q)),
        ),
      }))
      .filter((group) => group.items.length > 0);
  }, [groups, query]);

  const flatItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups],
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % Math.max(flatItems.length, 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (i) => (i - 1 + Math.max(flatItems.length, 1)) % Math.max(flatItems.length, 1),
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        flatItems[selectedIndex]?.onSelect();
      } else if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
    },
    [flatItems, selectedIndex, close],
  );

  useEffect(() => {
    if (listRef.current) {
      const active = listRef.current.querySelector('[data-active="true"]');
      active?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  let runningIndex = 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-50 flex items-start justify-center pt-[18vh] bg-black/25 backdrop-blur-[2px]"
          onClick={close}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0, y: -8 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.96, opacity: 0, y: -8 }}
            transition={{ duration: 0.15, ease: [0.23, 1, 0.32, 1] }}
            className="w-full max-w-[520px] mx-4 overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 border-b border-neutral-100 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-neutral-400" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type a command or search..."
                className="flex-1 bg-transparent text-sm text-neutral-900 placeholder:text-neutral-400 outline-none"
              />
              <kbd className="hidden rounded border border-neutral-200 bg-neutral-50 px-1.5 py-0.5 text-[10px] font-medium text-neutral-400 sm:inline">
                ESC
              </kbd>
            </div>

            {/* Command list */}
            <div ref={listRef} className="max-h-[340px] overflow-y-auto overscroll-contain py-1">
              {filteredGroups.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-neutral-400">
                  No results for &ldquo;{query}&rdquo;
                </div>
              )}

              {filteredGroups.map((group) => {
                const groupStartIndex = runningIndex;

                return (
                  <div key={group.heading} className="px-1.5">
                    <div className="px-2.5 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-neutral-400">
                      {group.heading}
                    </div>
                    {group.items.map((item) => {
                      const itemIndex = runningIndex++;
                      const isActive = itemIndex === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          data-active={isActive}
                          onClick={item.onSelect}
                          onMouseEnter={() => setSelectedIndex(itemIndex)}
                          className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors ${
                            isActive
                              ? "bg-neutral-100 text-neutral-900"
                              : "text-neutral-600 hover:bg-neutral-50"
                          }`}
                        >
                          <div
                            className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border ${
                              isActive
                                ? "border-neutral-300 bg-white text-neutral-700"
                                : "border-neutral-200 bg-neutral-50 text-neutral-400"
                            }`}
                          >
                            {item.icon}
                          </div>
                          <span className="flex-1 truncate font-medium">
                            {item.label}
                          </span>
                          {isActive && (
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-neutral-300" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            {/* Footer hints */}
            <div className="flex items-center gap-4 border-t border-neutral-100 px-4 py-2 text-[10px] text-neutral-400">
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5">
                  ↑↓
                </kbd>{" "}
                navigate
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5">
                  ↵
                </kbd>{" "}
                select
              </span>
              <span className="flex items-center gap-1">
                <kbd className="rounded border border-neutral-200 bg-neutral-50 px-1 py-0.5">
                  esc
                </kbd>{" "}
                close
              </span>
              <span className="ml-auto flex items-center gap-1 text-neutral-300">
                <Hash className="h-3 w-3" />
                ⌘K
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
