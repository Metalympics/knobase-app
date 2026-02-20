"use client";

import { Editor } from "@tiptap/react";
import { Minus, MoreHorizontal, Sparkles } from "lucide-react";
import { useState } from "react";

interface DividerBlockProps {
  editor: Editor;
  onClose: () => void;
}

const DIVIDER_STYLES = [
  { label: "Simple", icon: Minus, className: "border-neutral-200" },
  { label: "Dotted", icon: MoreHorizontal, className: "border-dotted border-neutral-300" },
  { label: "Fancy", icon: Sparkles, className: "border-neutral-300" },
] as const;

export function DividerBlock({ editor, onClose }: DividerBlockProps) {
  const [selected, setSelected] = useState(0);

  const insertDivider = () => {
    editor.chain().focus().setHorizontalRule().run();
    onClose();
  };

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-neutral-900">Divider Style</div>
      <div className="mb-3 space-y-2">
        {DIVIDER_STYLES.map((style, i) => {
          const Icon = style.icon;
          return (
            <button
              key={style.label}
              onClick={() => setSelected(i)}
              className={`flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                selected === i
                  ? "border-neutral-900 bg-neutral-50"
                  : "border-[#e5e5e5] hover:bg-neutral-50"
              }`}
            >
              <Icon className="h-4 w-4 text-neutral-400" />
              {style.label}
            </button>
          );
        })}
      </div>
      <button
        onClick={insertDivider}
        className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
      >
        Insert
      </button>
    </div>
  );
}
