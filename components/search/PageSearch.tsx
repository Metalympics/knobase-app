"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, X, ChevronUp, ChevronDown } from "lucide-react";
import type { Editor } from "@tiptap/react";

interface PageSearchProps {
  editor: Editor;
  onClose: () => void;
}

export function PageSearch({ editor, onClose }: PageSearchProps) {
  const [query, setQuery] = useState("");
  const [matchInfo, setMatchInfo] = useState({ current: 0, total: 0 });
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const syncMatchInfo = useCallback(() => {
    const storage = (editor.storage as unknown as Record<string, unknown>).search as {
      results: { from: number; to: number }[];
      currentIndex: number;
    };
    setMatchInfo({
      current: storage.results.length > 0 ? storage.currentIndex + 1 : 0,
      total: storage.results.length,
    });
  }, [editor]);

  const scrollToMatch = useCallback(() => {
    const storage = (editor.storage as unknown as Record<string, unknown>).search as {
      results: { from: number; to: number }[];
      currentIndex: number;
    };
    if (storage.results.length > 0 && storage.currentIndex >= 0) {
      const match = storage.results[storage.currentIndex];
      editor.commands.setTextSelection(match.from);
      editor.commands.scrollIntoView();
    }
  }, [editor]);

  useEffect(() => {
    editor.commands.setSearchTerm(query);
    syncMatchInfo();
    scrollToMatch();
  }, [query, editor, syncMatchInfo, scrollToMatch]);

  const navigateNext = useCallback(() => {
    editor.commands.nextSearchResult();
    syncMatchInfo();
    scrollToMatch();
  }, [editor, syncMatchInfo, scrollToMatch]);

  const navigatePrev = useCallback(() => {
    editor.commands.previousSearchResult();
    syncMatchInfo();
    scrollToMatch();
  }, [editor, syncMatchInfo, scrollToMatch]);

  const handleClose = useCallback(() => {
    editor.commands.clearSearch();
    onClose();
  }, [editor, onClose]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (e.shiftKey) navigatePrev();
        else navigateNext();
      } else if (e.key === "Escape") {
        handleClose();
      }
    },
    [navigateNext, navigatePrev, handleClose]
  );

  return (
    <div className="absolute right-4 top-2 z-30 flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-1.5 shadow-lg">
      <Search className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Find in document..."
        className="w-48 bg-transparent text-sm outline-none placeholder:text-neutral-400"
      />
      {query && (
        <span className="whitespace-nowrap text-xs tabular-nums text-neutral-400">
          {matchInfo.total > 0
            ? `${matchInfo.current} of ${matchInfo.total}`
            : "No results"}
        </span>
      )}
      <div className="flex items-center">
        <button
          onClick={navigatePrev}
          disabled={matchInfo.total === 0}
          className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30"
          title="Previous match (Shift+Enter)"
        >
          <ChevronUp className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={navigateNext}
          disabled={matchInfo.total === 0}
          className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600 disabled:opacity-30"
          title="Next match (Enter)"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>
      <button
        onClick={handleClose}
        className="rounded p-0.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-600"
        title="Close (Esc)"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
