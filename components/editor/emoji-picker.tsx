"use client";

import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES: Record<string, string[]> = {
  "Documents": ["📄", "📝", "📋", "📑", "📜", "📃", "📓", "📔", "📒", "📕", "📗", "📘", "📙", "📚"],
  "Objects": ["💡", "🔑", "🔧", "⚙️", "🎯", "📌", "📎", "🔗", "🔒", "🔓", "🏷️", "💎", "🧩", "🎨"],
  "Nature": ["🌱", "🌿", "🍃", "🌸", "🌻", "🌍", "⭐", "🌙", "☀️", "🔥", "💧", "❄️", "🌈", "⚡"],
  "Symbols": ["✅", "❌", "⚠️", "💬", "💭", "❤️", "🧠", "👁️", "🎉", "🚀", "🏠", "🎵", "🔔", "✨"],
  "Faces": ["😊", "🤔", "😎", "🙂", "😄", "🤖", "👻", "💀", "🐾", "🦊", "🐱", "🐶", "🦉", "🐝"],
};

interface EmojiPickerProps {
  value: string | null | undefined;
  onChange: (emoji: string | null) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  return (
    <div className="relative inline-flex" ref={ref}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex h-10 w-10 items-center justify-center rounded-lg text-2xl transition-colors hover:bg-neutral-100"
        title={value ? "Change icon" : "Add icon"}
      >
        {value || <span className="text-lg text-neutral-300">+</span>}
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-xl border border-[#e5e5e5] bg-white shadow-xl">
          <div className="p-2">
            {value && (
              <button
                onClick={() => { onChange(null); setIsOpen(false); }}
                className="mb-2 w-full rounded-md px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-50 text-left"
              >
                Remove icon
              </button>
            )}
            {Object.entries(EMOJI_CATEGORIES).map(([category, emojis]) => (
              <div key={category} className="mb-2">
                <div className="px-1 py-1 text-[10px] font-medium uppercase tracking-wider text-neutral-400">
                  {category}
                </div>
                <div className="grid grid-cols-7 gap-0.5">
                  {emojis.map((emoji) => (
                    <button
                      key={emoji}
                      onClick={() => { onChange(emoji); setIsOpen(false); }}
                      className={`flex h-8 w-8 items-center justify-center rounded-md text-lg transition-colors hover:bg-neutral-100 ${
                        emoji === value ? "bg-neutral-100 ring-1 ring-neutral-300" : ""
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
