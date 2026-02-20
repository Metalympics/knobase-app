"use client";

import { useState, useMemo } from "react";
import { X, Search, FileText, Trash2 } from "lucide-react";
import { getAllTemplates, deleteCustomTemplate } from "@/lib/templates/store";
import type { Template } from "@/lib/templates/defaults";

interface TemplatePickerProps {
  onSelect: (template: Template) => void;
  onBlank: () => void;
  onClose: () => void;
}

export function TemplatePicker({ onSelect, onBlank, onClose }: TemplatePickerProps) {
  const [search, setSearch] = useState("");
  const templates = useMemo(() => getAllTemplates(), []);

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-xl rounded-xl border border-[#e5e5e5] bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#e5e5e5] px-5 py-4">
          <h2 className="text-base font-semibold text-neutral-900">
            New Document
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 transition-colors hover:bg-neutral-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-[#e5e5e5] px-5 py-3">
          <div className="flex items-center gap-2 rounded-md border border-[#e5e5e5] px-3 py-2">
            <Search className="h-4 w-4 text-neutral-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="flex-1 text-sm outline-none"
              autoFocus
            />
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto p-3">
          <button
            onClick={onBlank}
            className="mb-2 flex w-full items-center gap-3 rounded-lg border border-dashed border-neutral-300 p-3 text-left transition-colors hover:border-neutral-400 hover:bg-neutral-50"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-100 text-lg">
              <FileText className="h-5 w-5 text-neutral-400" />
            </div>
            <div>
              <div className="text-sm font-medium text-neutral-900">
                Blank Document
              </div>
              <div className="text-xs text-neutral-400">
                Start from scratch
              </div>
            </div>
          </button>

          <div className="grid grid-cols-2 gap-2">
            {filtered.map((template) => (
              <button
                key={template.id}
                onClick={() => onSelect(template)}
                className="group relative flex flex-col rounded-lg border border-[#e5e5e5] p-3 text-left transition-all hover:border-neutral-300 hover:shadow-sm"
              >
                <div className="mb-2 text-2xl">{template.icon}</div>
                <div className="text-sm font-medium text-neutral-900">
                  {template.name}
                </div>
                <div className="mt-0.5 text-xs text-neutral-400 line-clamp-2">
                  {template.description}
                </div>
                {template.isCustom && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCustomTemplate(template.id);
                    }}
                    className="absolute right-2 top-2 rounded p-0.5 text-neutral-300 opacity-0 transition-opacity hover:bg-red-50 hover:text-red-400 group-hover:opacity-100"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
