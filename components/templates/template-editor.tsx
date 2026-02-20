"use client";

import { useState, useCallback } from "react";
import { X, Save } from "lucide-react";
import { saveCustomTemplate } from "@/lib/templates/store";

interface TemplateEditorProps {
  initialContent?: string;
  onSave: () => void;
  onClose: () => void;
}

export function TemplateEditor({ initialContent, onSave, onClose }: TemplateEditorProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📄");
  const [content, setContent] = useState(initialContent ?? "");

  const ICON_OPTIONS = ["📄", "📋", "📝", "📖", "💡", "🎯", "📊", "🔬", "🗂️", "⚡"];

  const handleSave = useCallback(() => {
    if (!name.trim()) return;
    saveCustomTemplate({
      name: name.trim(),
      description: description.trim() || `Custom template: ${name.trim()}`,
      icon,
      defaultContent: content,
    });
    onSave();
  }, [name, description, icon, content, onSave]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-lg rounded-xl border border-[#e5e5e5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            Save as Template
          </h2>
          <button onClick={onClose} className="rounded p-1 text-neutral-400 hover:bg-neutral-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Icon
            </label>
            <div className="flex flex-wrap gap-1.5">
              {ICON_OPTIONS.map((ic) => (
                <button
                  key={ic}
                  onClick={() => setIcon(ic)}
                  className={`flex h-8 w-8 items-center justify-center rounded-md border text-lg transition-colors ${
                    icon === ic
                      ? "border-neutral-900 bg-neutral-50"
                      : "border-[#e5e5e5] hover:bg-neutral-50"
                  }`}
                >
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Template name..."
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description..."
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-neutral-500">
              Content Preview
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={8}
              className="w-full rounded-md border border-[#e5e5e5] px-3 py-2 font-mono text-xs outline-none focus:border-neutral-400"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#e5e5e5] px-5 py-4">
          <button
            onClick={onClose}
            className="rounded-md border border-[#e5e5e5] px-4 py-2 text-sm text-neutral-600 hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="flex items-center gap-1.5 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-800 disabled:opacity-40"
          >
            <Save className="h-3.5 w-3.5" />
            Save Template
          </button>
        </div>
      </div>
    </div>
  );
}
