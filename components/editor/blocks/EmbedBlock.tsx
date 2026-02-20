"use client";

import { useState, useCallback } from "react";
import { Editor } from "@tiptap/react";
import { Globe, X } from "lucide-react";

interface EmbedBlockProps {
  editor: Editor;
  onClose: () => void;
}

function parseEmbedUrl(url: string): { type: string; embedUrl: string } | null {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return { type: "youtube", embedUrl: `https://www.youtube.com/embed/${ytMatch[1]}` };
  }

  const figmaMatch = url.match(/figma\.com\/(file|proto|design)\/([^/?]+)/);
  if (figmaMatch) {
    return {
      type: "figma",
      embedUrl: `https://www.figma.com/embed?embed_host=knobase&url=${encodeURIComponent(url)}`,
    };
  }

  const loomMatch = url.match(/loom\.com\/share\/([a-zA-Z0-9]+)/);
  if (loomMatch) {
    return { type: "loom", embedUrl: `https://www.loom.com/embed/${loomMatch[1]}` };
  }

  return null;
}

export function EmbedBlock({ editor, onClose }: EmbedBlockProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const insertEmbed = useCallback(() => {
    const parsed = parseEmbedUrl(url.trim());
    if (!parsed) {
      setError("Unsupported URL. Try YouTube, Figma, or Loom links.");
      return;
    }

    const iframeHtml = `<div data-embed="${parsed.type}" class="embed-wrapper"><iframe src="${parsed.embedUrl}" frameborder="0" allowfullscreen style="width:100%;aspect-ratio:16/9;border-radius:8px;"></iframe></div>`;

    editor
      .chain()
      .focus()
      .insertContent({
        type: "paragraph",
        content: [{ type: "text", text: `[${parsed.type} embed: ${url.trim()}]` }],
      })
      .run();

    onClose();
  }, [editor, url, onClose]);

  return (
    <div className="rounded-lg border border-[#e5e5e5] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-neutral-900">
          <Globe className="h-4 w-4" />
          Embed
        </div>
        <button onClick={onClose} className="text-neutral-400 hover:text-neutral-600">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <input
          type="url"
          value={url}
          onChange={(e) => { setUrl(e.target.value); setError(""); }}
          placeholder="Paste YouTube, Figma, or Loom URL..."
          className="w-full rounded-md border border-[#e5e5e5] px-2.5 py-1.5 text-sm outline-none focus:border-neutral-400"
          onKeyDown={(e) => e.key === "Enter" && insertEmbed()}
          autoFocus
        />
        {error && <p className="text-xs text-red-400">{error}</p>}
        <div className="flex gap-2 text-[10px] text-neutral-400">
          <span>YouTube</span>
          <span>Figma</span>
          <span>Loom</span>
        </div>
        <button
          onClick={insertEmbed}
          disabled={!url.trim()}
          className="w-full rounded-md bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-neutral-800 disabled:opacity-40"
        >
          Embed
        </button>
      </div>
    </div>
  );
}
