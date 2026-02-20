"use client";

import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { ImageIcon, Link, X } from "lucide-react";

interface ImageBlockProps {
  editor: Editor;
  onClose: () => void;
}

export function ImageBlock({ editor, onClose }: ImageBlockProps) {
  const [url, setUrl] = useState("");
  const [alt, setAlt] = useState("");

  const insertImage = useCallback(() => {
    if (!url.trim()) return;
    editor.chain().focus().setImage({ src: url, alt: alt || "Image" }).run();
    onClose();
  }, [editor, url, alt, onClose]);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file?.type.startsWith("image/")) return;

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
        onClose();
      };
      reader.readAsDataURL(file);
    },
    [editor, onClose]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const file = Array.from(e.clipboardData.files).find((f) =>
        f.type.startsWith("image/")
      );
      if (!file) return;
      e.preventDefault();

      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        editor.chain().focus().setImage({ src: dataUrl, alt: file.name }).run();
        onClose();
      };
      reader.readAsDataURL(file);
    },
    [editor, onClose]
  );

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <ImageIcon className="h-4 w-4" />
          Insert Image
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onPaste={handlePaste}
        className="mb-3 flex h-24 items-center justify-center rounded-md border-2 border-dashed border-neutral-200 text-sm text-neutral-400 transition-colors hover:border-neutral-300"
      >
        Drop an image or paste from clipboard
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Link className="h-3.5 w-3.5 shrink-0 text-neutral-400" />
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Paste image URL..."
            className="flex-1 rounded-md border border-[#e5e5e5] px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
            onKeyDown={(e) => e.key === "Enter" && insertImage()}
          />
        </div>
        <input
          type="text"
          value={alt}
          onChange={(e) => setAlt(e.target.value)}
          placeholder="Alt text (optional)"
          className="w-full rounded-md border border-[#e5e5e5] px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
        />
        <button
          onClick={insertImage}
          disabled={!url.trim()}
          className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
        >
          Insert
        </button>
      </div>
    </div>
  );
}
